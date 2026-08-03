import 'dotenv/config';
import express from 'express';
import Anthropic from '@anthropic-ai/sdk';

const app = express();
app.use(express.json());
app.use(express.static('public'));

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const tools = [
  {
    name: 'create_jira_ticket',
    description: 'Create a bug ticket in Jira for the dev team to fix.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        severity: { type: 'string', enum: ['Critical', 'High', 'Medium', 'Low'] },
        description: { type: 'string' },
        priority: { type: 'string', enum: ['Highest', 'High', 'Medium', 'Low', 'Lowest'] },
        labels: {
          type: 'array',
          items: { type: 'string' },
          description: 'Short lowercase tags describing the bug area, e.g. payment, autoplay, android',
        },
      },
      required: ['title', 'severity', 'description', 'priority', 'labels'],
    },
  },
];

async function createJiraTicket(input, projectKey) {
  const url = `${process.env.JIRA_BASE_URL}/rest/api/3/issue`;

  const authString = Buffer.from(
    `${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`
  ).toString('base64');

  const body = {
    fields: {
      project: { key: projectKey || process.env.JIRA_PROJECT_KEY },
      summary: `[${input.severity}] ${input.title}`,
      description: {
        type: 'doc',
        version: 1,
        content: input.description
          .split('\n\n')
          .filter(p => p.trim().length > 0)
          .map(paragraph => ({
            type: 'paragraph',
            content: [{ type: 'text', text: paragraph.trim() }],
          })),
      },
      issuetype: { name: 'Bug' },
      priority: { name: input.priority },
      labels: input.labels,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${authString}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('\n❌ Jira error:', JSON.stringify(data, null, 2));
    return { success: false, error: data };
  }

  return {
    success: true,
    ticket_id: data.key,
    ticket_url: `${process.env.JIRA_BASE_URL}/browse/${data.key}`,
  };
}

app.post('/analyze', async (req, res) => {
  const { bugReport } = req.body;

  if (!bugReport || bugReport.trim().length === 0) {
    return res.status(400).json({ error: 'Bug report is required' });
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: `You are a senior QA engineer with 8 years of experience in software testing,
bug triage, and root cause analysis.

When given a bug report, respond briefly and in plain spoken English, like you're
explaining it to a teammate out loud, not writing a report. Do not use markdown
formatting like headers, asterisks, or bullet symbols. Do not repeat the severity
level more than once.

For the ticket description, write exactly 3 short paragraphs separated by a blank
line: first what's happening, second the likely root cause, third the recommended
fix. Each paragraph should be 2-3 sentences, easy to read at a glance.

Keep your spoken explanation (outside the ticket) to 3-4 short sentences, then propose
a ticket using the tools available to you. Do not create the ticket yourself, only
propose it for the user to review.`,
      tools,
      messages: [
        { role: 'user', content: `Analyze this bug and propose a ticket:\n\n${bugReport}` }
      ],
    });

    let explanation = '';
    let proposal = null;

    for (const block of response.content) {
      if (block.type === 'text') {
        explanation = block.text;
      }
      if (block.type === 'tool_use') {
        proposal = block.input;
      }
    }

    res.json({ explanation, proposal });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/create-ticket', async (req, res) => {
  const { proposal, projectKey } = req.body;

  if (!proposal || !proposal.title) {
    return res.status(400).json({ error: 'A ticket proposal is required' });
  }

  try {
    const ticketResult = await createJiraTicket(proposal, projectKey);
    if (!ticketResult.success) {
      return res.status(502).json({ error: ticketResult.error, ticket: ticketResult });
    }
    res.json({ ticket: ticketResult });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 Bug Triage Agent running at http://localhost:${PORT}\n`);
});