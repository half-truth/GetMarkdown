/**
 * 文本清理工具
 */

/**
 * 零宽与不可见格式字符正则
 * 覆盖：软连字符 (U+00AD)、阿拉伯字母标记 (U+061C)、蒙古元音分隔符 (U+180E)、
 *       零宽空格族 (U+200B-200F)、行/段分隔符与双向控制 (U+2028-202F)、
 *       Word Joiner 及不可见操作符 (U+2060-206F)、BOM (U+FEFF)。
 * 飞书等富文本编辑器会污染文本（如 U+2029 段分隔符），需完整覆盖。
 */
// eslint-disable-next-line no-misleading-character-class
const ZERO_WIDTH_CHARS =
  /[\u00AD\u061C\u180E\u200B-\u200F\u2028-\u202F\u2060-\u206F\uFEFF]/g;

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
