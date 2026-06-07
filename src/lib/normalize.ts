// §13 — answer normalization. Accepts a wide range of input forms and reduces
// them to a canonical string for comparison. ORDER MATTERS. Do not add
// forgiveness beyond what is listed here (see §13 strictness rules).

export function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/\(([^)]*)\)/g, '$1') // strip parens: m7(b5) → m7b5
    .replace(/♯/g, '#') // Unicode → ASCII
    .replace(/♭/g, 'b')
    .replace(/ø7?/g, 'm7b5') // ø or ø7 → m7b5
    // △ or Δ → maj7. NB: toLowerCase() above turns Greek Δ (U+0394) into δ
    // (U+03B4), so include δ too — required by the §19 acceptance test (IΔ7/CΔ7).
    .replace(/[△Δδ]7?/g, 'maj7')
    .replace(/°/g, 'dim') // ° → dim
    .replace(/([a-g][#b]?)-/g, '$1m') // A-7 → Am7, Bb- → Bbm
    .replace(/(i{1,3}|iv|vi{0,2}|v)-(?=\d|b)/g, '$1m') // vi-7 → vim7, vii-7b5 → viim7b5
    .replace(/(i{1,3}|iv|vi{0,2}|v)7b5/g, '$1m7b5') // vii7b5 → viim7b5 (b5 ⇒ half-dim)
    .replace(/min/g, 'm') // Amin7 → Am7, iimin7 → iim7
    .replace(/[,\s]+/g, ' ') // commas/whitespace → single separator
    .trim();
}

// Compare answers as normalize(userInput) === normalize(canonicalAnswer).
export const answersMatch = (userInput: string, canonical: string): boolean =>
  normalize(userInput) === normalize(canonical);
