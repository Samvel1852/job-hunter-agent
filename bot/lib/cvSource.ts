import { CANDIDATE } from './config.js';
import type { BaseCv } from './store.js';

export function resolveBaseCv(stored: BaseCv | undefined) {
  if (stored?.markdown && stored.canvaDesignId === CANDIDATE.canvaDesignId) {
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
      'Read the current master CV from canvaDesignUrl and store it with save_base_cv. An older saved CV is not the master.',
    canvaDesignId: CANDIDATE.canvaDesignId,
    canvaDesignUrl: CANDIDATE.canvaDesignUrl,
  };
}
