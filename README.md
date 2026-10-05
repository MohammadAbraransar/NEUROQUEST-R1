# NEUROQUEST

**The Cognitive Challenge Arena** — a team-based gamification and cognitive assessment platform.

## What is included
- Team-name + password authentication; participant email login is not used.
- Infinite practice mode with dynamically generated challenge variations.
- Server-authoritative scoring.
- Unattempted and timed-out questions receive **0 marks** and advance automatically.
- Visual challenge surfaces for Grid, Motion, Inductive, Deductive, NumBubbles, Short Cuts, Resemble and Tally Up.
- Live admin dashboard using real database records only: teams, attempts, attempted questions, correct answers, scores and recent activity.
- Admin account configured through environment variables; no admin password is committed to source control.
- Express security middleware, compression, rate limiting and health endpoint.
- Vite production build served by the Node/Express server.

## Local development

```bash
npm install
npm test
npm run dev
```

Open `http://localhost:5173`.

## Local production check

Create `.env` from `.env.example` and set a strong `JWT_SECRET` and `ADMIN_PASSWORD`, then:

```bash
npm install
npm run build
npm start
```

Open `http://localhost:3000`.

## Production deployment

The included `render.yaml` is configured for a Render Node web service with a persistent disk for the SQLite database used by this version.

Set these environment variables in the deployment platform:

- `NODE_ENV=production`
- `JWT_SECRET` — long random secret, at least 32 characters
- `ADMIN_TEAM` — the admin team/username
- `ADMIN_PASSWORD` — the admin password
- `CORS_ORIGIN` — the deployed origin if you need a separate frontend origin

**Never commit `.env` or real secrets.**

### Important database note
This release uses SQLite with a persistent filesystem path. On Render, keep the persistent disk enabled; do not remove the disk or the live database can be lost when the service is replaced. For a larger multi-instance production deployment, migrate the database layer to PostgreSQL before scaling horizontally.

## Source of challenge design
The challenge set and terminology are based on the supplied assessment material, including Grid Challenge, Motion Challenge, NumBubbles, Short Cuts, Resemble and Tally Up. The platform's infinite mode generates new variations rather than being limited to the seeded round count.
