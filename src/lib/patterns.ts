// §7 — COMMON_PATTERNS.Major, verbatim. The exact ten progressions from the
// original source. Used by modes 2 (Progression) and 3 (Transpose).
// Major-only in this version (Minor is out of scope, §20).

export const COMMON_PATTERNS: { Major: string[][] } = {
  Major: [
    ['I', 'V', 'vi', 'IV'],
    ['I', 'IV', 'V', 'IV'],
    ['vi', 'IV', 'I', 'V'],
    ['I', 'vi', 'ii', 'V'],
    ['I', 'iii', 'vi', 'IV'],
    ['ii', 'V', 'I', 'vi'],
    ['I', 'V', 'ii', 'IV'],
    ['vi', 'ii', 'V', 'I'],
    ['I', 'IV', 'vi', 'V'],
    ['iii', 'vi', 'IV', 'V'],
  ],
};
