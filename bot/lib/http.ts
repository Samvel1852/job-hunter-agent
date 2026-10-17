const USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const RATE_LIMIT_RETRIES = 2;
const RATE_LIMIT_BACKOFF_MS = 3_000;

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchText(url: string, timeoutMs = 20_000): Promise<string> {
  let response: Response | undefined;
  for (let attempt = 0; attempt <= RATE_LIMIT_RETRIES; attempt++) {
    if (attempt > 0) await sleep(RATE_LIMIT_BACKOFF_MS * attempt);
    response = await fetch(url, {
      headers: { 'user-agent': USER_AGENT, 'accept-language': 'en-US,en;q=0.9' },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (response.status !== 429) break;
  }
  if (!response?.ok) {
    if (!response) throw new Error(`No response from ${new URL(url).host}`);
    throw new Error(`${response.status} ${response.statusText} for ${new URL(url).host}`);
  }
  return response.text();
}

export async function fetchJson<T>(url: string, timeoutMs = 20_000): Promise<T> {
  return JSON.parse(await fetchText(url, timeoutMs)) as T;
}

const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
  ndash: '–',
  mdash: '—',
};

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === '#') {
      const value =
        code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : Number(code.slice(1));
      return Number.isFinite(value) ? String.fromCodePoint(value) : match;
    }
    return ENTITIES[code.toLowerCase()] ?? match;
  });
}

export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<li[^>]*>/gi, '\n- ')
      .replace(/<\/(p|div|h[1-6]|ul|ol|tr|section)>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function cleanInline(html: string): string {
  return htmlToText(html).replace(/\s+/g, ' ').trim();
}

export function readNextData<T>(html: string): T | undefined {
  const match = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(html);
  return match ? (JSON.parse(match[1]) as T) : undefined;
}
