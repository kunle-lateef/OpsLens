# OpsLens

AI-powered operational intelligence for e-commerce and logistics businesses. See [AGENTS.md](./AGENTS.md) before making any change — it routes to the governing rules, skills, and workflows for this codebase.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in real values — see .agents/rules/security.md
npx prisma migrate dev
npm run dev
```

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm test` | Run the Vitest suite once |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | ESLint |
| `npm run format` | Prettier, writing changes |
| `npm run tokens:build` | Regenerate `tokens/tokens.css` from the token source files |

## Where things live

See `AGENTS.md`'s Project Structure section for the full layout and `.agents/rules/architecture.md`'s Directory Layout for what belongs in each folder.
