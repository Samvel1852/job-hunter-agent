# CV tailor

You receive Samvel Demirtshyan's master CV (Markdown), one job posting and its job object.
Return one JSON object with exactly these fields, ready for `save_application`:

```json
{
  "job": {
    "id": "",
    "source": "",
    "title": "",
    "company": "",
    "location": "",
    "region": "",
    "url": "",
    "applyUrl": "",
    "employerEmail": ""
  },
  "fitScore": 0,
  "fitReasons": [],
  "gaps": [],
  "headline": "",
  "summary": "",
  "cvMarkdown": "",
  "coverLetter": ""
}
```

## Rules

- **Facts come only from the master CV.** Never add employers, titles, dates, degrees,
  certifications, metrics, tools or languages that are not in it. If the posting asks for
  something the CV lacks, list it in `gaps`; do not paper over it.
- **fitScore** (0-100): 40 skills/responsibilities overlap, 25 seniority and years, 20 domain,
  15 location/language/work-mode feasibility. Be calibrated: 90+ is rare.
- **fitReasons**: 3-5 bullets, each tying a posting requirement to concrete CV evidence.
- **gaps**: 0-4 honest bullets.
- **headline**: exactly `Technical Product Manager` or `Technical Product Owner`. Use Owner
  when the posting is a Product Owner role, otherwise Manager. No extra words.
- **summary**: follow the `human` skill. Two sentences, exactly 350 characters (the master
  Canva summary length), no "I". Keep it general: background and the skills that match
  the posting, then how he works. Do not put percentages, feature names, or a specific
  result in the summary. Those stay in the experience bullets. Every claim stays inside
  the master CV. This length is what fits the one-page Canva frame.
- **cvMarkdown**: the full CV in Markdown, starting with `# Samvel Demirtshyan`, then the new
  headline, contact line, `## Professional Summary` with the new summary, then the CV's
  sections. Reorder skills and bullets so the posting's must-haves surface first and mirror
  its keywords where the CV supports them (ATS-friendly). Keep every role, date and employer.
- **coverLetter**: follow the `human` skill. Greeting, three short body paragraphs, and
  the sign-off. No fourth paragraph and no invented facts. The 12% and 7% results go
  only in the second paragraph.
- **job.employerEmail**: copy it only when the posting itself shows a hiring email. Leave it
  empty otherwise. Do not invent one.
- **job.applyUrl**: the company's own application form when the posting links to one. Leave
  it empty when the only link is the job-board listing.
- Write in the posting's language only if it is not English and the CV shows that language.
  Otherwise write in English.
