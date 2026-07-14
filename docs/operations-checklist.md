# SignalOS Operations Checklist

Use this checklist when preparing a local run, staging deploy, or production deploy of SignalOS.

## Local Setup

- Install dependencies with `npm install`.
- Copy `.env.example` to `.env`.
- Fill in Supabase, Telegram, X API, admin, and port settings.
- Run the Supabase schema from `src/db/schema.sql`.
- Insert a user row and set `DEFAULT_USER_ID`.
- Set the user's `telegram_chat_id` so approvals route to the right Telegram chat.

## Telegram Approval Flow

- Create a bot with BotFather.
- For production, set the webhook to `https://YOUR_DOMAIN/telegram/webhook`.
- For local development, use a public tunnel or run `npm run telegram:poll` in a second terminal.
- Confirm approval callbacks reach the app before enabling scheduled generation.

## Publishing Safety

- Keep `DAILY_GENERATOR_ENABLED=false` until credentials and approvals are verified.
- Confirm every generated post requires human approval before publishing.
- Check that high-risk posts are stored but not sent for approval when `risk_score > 0.7`.
- Confirm rejected posts do not enter the publishing queue.

## Deployment

- Build with the configured production command.
- Start with `npm start`.
- Set Railway or host environment variables from `.env.example`.
- Update the Telegram webhook after the production URL changes.
- Verify `/health` before using `/admin`.

## Post-Deploy Smoke Test

- Open `/admin` and confirm settings load.
- Generate a small batch of drafts.
- Approve one draft in Telegram.
- Reject one draft in Telegram.
- Confirm approved posts queue correctly and rejected posts stay unpublished.
