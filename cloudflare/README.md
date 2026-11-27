# AI chat relay

`worker.mjs` relays validated text and inline JPEG/PNG/WebP images to the existing Render backend. `chat-contract.mjs` must match the copy in `smart-danang-ai-backend`.

- One image per user turn, at most two images in recent context; maximum 2 MiB per image and 6 MiB per JSON request.
- Existing D1 rate limits and Render readiness checks remain active. Images and conversation bodies are not written to D1 or logged by the relay.
- Run `node --test cloudflare/*.test.mjs` to verify the relay and deployment behavior.
- Set repository secret `CLOUDFLARE_API_TOKEN` with Account / Workers Scripts / Edit for the existing account. Run **Actions → Deploy AI chat relay → Run workflow** on the release branch.
- The deployment script checks required bindings and preserves existing D1, plaintext and secret bindings, compatibility settings and observability. It uploads both ES modules together.
