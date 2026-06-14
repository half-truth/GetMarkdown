/**
 * Smart image alt text extraction
 *
 * Migrated as-is from extractor.unlisted.ts getSmartAlt()
 */
import { isPlaceholderAlt } from '@/utils/text-cleanup';

/**
 * Sanitize alt text: strip newlines, escape Markdown image syntax special characters [ ]
 */
function sanitizeAlt(text: string): string {
  return text
    .replace(/[\r\n]+/g, ' ')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .trim();
}

/**
 * Smartly extract image alt text
 */
export function getSmartAlt(img: HTMLImageElement): string {
  let raw = '';

  // 1. Original alt (if meaningful)
  const originalAlt = img.getAttribute('alt');
  if (originalAlt && !isPlaceholderAlt(originalAlt)) {
    raw = originalAlt;
  }

  // 2. data-alt
  if (!raw) {
    const dataAlt = img.getAttribute('data-alt');
    if (dataAlt && dataAlt.trim()) raw = dataAlt.trim();
  }

  // 3. title
  if (!raw) {
    const title = img.getAttribute('title');
    if (title && title.trim()) raw = title.trim();
  }

  // 4. aria-label
  if (!raw) {
    const ariaLabel = img.getAttribute('aria-label');
    if (ariaLabel && ariaLabel.trim()) raw = ariaLabel.trim();
  }

  // 5. figcaption (if inside a figure)
  if (!raw) {
    const figure = img.closest('figure');
    if (figure) {
      const figcaption = figure.querySelector('figcaption');
      if (figcaption && figcaption.textContent) {
        const captionText = figcaption.textContent.trim();
        if (captionText.length > 0 && captionText.length <= 100) {
          raw = captionText;
        }
      }
    }
  }

  // Unified cleanup: strip newlines + escape Markdown image syntax special characters
  return raw ? sanitizeAlt(raw) : '';
}
