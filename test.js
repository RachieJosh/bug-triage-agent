import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const bugReport = `Bug: Autoplay triggers automatic charge without user confirmation.
On the DramaTV microdrama streaming app, when a user finishes a free episode and
autoplay kicks in for the next episode, the app charges the user's wallet automatically
for premium content without showing a payment confirmation screen. Expected behavior is
that any paid episode should prompt a confirmation/payment screen before deducting funds.
Instead the charge happens silently in the background during the autoplay transition.
Users are losing money without consenting to the purchase. Reproduced on both Android
and web. No error is thrown, the deduction just happens and the episode plays.`;

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
      },
      required: ['title', 'severity', 'description'],
    },
  },
];

// Makes a REAL API call to Jira
async function createJiraTicket(input) {
  const url = `${process.env.JIRA_BASE_URL}/rest/api/3/issue`;

  const authString = Buffer.from(
    `${process.env.JIRA_EMAIL}:${process.env.JIRA_API_TOKEN}`
  ).toString('base64');

  const body = {
    fields: {
      project: { key: process.env.JIRA_PROJECT_KEY },
      summary: `[${input.severity}] ${input.title}`,
      description: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: input.description }],
          },
        ],
      },
      issuetype: { name: 'Bug' }, // change to 'Task' if your project has no 'Bug' type
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

  console.log(`\n✅ [JIRA] Ticket created: ${data.key}`);
  console.log(`   View it: ${process.env.JIRA_BASE_URL}/browse/${data.key}`);
  return { success: true, ticket_id: data.key };
}

async function executeTool(name, input) {
  if (name === 'create_jira_ticket') {
    return await createJiraTicket(input);
  }
}

async function run() {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    system: `You are a senior QA engineer with 8 years of experience in software testing,
bug triage, and root cause analysis. You have deep expertise in identifying severity levels,
tracing bugs back to likely technical causes, and recommending precise fix steps for
development teams. When a bug is reported, you take autonomous action using the tools
available to you rather than just describing what should happen.`,
    tools,
    messages: [
      { role: 'user', content: `Analyze this bug and take whatever action is appropriate:\n\n${bugReport}` }
    ],
  });

  console.log('\nStop reason:', response.stop_reason);

  if (response.stop_reason === 'tool_use') {
    for (const block of response.content) {
      if (block.type === 'tool_use') {
        console.log(`\n>> Claude decided to call: ${block.name}`);
        await executeTool(block.name, block.input);
      }
      if (block.type === 'text') {
        console.log('\nClaude said:', block.text);
      }
    }
  } else {
    console.log('\nClaude just replied with text:');
    console.log(response.content[0].text);
  }
}

run();