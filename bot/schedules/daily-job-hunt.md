---
cron: '0 19 * * *'
---

Run today's job hunt (23:00 Yerevan time). Follow the "Daily run" workflow in your instructions
end to end: load the master CV, search every source and region, pick the 15 best-fit roles that
were never delivered before, save a tailored application pack for each, then publish the digest.
Never include a role already in `state/delivered.json`, even when the title or job-board id
differs slightly. If there are no new roles, stop without emailing the previous table.
On every pack, load the `human` skill and write a human summary plus a cover letter of at most
two paragraphs.
On each Canva copy, keep the master frame on one page. Set the headline to exactly "Technical
Product Manager" or "Technical Product Owner", and keep the summary the same length as the
master summary. Never edit the master design.

After the digest is published, email that same table to sam.demirtshyan@gmail.com by running
`node scripts/email-digest.mjs` from this project. Commit `review/<date>.html` and
`state/delivered.json` and push them to this branch so the next day does not repeat these roles.
