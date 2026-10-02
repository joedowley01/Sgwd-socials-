# Sgwd Social Coach

Mobile socials dashboard with Meta figures and OpenAI chat, deployed from this repository to Netlify.

## Production settings

Set these environment variables for the Functions scope, then redeploy:

- `OPENAI_API_KEY`: OpenAI API key, marked secret; API billing required.
- `META_PAGE_ACCESS_TOKEN`: Sgwd Facebook Page token, marked secret.
- `META_PAGE_ID`: Sgwd Facebook Page ID returned by Meta.
- `META_INSTAGRAM_ACCOUNT_ID`: linked Instagram professional account ID returned by Meta.
- Optional `OPENAI_MODEL`: Responses-compatible model; defaults to gpt-4o-mini.

Team password access was removed at the owner's request. Anyone with the public app URL can read fetched figures and send paid AI requests. Existing SGWD_CHAT_PASSPHRASE settings are unused and can be deleted. API keys stay on the server; they are never sent to the browser or included in AI context. Same-origin browser checks and per-IP request limits remain; these do not authenticate visitors. Meta results are cached per function instance for five minutes.

## App behaviour

Meta figures load automatically and can be refreshed on Dashboard. Reports use 28 complete UTC days; recent Meta figures can lag behind Business Suite. Instagram requests views, total_interactions and profile_links_taps as total_value. Facebook requests daily page_media_view and page_post_engagements, requiring 28 returned daily values before showing a total. Missing or failed metrics stay unavailable. Current follower totals are not new follows. New follows and Facebook link clicks are unavailable in this version. No unsupported growth percentages or cross-platform aggregates are calculated.

The dated 1 October baseline is separate from current figures. Content shows the latest six Instagram posts with lifetime likes/comments, not a performance ranking. Plans and chats are saved on each device; there is no cross-device sync or posting permission.

Chat sends recent messages, the baseline, available fetched Meta figures and the local plan to OpenAI only when Send is pressed. Responses use store:false; applicable API retention rules still apply. Set API budgets in the OpenAI project.

Check Meta token expiry in Access Token Debugger. This app does not extend tokens; replace an expired or revoked Page token in Netlify and redeploy.

## Checks

Run `node --test tests/*.test.mjs`. Tests mock Meta/OpenAI and verify response handling, input validation, origin checks, missing metrics, identity checks and token-safe output. Actual Meta results and OpenAI replies need production verification.

`netlify.toml` publishes the root and bundles netlify/functions using esbuild; no frontend build command or npm dependencies are required.
