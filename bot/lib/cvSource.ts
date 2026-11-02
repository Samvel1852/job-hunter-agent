import { CANDIDATE } from './config.js';
import type { BaseCv } from './store.js';

function yerevanDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: CANDIDATE.timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function resolveBaseCv(stored: BaseCv | undefined) {
  const refreshedToday =
    stored?.updatedAt && yerevanDate(stored.updatedAt) === yerevanDate(new Date());
  if (stored?.markdown && stored.canvaDesignId === CANDIDATE.canvaDesignId && refreshedToday) {
    return {
      status: 'ok' as const,
      markdown: stored.markdown,
      source: stored.source,
      updatedAt: stored.updatedAt,
      canvaDesignId: CANDIDATE.canvaDesignId,
      canvaDesignUrl: CANDIDATE.canvaDesignUrl,
    };
  }
  return {
    status: 'missing' as const,
    reason:
      'Read the current master CV from canvaDesignUrl and store it with save_base_cv. For daily runs, refresh from Canva on the same day before tailoring.',
    canvaDesignId: CANDIDATE.canvaDesignId,
    canvaDesignUrl: CANDIDATE.canvaDesignUrl,
  };
}
