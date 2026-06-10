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

## API

### `GET /health`

Returns `{ "status": "ok" }`.

### `GET /ready`

Returns `200` when the Mistral API key is configured, otherwise `503`.

### `POST /chat`

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

## Commands

```bash
npm start
npm run dev
npm test
```
