const LETTER_SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "2XL", "XXXL", "3XL", "4XL", "FREESIZE", "FREE SIZE"];

function sizeRank(label: string): number {
  const upper = label.trim().toUpperCase();
  const letter = LETTER_SIZE_ORDER.indexOf(upper);
  if (letter >= 0) return letter;
  const numeric = Number.parseFloat(upper);
  return Number.isFinite(numeric) ? 1000 + numeric : Number.MAX_SAFE_INTEGER;
}

/** Orders size labels S → M → L → XL (numeric sizes ascending); unknown labels keep their order at the end. */
export function sortSizeLabels(sizes: readonly string[]): string[] {
  return sizes
    .map((size, index) => ({ size, index, rank: sizeRank(size) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((entry) => entry.size);
}
