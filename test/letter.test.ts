import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isShortCoverLetter, paragraphCount } from '../bot/lib/letter.js';

describe('cover letter length', () => {
  it('accepts two paragraphs and rejects a third', () => {
    const letter = [
      'Dear hiring team at Tabby, I want this role because the work is the same kind of backlog and API delivery I did at NextStack.',
      'I raised monthly subscriptions 12% by prioritizing the NOTAMs work, and I would like to do that kind of product work with you. Samvel Demirtshyan',
    ].join('\n\n');
    assert.equal(paragraphCount(letter), 2);
    assert.equal(isShortCoverLetter(letter), true);
    assert.equal(paragraphCount(`${letter}\n\nThanks again.`), 3);
    assert.equal(isShortCoverLetter(`${letter}\n\nThanks again.`), false);
  });
});
