# Sgwd Social Coach

Static mobile app with a dedicated social-media chat powered by a Netlify Function and OpenAI Responses API.

## Enable live chat

In this app's Netlify project, open Project configuration → Environment variables. Add these variables for the Functions runtime and production context:

- `OPENAI_API_KEY`: an OpenAI project API key with API billing enabled. Never commit it or enter it in the app.
- `SGWD_CHAT_PASSPHRASE`: a strong, private team passphrase shared with Joe and Luke.
- Optional `OPENAI_MODEL`: defaults to `gpt-4o-mini`; use a Responses-compatible model enabled for the API project.

Redeploy after setting variables. Open Chat and enter the team passphrase under Team chat access. It is stored in sessionStorage only. API usage is separately billed; set a project budget/alerts in OpenAI.

`netlify.toml` publishes the root and bundles functions from `netlify/functions`. No frontend build command or npm dependencies are required. Chat will display setup status until both server variables are present. The passphrase is verified on the server before API calls. Netlify rate limiting restricts requests to 15 per IP per minute; rotate the passphrase if shared outside the team.

Chat uses the dated 1 October baseline, the last 20 planned posts on this device and up to 20 recent conversation messages. User messages, context and recent chat are sent to OpenAI only when Send is pressed. Responses use `store:false`; OpenAI's applicable API retention rules still apply. Chat history is kept in localStorage on each device and can be cleared. There is no cross-device chat sync, ChatGPT conversation memory or posting permission. When unlocked, fetched Meta figures are included in chat context.

## Local checks

Run `node --test tests/social-chat.test.mjs`. Tests mock OpenAI; real AI replies require configured credentials and a live deployment.


## Live Meta figures

Set Production variables with Functions scope, then redeploy:

- `META_PAGE_ACCESS_TOKEN`: Page access token for Sgwd, marked secret.
- `META_PAGE_ID`: the Facebook Page ID returned by Meta.
- `META_INSTAGRAM_ACCOUNT_ID`: the linked Instagram professional account ID returned by Meta.
- `SGWD_CHAT_PASSPHRASE`: private team passphrase, marked secret; also unlocks AI Chat.

Dashboard → Meta connection → enter the passphrase → Unlock / refresh. The token is never sent to the browser or OpenAI. Requests are authenticated, rate limited, tied to the configured Page and linked Instagram account, bounded by a 22-second timeout and cached in the function instance for five minutes. API v26.0 is pinned. Source timestamps and complete UTC-day reporting windows appear in the app. Meta may lag behind Business Suite.

Instagram requests views, total_interactions and profile_links_taps with total_value over 28 complete days. Facebook requests daily page_media_view and page_post_engagements; failed or missing metrics remain unavailable. Follower counts are current totals, never described as new follows. New follows and Facebook link clicks are unavailable in this release. Metrics differ between platforms; no cross-platform aggregate or unsupported percentage changes are calculated. The historical 1 October baseline remains available separately. Content shows six recent Instagram posts with lifetime likes/comments, not a ranked or complete 28-day content report. Planner remains local to each device.

Check token expiry in Meta's Access Token Debugger after setup. This code does not extend tokens automatically. If Meta revokes/expires access, replace the Page token and redeploy. Never paste tokens into chat, source code or frontend settings.

Run `node --test tests/*.test.mjs`. Tests mock Meta and OpenAI. Real results and deployment still require verification on the production site.

Primary API references: https://developers.facebook.com/docs/graph-api/reference/insights/ and https://developers.facebook.com/documentation/instagram-platform/api-reference/instagram-user/insights
