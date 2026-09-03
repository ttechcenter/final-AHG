# AHG Weekly Planning — Enhanced

This workspace is a Vite + React + TypeScript app for African Holding Groups weekly planning.

Enhancements added:
- In-app toast notifications (`src/components/ToastProvider.tsx`).
- AI chat modal (`src/components/AIChat.tsx`). Configure `VITE_AI_ENDPOINT` to point to your AI service.
- Web Push helpers and a minimal service worker (`public/sw.js`, `src/lib/push.ts`). Set `VITE_VAPID_PUBLIC` to subscribe.

Quick run:

```bash
npm install
npm run dev
```

Environment variables (create a `.env` file):

- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` — for Supabase.
- `VITE_AI_ENDPOINT` — (optional) POST JSON { message } → { reply } to enable AI assistant.
- `VITE_VAPID_PUBLIC` — (optional) base64 VAPID public key for push subscriptions.

Example AI server: see `tools/example-ai-server.js`.
