/**
 * Text cleanup utilities
 */

/**
 * Regex for zero-width and invisible format characters
 * Covers: soft hyphen (U+00AD), Arabic letter mark (U+061C), Mongolian vowel separator (U+180E),
 *         zero-width space family (U+200B-200F), line/paragraph separators & bidi controls (U+2028-202F),
 *         Word Joiner and invisible operators (U+2060-206F), BOM (U+FEFF).
 * Rich text editors like Feishu/Lark pollute text (e.g. U+2029 paragraph separator), so full coverage is needed.
 */
// eslint-disable-next-line no-misleading-character-class
const ZERO_WIDTH_CHARS =
  /[\u00AD\u061C\u180E\u200B-\u200F\u2028-\u202F\u2060-\u206F\uFEFF]/g;

/**
 * Remove zero-width characters
 */
export function removeZeroWidthChars(text: string): string {
  return text.replace(ZERO_WIDTH_CHARS, '');
}

/**
 * Generic placeholder alt texts (to be replaced)
 */
const PLACEHOLDER_ALTS = ['图片', 'image', 'img', 'photo', '图', ''];

/**
 * Check if alt text is a placeholder
 */
export function isPlaceholderAlt(alt: string | null): boolean {
  if (!alt) return true;
  const normalized = alt.trim().toLowerCase();
  return PLACEHOLDER_ALTS.includes(normalized);
}
