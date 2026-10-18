/** Blank-line separated blocks. The sign-off is its own block. */
export function paragraphCount(text: string): number {
  return text
    .trim()
    .split(/\n\s*\n/)
    .filter((part) => part.trim().length > 0).length;
}

/** Greeting, three short body paragraphs, then the sign-off. */
export function isShortCoverLetter(text: string): boolean {
  const trimmed = text.trim();
  const blocks = trimmed
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
  if (trimmed.length < 80 || trimmed.length > 1100 || blocks.length !== 5) return false;
  if (blocks[0] !== 'Dear Hiring Team,') return false;
  const signOff = blocks[4].replace(/\s+/g, ' ');
  return signOff === 'Best regards, Samvel Demirtshyan' || blocks[4] === 'Best regards,\nSamvel Demirtshyan';
}
