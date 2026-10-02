# Sgwd Social Coach

Static mobile app with a dedicated social-media chat powered by a Netlify Function and OpenAI Responses API.

## Enable live chat

In this app's Netlify project, open Project configuration → Environment variables. Add these variables for the Functions runtime and production context:

- `OPENAI_API_KEY`: an OpenAI project API key with API billing enabled. Never commit it or enter it in the app.
- `SGWD_CHAT_PASSPHRASE`: a strong, private team passphrase shared with Joe and Luke.
- Optional `OPENAI_MODEL`: defaults to `gpt-4o-mini`; use a Responses-compatible model enabled for the API project.

Redeploy after setting variables. Open Chat and enter the team passphrase under Team chat access. It is stored in sessionStorage only. API usage is separately billed; set a project budget/alerts in OpenAI.

`netlify.toml` publishes the root and bundles functions from `netlify/functions`. No frontend build command or npm dependencies are required. Chat will display setup status until both server variables are present. The passphrase is verified on the server before API calls. Netlify rate limiting restricts requests to 15 per IP per minute; rotate the passphrase if shared outside the team.

Chat uses the dated 1 October baseline, the last 20 planned posts on this device and up to 20 recent conversation messages. User messages, context and recent chat are sent to OpenAI only when Send is pressed. Responses use `store:false`; OpenAI's applicable API retention rules still apply. Chat history is kept in localStorage on each device and can be cleared. There is no cross-device chat sync, ChatGPT conversation memory, live Meta access or posting permission.

## Local checks

Run `node --test tests/social-chat.test.mjs`. Tests mock OpenAI; real AI replies require configured credentials and a live deployment.
