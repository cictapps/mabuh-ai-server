# Mabuh AI Server

Express backend for the Mabuh AI app. It provides a small, guarded chat API
backed by Mistral.

## Requirements

- Node.js 20 or newer
- A Mistral API key

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Set `MISTRAL_API_KEY` in `.env` before using the chat endpoint.

For production, also set:

- `CHAT_API_KEYS` to one or more comma-separated, high-entropy bearer tokens.
- `CORS_ORIGIN` to the exact allowed web origin or comma-separated origins.
- `TRUST_PROXY` to the number of trusted proxy hops, or `false` when directly
  exposed. Do not use `true` in production.

Production startup fails when chat authentication is disabled or CORS allows
every origin. Each production chat API key must contain at least 32 characters.
For example, generate one with `openssl rand -hex 32`.

## API

### `GET /health`

Returns `{ "status": "ok" }`.

### `GET /ready`

Returns `200` when the Mistral API key is configured, otherwise `503`.

### `POST /chat`

When `CHAT_API_KEYS` is configured, send a key in the authorization header:

```http
Authorization: Bearer your-chat-api-key
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

`intent: "support"` skips the model and immediately returns the app's support
message. History accepts only `user` and `assistant` roles.

The AI is restricted to emotional support, discussion of feelings, coping with
personal difficulties, and general mental wellbeing. It refuses unrelated
requests such as factual questions, schoolwork, coding, and content generation.

## Abuse Controls

The server applies per-IP rate limiting, a global cap on simultaneous model
calls, request-body and aggregate prompt-size limits, no-store response headers,
restricted production CORS, API-key authentication, and conservative HTTP
timeouts. Tune these settings with the variables in `.env.example`.

The built-in rate limiter and concurrency counter are per process. A
multi-instance deployment should enforce shared limits and user identity at an
API gateway or use a shared rate-limit store. A bearer key embedded in a public
mobile or browser app can be extracted and is not a substitute for user
authentication.

## Commands

```bash
npm start
npm run dev
npm test
```
