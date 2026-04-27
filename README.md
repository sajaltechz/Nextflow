# NextFlow

Krea-style workflow builder on **Next.js 15** (App Router), **TypeScript** (strict), **Tailwind**, **React Flow**, **Clerk**, **Prisma + Neon**, **Trigger.dev** (all node execution), **Transloadit** (uploads + post-FFmpeg files), and **Gemini** (inside Trigger tasks only).

## Environment variables

1. Copy `.env.example` to `.env.local` in this folder.
2. Fill every key (see comments in `.env.example` for where to sign up).
3. **Never commit** `.env.local` (it stays gitignored).

| Variable | Used by | Get it from |
|----------|---------|-------------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Next.js + middleware | [Clerk dashboard](https://dashboard.clerk.com) |
| `DATABASE_URL` | Next.js + Trigger orchestrator (Prisma) | [Neon console](https://console.neon.tech) |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Trigger `llm-node` task | [Google AI Studio](https://aistudio.google.com/apikey) |
| `TRIGGER_SECRET_KEY` | Next.js `tasks.trigger()` | [Trigger.dev](https://cloud.trigger.dev) → Project → API Keys |
| `TRIGGER_PROJECT_ID` | `trigger.config.ts` / CLI | Same project → Project ID |
| `TRANSLOADIT_AUTH_KEY`, `TRANSLOADIT_SECRET` | Next `/api/uploads` + Trigger crop/frame tasks | [Transloadit credentials](https://transloadit.com/credentials) |

**Vercel:** add the same variables under Project → Settings → Environment Variables.

**Trigger.dev workers:** mirror `DATABASE_URL`, `GOOGLE_GENERATIVE_AI_API_KEY`, `TRANSLOADIT_AUTH_KEY`, and `TRANSLOADIT_SECRET` into your Trigger project environment so FFmpeg and Gemini tasks can run in the cloud.

## Scripts

```bash
npm install
npm run dev              # Next.js
npm run trigger:dev      # Trigger.dev dev worker (separate terminal)
```

After changing `prisma/schema.prisma`:

```bash
npx prisma migrate dev   # or db push for prototyping
```

## Product notes

- **API keys** are yours to create; the repo only documents names and wiring.
- **Strict TypeScript** is enabled in `tsconfig.json`.
- **Export / import** JSON is available from the workflow toolbar; **Save** persists to Postgres via existing API routes.
