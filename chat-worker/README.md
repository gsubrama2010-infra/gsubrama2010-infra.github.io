# ganesh-chat: the AI behind "Ask about Ganesh"

A small Cloudflare Worker that lets visitors to `ai.html` type their own
questions. Claude answers from the public profile in `src/profile.js`.

```
browser (ai.html)  ──POST /chat──▶  Cloudflare Worker  ──▶  Claude API
                   ◀── streamed ───  (holds the API key,     (claude-opus-5-5)
                       answer        checks origin,
                                     rate-limits)
```

- The API key lives only in the Worker as a secret, never in the page.
- Only `https://gsubrama2010-infra.github.io` may call it (`ALLOWED_ORIGINS`).
- Each visitor gets 8 questions a minute, and the page allows 20 per visit.
- Questions are capped at 500 characters and answers at about 120 words.
- Nothing visitors type is stored or logged by the Worker. It's sent to Anthropic to generate the answer.
- `src/profile.js` is everything the AI knows. It is public in this repo, so keep it to facts that are already on the site.

The suggested-question buttons on the page keep working with no Worker at all.
While `data-api` in `ai.html` is empty, the page makes no AI calls.

## One-time setup (about 15 minutes)

1. **Anthropic API key.** At https://console.anthropic.com, create an API key.
   Then, under Settings > Limits, set a monthly spend limit (for example $10).
   Use the account you want billed. This is a personal site, so probably your
   personal account, not a work one.
2. **Cloudflare account.** Sign up for free at https://dash.cloudflare.com.
3. **Deploy** from this folder, in your own terminal:

   ```sh
   cd c:\dev\GaneshResume\chat-worker
   npm install
   npm test                                  # offline tests, nothing billed
   npx wrangler login                        # opens Cloudflare in the browser
   npx wrangler deploy                       # prints https://ganesh-chat.<you>.workers.dev
   npx wrangler secret put ANTHROPIC_API_KEY # paste the key when asked
   ```

4. **Connect the page.** Put the URL that `deploy` printed into
   `data-api="..."` on the `#agent` element in `ai.html`, then publish the site.

To check it is live: open `ai.html`. The box under the suggested questions
should say "Ask anything about Ganesh…".

## Cost

| Model (`MODEL` in `wrangler.toml`) | Rough cost per answer | 1,000 answers |
|---|---|---|
| `claude-opus-5-5` (default) | 1 to 2 cents | about $10 to $20 |
| `claude-haiku-5-5` | under 0.1 cent | under $1 |

The profile is prompt-cached, so follow-up questions in the same visit are
cheaper. Cloudflare's free plan covers 100,000 requests a day. The spend limit
in the Anthropic console is the hard backstop.

## Changing things

- **What the AI knows or how it talks:** edit `src/profile.js`, then `npx wrangler deploy`.
- **Model:** change `MODEL` in `wrangler.toml`, then deploy.
- **Rate limit:** edit `[[ratelimits]]` in `wrangler.toml`. If a deploy ever
  rejects that block, delete it; the Worker runs without it.
- **Turn the AI off:** clear `data-api` in `ai.html` (the page goes back to
  pre-written answers only), or run `npx wrangler delete`.

## Local testing

```sh
# chat-worker/.dev.vars (git-ignored)
ANTHROPIC_API_KEY=sk-ant-...
ALLOWED_ORIGINS=http://localhost:8000
```

Run `npx wrangler dev`, which serves on http://localhost:8787. In another
terminal, serve the site from the repo root with `python -m http.server 8000`.
Temporarily set `data-api="http://localhost:8787"` in `ai.html`, then open
http://localhost:8000/ai.html. Every local question is a real, billed API call.
