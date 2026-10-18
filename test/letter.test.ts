import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isShortCoverLetter, paragraphCount } from '../bot/lib/letter.js';

const letter = `Dear Hiring Team,

I'm excited to apply for the Junior Product Manager – Remittance role. My background combines hands-on product management and software engineering, with experience in customer research, analytics, backlog prioritization, requirements, and cross-functional product delivery.

I've used customer insights and product data to identify opportunities and deliver features that increased subscriptions by 12% and conversions by 7%. I'm particularly interested in this role because it would allow me to apply my product experience while developing deeper expertise in payments and international remittance.

I'm based in Armenia and open to relocating to Abu Dhabi. I'd be glad to discuss how I could contribute to your product team.

Best regards,
Samvel Demirtshyan`;

describe('cover letter length', () => {
  it('accepts the short note and rejects a fourth body paragraph', () => {
    assert.equal(paragraphCount(letter), 5);
    assert.equal(isShortCoverLetter(letter), true);
    const longer = letter.replace(
      "I'd be glad to discuss how I could contribute to your product team.",
      "I'd be glad to discuss how I could contribute to your product team.\n\nI can also walk through the backlog in a call.",
    );
    assert.equal(paragraphCount(longer), 6);
    assert.equal(isShortCoverLetter(longer), false);
  });
});
