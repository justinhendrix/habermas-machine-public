# Habermas Machine — Classroom Deliberation Simulator

A lightweight web app for running AI-mediated group deliberation in a classroom setting. Students write opinions, rank AI-generated group statements, critique the winner, and compare initial vs. revised statements.

Inspired by the research protocol in ["Can AI Mediation Improve Democratic Deliberation?"]([https://www.science.org/doi/10.1126/science.adq2852](https://arxiv.org/abs/2601.05904)) (Tessler et al., arXiv 2026). This is a **pedagogical simulation**, not a validated civic decision system.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy environment variables
cp .env.example .env
# Edit .env: add your ANTHROPIC_API_KEY and set INSTRUCTOR_SECRET

# 3. Initialize the database
npx prisma db push

# 4. (Optional) Seed demo data
npm run db:seed

# 5. Start the dev server
npm run dev
# → Open http://localhost:3000
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes* | Anthropic API key for AI generation |
| `INSTRUCTOR_SECRET` | Yes | Password for instructor actions |
| `DATABASE_URL` | Auto | SQLite file path (default: `file:./habermas.db`) |
| `LLM_PROVIDER` | No | `anthropic` (default) or `openai` |
| `LLM_MODEL` | No | Model override (default: `claude-haiku-4-5-20251001`) |
| `OPENAI_API_KEY` | If OpenAI | OpenAI API key |

*Or `OPENAI_API_KEY` if using `LLM_PROVIDER=openai`

## How It Works

### The Protocol (7 phases)

1. **Join** — Students enter a name and session code
2. **Write** — Each student writes their opinion on the question (100–250 words recommended)
3. **Rank Initial** — AI generates 4 candidate group statements; students rank them 1–4
4. **Critique** — Students critique the winning statement (what's good, missing, unfair, should change)
5. **Rank Revised** — AI revises statements based on critiques; students rank again
6. **Compare** — Students choose: initial or revised winner? Plus optional reflection
7. **Complete** — Summary for class discussion

### Ranking Method: Borda Count

- Rank 1 = 4 points, Rank 2 = 3 points, Rank 3 = 2 points, Rank 4 = 1 point
- Highest total wins
- Ties broken by most first-place votes

### AI Generation

- Uses prompt-based synthesis (not the paper's trained reward model)
- One LLM call per group per round (cost-efficient)
- Generates 4 meaningfully distinct candidates with rationales
- Instructed to preserve disagreement, not force consensus
- Default model: Claude Haiku 4.5 (~$0.01–0.03 per generation)

## Instructor Guide

### Creating a Session

1. Go to `/instructor`
2. Enter your instructor secret
3. Choose or write a deliberation question
4. Set group size (default: 5)
5. Share the session code with students

### Running the Session

The instructor manually advances phases using the dashboard at `/instructor/[code]`:

1. **JOINING** → Wait for students, then click "Start Deliberation" (assigns groups)
2. **WRITING** → Monitor submissions, click "Generate Candidates" then "Advance"
3. **RANKING_INITIAL** → Wait for rankings, click "Tally Votes" then "Advance"
4. **CRITIQUE** → Monitor critiques, click "Generate Revised" then "Advance"
5. **RANKING_REVISED** → Tally, advance
6. **COMPARISON** → Wait for final preferences, then "Complete"
7. **COMPLETE** → Use "Generate Debrief" for discussion guide

### Tips

- Share the session code on screen or in Zoom chat
- Use the "Generate All" button to create candidates for all groups at once
- You can advance even if not all students have submitted (a few stragglers are OK)
- The dashboard auto-refreshes every 3 seconds

## Run of Show (90-minute Zoom class)

| Time | Duration | Activity |
|------|----------|----------|
| 0:00 | 10 min | **Intro**: Explain the Habermas Machine concept, the protocol, and what students will do |
| 0:10 | 5 min | **Setup**: Share session code, students join, verify all are in |
| 0:15 | 10 min | **Phase 1 — Write**: Students write opinions. Advance when most have submitted |
| 0:25 | 3 min | **Generate**: Instructor generates initial candidates for all groups |
| 0:28 | 10 min | **Phase 2 — Rank Initial**: Students read and rank 4 candidates |
| 0:38 | 2 min | **Tally**: Instructor tallies votes, advance to critique |
| 0:40 | 10 min | **Phase 3 — Critique**: Students critique the winning statement |
| 0:50 | 3 min | **Generate Revised**: Instructor generates revised candidates |
| 0:53 | 8 min | **Phase 4 — Rank Revised**: Students rank revised candidates |
| 1:01 | 2 min | **Tally + Advance**: Tally revised, advance to comparison |
| 1:03 | 5 min | **Phase 5 — Compare**: Initial vs. revised + reflection |
| 1:08 | 20 min | **Debrief**: Project group outputs. Discussion questions below |
| 1:28 | 2 min | **Wrap-up** |

### Debrief Discussion Questions

1. Did the AI accurately capture your group's views? What did it get right or wrong?
2. How did the critique-and-revision cycle change the statement? Was it an improvement?
3. Did the process surface genuine disagreements, or did it push toward false consensus?
4. Who benefits from AI-mediated deliberation? Who might be disadvantaged?
5. How does ranking 4 options differ from writing a statement yourself? What's gained or lost?
6. Would you trust a process like this for real civic decisions? What would need to change?

## Deployment

### Render (recommended for simplicity)

1. Create a Web Service, connect your repo
2. Build command: `npm run build`
3. Start command: `npx prisma db push && npm start`
4. Add environment variables in Render dashboard
5. SQLite persists on Render's disk (fine for demo use)

### Railway

1. Create project, connect repo
2. Same build/start commands
3. Add env vars

### Vercel

Note: Vercel's serverless functions don't persist SQLite between invocations. For Vercel, you'd need to swap SQLite for a hosted database (e.g., Turso, PlanetScale). For classroom demos, Render or Railway is simpler.

## Project Structure

```
habermas-machine/
├── app/
│   ├── layout.tsx            # Root layout with header/footer
│   ├── page.tsx              # Student join page
│   ├── globals.css           # Tailwind imports
│   ├── session/[code]/
│   │   └── page.tsx          # Student session view (all phases)
│   ├── instructor/
│   │   ├── page.tsx          # Create session
│   │   └── [code]/page.tsx   # Instructor dashboard
│   └── api/
│       ├── session/create/   # POST: create session
│       ├── session/join/     # POST: join session
│       ├── session/[code]/   # GET: session state
│       ├── session/[code]/advance/  # POST: advance phase
│       ├── opinion/          # GET/POST: opinions
│       ├── generate/         # POST: generate candidates
│       ├── ranking/          # GET/POST: submit rankings
│       ├── ranking/tally/    # POST: tally and set winner
│       ├── critique/         # GET/POST: critiques
│       ├── preference/       # POST: final preference
│       └── debrief/          # POST: generate debrief
├── components/phases/
│   ├── Joining.tsx
│   ├── Writing.tsx
│   ├── Ranking.tsx
│   ├── Critique.tsx
│   ├── Comparison.tsx
│   └── Complete.tsx
├── lib/
│   ├── db.ts                 # Prisma client singleton
│   ├── llm.ts                # LLM abstraction (Anthropic/OpenAI)
│   ├── prompts.ts            # Prompt templates
│   ├── prompts-parse.ts      # JSON response parser
│   ├── ranking.ts            # Borda count aggregation
│   ├── grouping.ts           # Random group assignment
│   ├── session-code.ts       # Session code generation
│   └── phase.ts              # Phase progression logic
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── seed.ts               # Demo data
├── .env.example
├── package.json
└── README.md
```

## Known Limitations

1. **Not research-grade**: Uses prompt-based synthesis, not the paper's trained reward model or personalized Bayesian aggregation
2. **SQLite**: Single-server only. Fine for 15–40 students; not for large-scale deployment
3. **Polling, not real-time**: 3-second refresh. Students may briefly see stale state
4. **No authentication**: Anyone with the session code can join. Instructor auth is a shared secret
5. **No moderation**: No content filtering on student submissions (trust the classroom context)
6. **AI limitations**: The LLM may misrepresent opinions, force false consensus, or miss nuance — this is partly the point of the exercise
7. **Single session**: Designed for one class at a time; no multi-tenancy

## Ethical Cautions

- **This is a simulation, not a decision system.** Do not present outcomes as democratically legitimate
- **AI-generated statements may be wrong.** The critique phase exists precisely to correct AI errors
- **Borda count is one of many aggregation methods.** Different methods can produce different winners — this is a teaching point, not a bug
- **Student opinions are stored in a local database.** For privacy, delete the database file after class (`rm prisma/habermas.db`)
- **The AI does not "understand" deliberation.** It generates plausible text based on patterns. Whether this constitutes genuine mediation is itself a question worth discussing
- **Minority views can be underrepresented** even with careful prompting. Pay attention to whether quieter perspectives survive the synthesis process

## Cost Estimate

With Claude Haiku 4.5:
- ~$0.01–0.03 per candidate generation (4 candidates per call)
- 2 generation calls per group (initial + revised)
- 1 debrief call per session
- **Total for a 30-student class (6 groups): ~$0.15–0.40**

## License

MIT. Built for educational use.
