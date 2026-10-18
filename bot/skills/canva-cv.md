---
description: Use when the master CV must be imported from Canva, or to create a tailored Canva copy of the CV for a saved application pack.
---

# Canva CV

The master CV is the Canva design `DAHYNhleQV4`
(https://www.canva.com/design/DAHYNhleQV4/htPca5hyr4h524p9R2tLaQ/edit). Canva tools come from
the Cursor account connector and are advertised by name (they usually contain `design`,
`editing` or `export`). If no Canva tools are available, say so and fall back to the Markdown CV.

## Import the master CV

1. Fetch the design's content (or search designs for "CV" / "Samvel" if fetching by id fails).
2. Rebuild it as Markdown: `# Name`, headline line, contact line, then `##` sections
   (Professional Summary, Experience, Skills, Education, Certifications, Languages) with
   `-` bullets. Keep every fact and number exactly as written.
3. Call `save_base_cv` with `source: "canva"`.

## Tailored copy for one pack

Never edit the master design in place.

1. Create a copy of the master design named `CV - <Company> - <Job title>`. If the connector
   cannot copy designs, skip Canva tailoring for this run and leave `canvaUrl` empty.
2. In the copy, replace only two text elements. Keep the master frame: same fonts, positions,
   sizes, and every other element. The result must stay on one page with nothing overlapping.
   - Headline (the line under the name): exactly `Technical Product Manager` or
     `Technical Product Owner`. Use Owner when the posting is a Product Owner role, otherwise
     Manager. Do not add themes, companies, or extra words.
   - Professional summary: the same length as the master summary (350 characters, two
     sentences). Reword toward the role using only master-CV facts, and keep it general:
     no percentages, feature names, or a specific result. If the new text would
     grow the box or cover the experience section, shorten it until it fits, or cancel.
   Commit the edit transaction only when the preview still matches the frame. Cancel it if
   any step fails or the layout moves.
3. Export the copy as PDF when the connector supports it.
4. Re-save the pack with `save_application` (same job and content) adding `canvaUrl` set to the
   copy's edit or export URL.
