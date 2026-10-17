import { resolveApplication } from './apply.js';
import { CANDIDATE } from './config.js';
import type { ApplicationPack } from './store.js';

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeHref(url: string): string {
  return /^https?:\/\//i.test(url) ? escapeHtml(url) : '#';
}

function inline(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, '$1<em>$2</em>')
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener">$1</a>',
    );
}

/** Minimal Markdown (headings, bullets, bold/italic, links, paragraphs) for CV previews. */
export function renderMarkdown(markdown: string): string {
  const html: string[] = [];
  let list = false;
  const closeList = () => {
    if (list) html.push('</ul>');
    list = false;
  };
  for (const raw of markdown.split('\n')) {
    const line = raw.trimEnd();
    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    const bullet = /^\s*[-*•]\s+(.*)$/.exec(line);
    if (heading) {
      closeList();
      const level = heading[1].length;
      html.push(`<h${level}>${inline(heading[2])}</h${level}>`);
    } else if (bullet) {
      if (!list) html.push('<ul>');
      list = true;
      html.push(`<li>${inline(bullet[1])}</li>`);
    } else if (line.trim() === '') {
      closeList();
    } else {
      closeList();
      html.push(`<p>${inline(line)}</p>`);
    }
  }
  closeList();
  return html.join('\n');
}

const STYLES = `
  :root { color-scheme: light dark; --accent: #4f46e5; --muted: #6b7280; --card: rgba(127,127,127,.08); }
  * { box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 0; padding: 24px; max-width: 1100px; margin-inline: auto; line-height: 1.5; }
  header h1 { margin: 0 0 4px; }
  header p { margin: 0 0 24px; color: var(--muted); }
  .job { background: var(--card); border-radius: 14px; padding: 20px; margin-bottom: 20px; border: 1px solid rgba(127,127,127,.2); }
  .job.applied { opacity: .55; }
  .top { display: flex; gap: 16px; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; }
  .top h2 { margin: 0; font-size: 1.2rem; }
  .meta { color: var(--muted); font-size: .9rem; }
  .score { font-weight: 700; font-size: 1.4rem; color: var(--accent); white-space: nowrap; }
  .badge { display: inline-block; font-size: .75rem; padding: 2px 8px; border-radius: 999px; background: rgba(79,70,229,.15); margin-right: 6px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 12px; }
  @media (max-width: 760px) { .grid { grid-template-columns: 1fr; } }
  h3 { font-size: .95rem; margin: 12px 0 4px; }
  ul { margin: 4px 0; padding-left: 20px; }
  details { margin-top: 12px; }
  summary { cursor: pointer; font-weight: 600; }
  .doc { background: rgba(255,255,255,.04); border: 1px solid rgba(127,127,127,.25); border-radius: 10px; padding: 16px; margin-top: 8px; white-space: normal; }
  .letter { white-space: pre-wrap; }
  .actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 16px; }
  button, .button { font: inherit; border: 0; border-radius: 10px; padding: 10px 16px; cursor: pointer; text-decoration: none; background: rgba(127,127,127,.18); color: inherit; }
  .primary { background: var(--accent); color: #fff; font-weight: 600; }
  .route { color: var(--muted); font-size: .85rem; margin-top: 8px; }
  .toast { position: fixed; bottom: 20px; right: 20px; background: #111827; color: #fff; padding: 10px 14px; border-radius: 10px; opacity: 0; transition: opacity .2s; max-width: 420px; }
  .toast.show { opacity: 1; }
`;

export const CLIENT_SCRIPT = `
  const packs = JSON.parse(document.getElementById('packs').textContent);
  const toast = (text) => { const el = document.getElementById('toast'); el.textContent = text; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 4200); };
  const storageKey = (id) => 'job-hunter:applied:' + id;
  const markApplied = (id) => { localStorage.setItem(storageKey(id), new Date().toISOString()); document.querySelector('[data-job="' + CSS.escape(id) + '"]').classList.add('applied'); };
  const printCv = (pack) => {
    const win = window.open('', '_blank');
    if (!win) { toast('Allow pop-ups to download the CV'); return false; }
    win.document.write('<!doctype html><html><head><meta charset="utf-8"><title>' + pack.cvTitle + '</title><style>body{font-family:system-ui,sans-serif;max-width:800px;margin:32px auto;line-height:1.45;color:#111} h1{margin-bottom:0} h2{border-bottom:1px solid #ddd;padding-bottom:4px;margin-top:20px} ul{padding-left:20px} @page{margin:16mm}</style></head><body>' + pack.cvHtml + '</body></html>');
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
    return true;
  };
  const copy = async (text) => { try { await navigator.clipboard.writeText(text); return true; } catch { return false; } };
  const openTab = (url) => { if (!url) return true; return Boolean(window.open(url, '_blank', 'noopener')); };
  document.querySelectorAll('[data-action]').forEach((button) => {
    button.addEventListener('click', async () => {
      const pack = packs[button.dataset.index];
      if (button.dataset.action === 'cv') printCv(pack);
      if (button.dataset.action === 'letter') toast((await copy(pack.coverLetter)) ? 'Cover letter copied' : 'Copy failed');
      if (button.dataset.action === 'apply') {
        const copied = await copy(pack.coverLetter);
        if (pack.channel === 'email') {
          const opened = openTab(pack.gmailUrl);
          markApplied(pack.id);
          toast(opened
            ? 'Gmail is open from sam.demirtshyan@gmail.com. Press Send to deliver the application.'
            : 'Allow pop-ups, then click Apply by email again.');
        } else if (pack.channel === 'site') {
          const opened = openTab(pack.applyUrl);
          if (pack.canvaUrl) openTab(pack.canvaUrl);
          else printCv(pack);
          markApplied(pack.id);
          toast(opened
            ? (copied ? 'Company form and Canva CV are open. Paste the copied cover letter and submit the form.' : 'Company form and Canva CV are open. Submit the form there.')
            : 'Allow pop-ups, then click Apply on company site again.');
        } else {
          const opened = openTab(pack.listingUrl);
          if (pack.canvaUrl) openTab(pack.canvaUrl);
          else printCv(pack);
          markApplied(pack.id);
          toast(opened
            ? (copied ? 'Listing and Canva CV are open, and the cover letter is copied. Submit it on that site.' : 'Listing and Canva CV are open. Submit the application on that site.')
            : 'Allow pop-ups, then click Apply on listing again.');
        }
      }
    });
  });
  packs.forEach((pack) => { if (localStorage.getItem(storageKey(pack.id))) markApplied(pack.id); });
`;

function list(items: string[]): string {
  return items.length
    ? `<ul>${items.map((item) => `<li>${inline(item)}</li>`).join('')}</ul>`
    : '<p>None noted.</p>';
}

function renderPack(pack: ApplicationPack, index: number): string {
  const { job } = pack;
  const route = resolveApplication({
    title: job.title,
    listingUrl: job.url,
    applyUrl: job.applyUrl,
    employerEmail: job.employerEmail,
    coverLetter: pack.coverLetter,
    canvaUrl: pack.canvaUrl,
  });
  return `
  <article class="job" data-job="${escapeHtml(job.id)}">
    <div class="top">
      <div>
        <h2>${escapeHtml(job.title)}</h2>
        <div class="meta">${escapeHtml(job.company)} · ${escapeHtml(job.location)}</div>
        <div style="margin-top:6px"><span class="badge">${escapeHtml(job.source)}</span><span class="badge">${escapeHtml(job.region)}</span><a class="meta" href="${safeHref(job.url)}" target="_blank" rel="noopener">View posting</a></div>
        <div class="route">${escapeHtml(route.route)}</div>
      </div>
      <div class="score">${Math.round(pack.fitScore)}% fit</div>
    </div>
    <div class="grid">
      <div><h3>Why it fits</h3>${list(pack.fitReasons)}</div>
      <div><h3>Gaps to address</h3>${list(pack.gaps)}</div>
    </div>
    <h3>Tailored headline</h3><p>${inline(pack.headline)}</p>
    <h3>Tailored professional summary</h3><p>${inline(pack.summary)}</p>
    <details><summary>Preview tailored CV</summary><div class="doc">${renderMarkdown(pack.cvMarkdown)}</div></details>
    <details><summary>Preview cover letter</summary><div class="doc letter">${escapeHtml(pack.coverLetter)}</div></details>
    <div class="actions">
      <button class="primary" data-action="apply" data-index="${index}">${escapeHtml(route.buttonLabel)}</button>
      <button data-action="cv" data-index="${index}">Download CV (PDF)</button>
      <button data-action="letter" data-index="${index}">Copy cover letter</button>
      ${pack.canvaUrl ? `<a class="button" href="${safeHref(pack.canvaUrl)}" target="_blank" rel="noopener">Open Canva CV</a>` : ''}
    </div>
  </article>`;
}

export function renderDigest(date: string, packs: ApplicationPack[]): string {
  const sorted = [...packs].sort((a, b) => b.fitScore - a.fitScore);
  const payload = sorted.map((pack) => {
    const route = resolveApplication({
      title: pack.job.title,
      listingUrl: pack.job.url,
      applyUrl: pack.job.applyUrl,
      employerEmail: pack.job.employerEmail,
      coverLetter: pack.coverLetter,
      canvaUrl: pack.canvaUrl,
    });
    return {
      id: pack.job.id,
      channel: route.channel,
      listingUrl: route.listingUrl,
      ...(route.applyUrl ? { applyUrl: route.applyUrl } : {}),
      ...(route.gmailUrl ? { gmailUrl: route.gmailUrl } : {}),
      ...(route.canvaUrl ? { canvaUrl: route.canvaUrl } : {}),
      ...(route.employerEmail ? { employerEmail: route.employerEmail } : {}),
      coverLetter: pack.coverLetter,
      cvTitle: escapeHtml(`${CANDIDATE.name} - ${pack.job.title} - ${pack.job.company}`),
      cvHtml: renderMarkdown(pack.cvMarkdown),
    };
  });
  const json = JSON.stringify(payload).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Job matches for ${escapeHtml(date)}</title>
<style>${STYLES}</style>
</head>
<body>
<header>
  <h1>${sorted.length} best-fit Product roles · ${escapeHtml(date)}</h1>
  <p><strong>View posting</strong> opens the job listing. <strong>Apply by email</strong> opens Gmail from ${escapeHtml(CANDIDATE.email)} with the cover letter and Canva CV filled in; press Send to deliver it. <strong>Apply on company site</strong> opens the employer form and the Canva CV, and copies the cover letter.</p>
</header>
${sorted.map(renderPack).join('\n') || '<p>No matches were saved for this day yet.</p>'}
<div id="toast" class="toast" role="status" aria-live="polite"></div>
<script type="application/json" id="packs">${json}</script>
<script>${CLIENT_SCRIPT}</script>
</body>
</html>`;
}
