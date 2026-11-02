/**
 * Satori (the renderer behind next/og's ImageResponse) doesn't implement the
 * Unicode Bidi Algorithm — it reverses the character order of every maximal
 * Hebrew-block run it encounters, regardless of any CSS direction/unicodeBidi
 * property (verified empirically: none of direction, unicodeBidi: plaintext,
 * or unicodeBidi: bidi-override changed the output). Digits, Latin text, and
 * the relative order of runs are all rendered correctly on their own.
 *
 * Pre-reversing each Hebrew run here cancels out Satori's reversal, so the
 * final rendered image reads correctly. Only use this for text passed into
 * ImageResponse JSX — regular page content is unaffected since browsers
 * implement bidi correctly.
 */
export function fixHebrewForSatori(text: string): string {
  return text.replace(/[֐-׿]+/g, (run) => Array.from(run).reverse().join(""));
}
