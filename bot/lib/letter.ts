/** Blank-line separated blocks. A signature on its own is another paragraph. */
export function paragraphCount(text: string): number {
  return text
    .trim()
    .split(/\n\s*\n/)
    .filter((part) => part.trim().length > 0).length;
}

export function isShortCoverLetter(text: string): boolean {
  const length = text.trim().length;
  return length >= 80 && length <= 1800 && paragraphCount(text) >= 1 && paragraphCount(text) <= 2;
}
