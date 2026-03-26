/**
 * 文本清理工具
 */

/**
 * 零宽字符正则
 * - U+200B: Zero Width Space
 * - U+200C: Zero Width Non-Joiner
 * - U+200D: Zero Width Joiner
 * - U+200E: Left-to-Right Mark
 * - U+200F: Right-to-Left Mark
 * - U+2060: Word Joiner
 * - U+FEFF: BOM / Zero Width No-Break Space
 */
// eslint-disable-next-line no-misleading-character-class
const ZERO_WIDTH_CHARS = /[\u200B\u200C\u200D\u200E\u200F\u2060\uFEFF]/g;

/**
 * 移除零宽字符
 */
export function removeZeroWidthChars(text: string): string {
  return text.replace(ZERO_WIDTH_CHARS, '');
}

/**
 * 通用占位符 alt 文本（需要被替换的）
 */
const PLACEHOLDER_ALTS = ['图片', 'image', 'img', 'photo', '图', ''];

/**
 * 判断是否为占位符 alt
 */
export function isPlaceholderAlt(alt: string | null): boolean {
  if (!alt) return true;
  const normalized = alt.trim().toLowerCase();
  return PLACEHOLDER_ALTS.includes(normalized);
}
