# Mabuh AI Server

Express backend for the Mabuh AI app. It provides a small, guarded chat API
backed by Mistral.

## Requirements

- Node.js 20 or newer
- A Mistral API key
- A Supabase project using asymmetric JWT signing keys

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Set `MISTRAL_API_KEY` and your Supabase project URL in `.env`:

```env
MISTRAL_API_KEY=your-mistral-key
SUPABASE_URL=https://your-project-ref.supabase.co
```

For production, also set:

- `CORS_ORIGIN` to the exact allowed web origin or comma-separated origins.
- `TRUST_PROXY` to the number of trusted proxy hops, or `false` when directly
  exposed. Do not use `true` in production.

Production startup fails when the Supabase URL is missing, CORS allows every
origin, or proxy trust is unsafe.

## API

### `GET /health`

Returns `{ "status": "ok" }`.

### `GET /ready`

Returns `200` when the Mistral API key is configured, otherwise `503`.

### `POST /chat`

Send the logged-in user's Supabase access token:

```http
Authorization: Bearer your-supabase-access-token
```

```json
{
  "message": "I feel overwhelmed with school.",
  "intent": "general",
  "history": [
    { "role": "assistant", "content": "What has been difficult today?" }
  ]
}
```

`intent` selects how the model responds and must be one of:

- `general` (default) — open emotional support and wellbeing for students,
  written in a warm, comforting voice (a short paragraph).
- `support` — skips the model and immediately returns the app's support
  message.
- `vent` — pure listening: validate, name the feeling, sit with it, do not
  problem-solve.
- `affirmation` — a warm, present-tense daily affirmation written as a short
  paragraph that builds on itself.
- `self_care` — one small, concrete self-care action for the next ten
  minutes, framed gently and without pressure for a student afternoon.

Most users are students balancing classes, deadlines, family expectations, and
the rest of life. Every intent is written with that in mind — supportive, not
tutoring — and meets school-related feelings with the same warmth as any
other.

History accepts only `user` and `assistant` roles.

The AI is restricted to emotional support, discussion of feelings, coping with
personal difficulties, and general mental wellbeing. It refuses unrelated
requests such as factual questions, schoolwork, coding, and content generation.

## Abuse Controls

The server applies per-IP rate limiting, a global cap on simultaneous model
calls, request-body and aggregate prompt-size limits, no-store response headers,
restricted production CORS, Supabase JWT authentication, and conservative HTTP
timeouts. Tune these settings with the variables in `.env.example`.

The built-in rate limiter and concurrency counter are per process. A
multi-instance deployment should enforce shared limits and user identity at an
API gateway or use a shared rate-limit store. Requests are limited by both
client IP and the verified Supabase user ID.

The server verifies JWTs with the project's public JWKS and accepts only
asymmetric `ES256` or `RS256` signing keys. If the project still uses the legacy
shared JWT secret (`HS256`), migrate it under Supabase Auth signing-key settings
before deploying this server. Never place a Supabase secret or service-role key
in the client app.

## Commands

```bash
npm start
npm run dev
npm test
```
