/**
 * Stage 4: Markdown post-processing
 */
import { cleanupMarkdown } from './cleanup';

/**
 * Format Markdown
 */
export function formatMarkdown(markdown: string): string {
  return cleanupMarkdown(markdown);
}
