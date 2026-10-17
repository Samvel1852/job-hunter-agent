# Job Hunter Agent

A [Cursor BDK](https://cursor.com/docs/bdk) agent that, every day at 23:00 Yerevan time (19:00 UTC), finds the
**15 best-fit Product Manager / Product Owner roles** for Samvel Demirtshyan, never repeating a job
delivered on an earlier day, and prepares a ready-to-send application pack for each:

- fit score with reasons and honest gaps
- tailored **headline** and **professional summary**
- full tailored CV (ATS-friendly, facts only from the master CV)
- tailored cover letter (at most two paragraphs, written in Samvel's voice)
- optional tailored copy of the Canva CV design

Results land on a review page with a CV preview, cover letter preview, **Download CV (PDF)** and a
one-click **Apply** button.

## Sources and markets

| Source                              | Markets                            |
| ----------------------------------- | ---------------------------------- |
| LinkedIn (public job search)        | Armenia, EU, US, UAE               |
| staff.am                            | Armenia                            |
| Google Careers                      | EU (DE, IE, NL, PL, CH), US, Dubai |
| Google Jobs (via SerpAPI, optional) | Armenia, EU, US, UAE               |
| Himalayas, RemoteOK, Remotive       | Remote                             |

Search keywords, LinkedIn geo IDs, Google Careers locations, the title filter and the daily limit
live in `bot/lib/config.ts`.

## How a daily run works

1. `get_base_cv` loads the master CV (from Canva on first run, then cached).
2. `search_jobs` queries every source, keeps only product titles, removes duplicates across
   boards and everything delivered before.
3. The agent shortlists ~30 jobs, reads each with `get_job_details` and scores fit.
4. For the top 15, the `human` skill and the `tailor` subagent write the headline, a human
   summary, the CV and a cover letter of at most two paragraphs; `save_application` stores
   each pack and enforces the 15-per-day and never-repeat rules.
5. If Canva is connected, the `canva-cv` skill creates a tailored copy of the CV design
   (headline and summary replaced; the master design is never edited).
6. `publish_digest` builds the review page.

## Setup

This directory is the whole agent. It is its own project, not part of another app. Requires Node 22.13+.

```bash
npm install
npx bdk login                # Cursor credential for model turns
```

1. **Connect Canva**: in the Cursor dashboard, add the Canva MCP connector
   (`https://mcp.canva.com/mcp`) and authorize your Canva account. The agent reads it through
   `bot/mcp-connections/account.ts`. Without Canva, paste the CV into `cv/base-cv.md` and delete
   the `TEMPLATE` line at its top.
2. **Optional Google Jobs**: put `SERPAPI_API_KEY=...` in `.env.local`
   ([serpapi.com](https://serpapi.com)).

## Run

```bash
npx bdk dev                                     # playground at http://127.0.0.1:3000/playground
curl -X POST http://127.0.0.1:3000/v1/dev/schedules/daily-job-hunt   # trigger today's run in dev
```

Or ask in the playground, e.g. "Run today's job hunt" or "Find 5 more Product Owner roles in Dubai".

The schedule fires automatically under `npx bdk serve` (production mode) and on Cursor hosting
(`npx bdk deploy`, see the `bdk-deploy` skill). Dev mode never auto-fires schedules.

### Review and apply

The final reply links the review page (`/v1/artifacts/<id>/content`); locally it is also written to
the project state directory under `files/deployment/digests/<date>.html`. Open it in a browser:

- **View posting** opens the job listing.
- **Apply by email** opens Gmail as sam.demirtshyan@gmail.com, addressed to the employer, with
  the cover letter and the Canva CV link already in the message. Press Send to deliver it.
- **Apply on company site** opens the employer's own form, opens the Canva CV, and copies the
  cover letter so it can be pasted in.
- **Apply on listing** is used when the posting has no employer email and no separate form
  (for example LinkedIn Easy Apply). It opens that listing and the Canva CV, and copies the
  cover letter. The final submit on that site stays with you.
- **Download CV (PDF)** opens the tailored CV and the print dialog (save as PDF).

## Develop

```bash
npm run check        # typecheck
npm test             # parser and review-page unit tests
npx bdk validate --dir .
npx bdk call search_jobs --dir . --input '{"regions":["armenia"]}'
npx bdk eval --dir .   # needs a Cursor credential
```

`bdk call` and `bdk serve` need `bdk login` because of the Canva account connection.

## Notes

- LinkedIn's public job search occasionally rate-limits (HTTP 429). Requests are spaced out and
  retried; any remaining failures are reported in the run summary.
- Remotive's free API currently returns a fixed sample, so it rarely contributes roles.
- Delivered-job history and packs are stored in the agent's key-value store (`seen:*`, `day:*`,
  `pack:*`), so they survive restarts and redeploys.
