# Bug Triage Agent

> **Status: In Progress** — Active development. Demo planned for July 10, 2026.

An AI-powered Bug Triage Agent built with the Claude API. Accepts a bug report or error log and autonomously analyzes, categorizes, and recommends fixes — then logs the result directly to Jira and notifies the team on Slack.


## What It Will Do

- Accept a bug report, error log, or failure screenshot as input
- Analyze the issue and identify the probable root cause
- Categorize severity: `Critical` / `High` / `Medium` / `Low`
- Recommend specific fix steps for the development team
- Suggest which test type would have caught the bug
- Log a structured bug ticket directly to Jira automatically
- Notify the team on Slack with a summary


## Why This Is Fully Agentic

Unlike a standard AI chatbot, the Bug Triage Agent does not stop at generating a response. It takes autonomous action across multiple external tools:

```
Bug report submitted
        |
Agent analyzes severity and root cause
        |
Agent recommends fix steps
        |
Agent logs structured ticket to Jira
        |
Agent notifies team on Slack
        |
Zero manual steps after initial input
```

This is a multi-tool agentic pipeline — the agent reasons, acts, and communicates entirely on its own.


## Planned Tech Stack

| Layer | Technology |
|---|---|
| AI Model | Claude Sonnet 4.6 (Anthropic API) |
| Backend | Node.js + Express |
| Project Management | Jira API |
| Team Notifications | Slack API |
| Frontend | HTML, CSS, Vanilla JavaScript |


## Planned Input Formats

- Plain text bug report
- Error log paste
- Screenshot of error or failed test


## Relationship to QA Test Generator Agent

This agent is the second in a two-agent QA suite:

| Agent | Purpose |
|---|---|
| [QA Test Generator Agent](https://github.com/RachieJosh/qa-test-generator-agent) | Generates test cases from feature descriptions or UI screenshots |
| Bug Triage Agent *(this repo)* | Analyzes bug reports and autonomously triages across Jira and Slack |

Together they demonstrate a full agentic QA workflow — from test creation to bug resolution.


## Author

**Racheal Joshua**
QA Engineering Intern