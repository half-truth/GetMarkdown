/**
 * Markdown post-processing cleanup
 */
import { removeZeroWidthChars } from '@/utils/text-cleanup';

/**
 * Clean and format Markdown
 * - Remove zero-width characters
 * - Collapse consecutive blank lines
 */
export function cleanupMarkdown(markdown: string): string {
  let result = removeZeroWidthChars(markdown);
  // Collapse consecutive blank lines (at most 2 newlines)
  result = result.replace(/\n{3,}/g, '\n\n');
  return result.trim();
}
