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

async function run() {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 500,
    messages: [
      { role: 'user', content: `Analyze this bug and tell me its severity (Critical/High/Medium/Low) and the likely root cause:\n\n${bugReport}` }
    ],
  });

  console.log(response.content[0].text);
}

run();