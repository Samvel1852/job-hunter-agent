import { CANDIDATE } from './config.js';

const EMAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const SKIP_EMAIL =
  /noreply|no-reply|donotreply|example\.com|linkedin\.com|glassdoor|indeed\.com|remoteok\.com|staff\.am|google\.com|sentry\.io|wixpress|schema\.org|email\.com$/i;

export function extractEmployerEmail(text: string): string | undefined {
  const matches = text.match(EMAIL) ?? [];
  return matches.find((email) => {
    const lower = email.toLowerCase();
    return lower !== CANDIDATE.email && !SKIP_EMAIL.test(lower);
  });
}

export function isCompanyApplication(listingUrl: string, applyUrl?: string): boolean {
  if (!applyUrl || !/^https?:\/\//i.test(applyUrl)) return false;
  try {
    const listing = new URL(listingUrl);
    const apply = new URL(applyUrl);
    const host = (value: URL) => value.hostname.replace(/^www\./, '');
    if (host(apply) !== host(listing)) return true;
    return /\/apply\b|greenhouse|lever\.co|workday|smartrecruiters|ashbyhq/i.test(apply.href)
      && apply.pathname !== listing.pathname;
  } catch {
    return false;
  }
}

export function applicationSubject(title: string): string {
  return title.trim();
}

export function applicationMessage(coverLetter: string, canvaUrl?: string): string {
  const lines = [coverLetter.trim()];
  if (canvaUrl) lines.push('', `CV: ${canvaUrl}`);
  if (!coverLetter.toLowerCase().includes(CANDIDATE.email)) {
    lines.push('', CANDIDATE.name, CANDIDATE.email);
  }
  return lines.join('\n');
}

const MAX_GMAIL_URL = 6000;

/** Opens Gmail as Samvel with the employer, cover letter, and Canva CV already filled in. */
export function gmailComposeUrl(to: string, subject: string, body: string): string {
  const build = (text: string) => {
    const params = new URLSearchParams({
      view: 'cm',
      fs: '1',
      tf: '1',
      to,
      su: subject,
      body: text,
    });
    return `https://mail.google.com/mail/?authuser=${encodeURIComponent(CANDIDATE.email)}&${params.toString()}`;
  };
  if (build(body).length <= MAX_GMAIL_URL) return build(body);
  const note =
    '\n\nThe full cover letter is on your clipboard. Paste it above this note if Gmail shortened the message.\n';
  let low = 0;
  let high = body.length;
  let best = note.trim();
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const candidate = `${body.slice(0, mid).trimEnd()}${note}`;
    if (build(candidate).length <= MAX_GMAIL_URL) {
      best = candidate;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return build(best);
}

export type ApplyChannel = 'email' | 'site' | 'board';

export type ApplyRoute = {
  channel: ApplyChannel;
  listingUrl: string;
  applyUrl?: string;
  employerEmail?: string;
  gmailUrl?: string;
  canvaUrl?: string;
  buttonLabel: string;
  route: string;
};

function httpsUrl(value?: string): string | undefined {
  if (!value || !/^https?:\/\//i.test(value)) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

/** Prefer an employer email. Otherwise use the company's own form. A board listing is not an application. */
export function resolveApplication(input: {
  title: string;
  listingUrl: string;
  applyUrl?: string;
  employerEmail?: string;
  coverLetter: string;
  canvaUrl?: string;
}): ApplyRoute {
  const listingUrl = httpsUrl(input.listingUrl) ?? input.listingUrl;
  const canvaUrl = httpsUrl(input.canvaUrl);
  const employerEmail = input.employerEmail
    ? extractEmployerEmail(input.employerEmail)
    : undefined;
  if (employerEmail) {
    return {
      channel: 'email',
      listingUrl,
      employerEmail,
      canvaUrl,
      gmailUrl: gmailComposeUrl(
        employerEmail,
        applicationSubject(input.title),
        applicationMessage(input.coverLetter, canvaUrl),
      ),
      buttonLabel: 'Apply by email',
      route: `Opens Gmail from ${CANDIDATE.email} to ${employerEmail}. Subject is the job title. The cover letter and Canva CV are in the message. Press Send.`,
    };
  }
  const applyUrl = httpsUrl(input.applyUrl);
  if (applyUrl && isCompanyApplication(listingUrl, applyUrl)) {
    return {
      channel: 'site',
      listingUrl,
      applyUrl,
      canvaUrl,
      buttonLabel: 'Apply on company site',
      route: 'Opens the company application form and the Canva CV, and copies the cover letter so you can paste it in.',
    };
  }
  return {
    channel: 'board',
    listingUrl,
    canvaUrl,
    buttonLabel: 'Apply on listing',
    route:
      'This posting has no employer email and no separate company form. Apply opens the listing and the Canva CV, and copies the cover letter, so you can submit it there.',
  };
}
