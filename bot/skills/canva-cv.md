---
description: Use when the master CV must be imported from Canva, or to create a tailored Canva copy of the CV for a saved application pack.
---

# Canva CV

The master CV is the Canva design `DAHYNhleQV4`
(https://www.canva.com/design/DAHY5ieCsr0/kNzpkXk1gFmBp511YCUMUA/edit?ui=e30). Canva tools come from
the Cursor account connector and are advertised by name (they usually contain `design`,
`editing` or `export`). If no Canva tools are available, say so and fall back to the Markdown CV.

## Import the master CV

1. Fetch the design's content (or search designs for "CV" / "Samvel" if fetching by id fails).
2. Rebuild it as Markdown: `# Name`, headline line, contact line, then `##` sections
   (Professional Summary, Experience, Skills, Education, Certifications, Languages) with
   `-` bullets. Keep every fact and number exactly as written.
3. Call `save_base_cv` with `source: "canva"`.

## Groups

The right column is three separate groups, stacked top to bottom. A section heading belongs
to the group below it, never to the text above it.

1. **Summary group.** The `PROFESSIONAL SUMMARY` label and the summary paragraph only.
   The paragraph does not contain the word `EXPERIENCE`.
2. **Experience group.** The `EXPERIENCE` label, then every role. Its top edge sits below
   the summary group with a clear gap, about the same space as between Soft Skills and
   Languages in the sidebar. Do not tuck this group up against the summary, and do not
   let the summary box cover the `EXPERIENCE` label.
3. **Education group.** The `EDUCATION` label, then every entry. Its top edge sits below
   the last experience role, including that role's last bullet and its dates, with the
   same gap. The `EDUCATION` label is not in the same text element as a job bullet or a
   date, and it does not cover them.

Do not move the Experience or Education group upward. If replaced text would make a group
touch the next one, shorten the text. Never close the gap by sliding the lower group up.

## Tailored copy for one pack

Never edit the master design in place.

1. Create a copy of the master design named `CV - <Company> - <Job title>`. If the connector
   cannot copy designs, skip Canva tailoring for this run and leave `canvaUrl` empty.
2. In the copy, replace only two text elements. Keep the master frame: same fonts, positions,
   sizes, groups, and every other element. The result must stay on one page with nothing overlapping.
   - Headline (the line under the name): exactly `Technical Product Manager` or
     `Technical Product Owner`. Use Owner when the posting is a Product Owner role, otherwise
     Manager. Do not add themes, companies, or extra words.
   - Professional summary: the same length as the master summary (350 characters, two
     sentences). Reword toward the role using only master-CV facts, and keep it general:
     no percentages, feature names, or a specific result. If the new text would
     grow the box or cover the experience section, shorten it until it fits, or cancel.
   Commit the edit transaction only when the preview still matches the frame: the summary
   group ends above `EXPERIENCE`, and the education group starts below the last role.
   Cancel it if any step fails, a group moves, or those two gaps close.
3. Export the copy as PDF when the connector supports it.
4. Re-save the pack with `save_application` (same job and content) adding `canvaUrl` set to the
   copy's edit or export URL.
