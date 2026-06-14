/**
 * Stage 3: HTML → Markdown
 */
import { getTurndownService, setBaseUrl } from './turndown-factory';

/**
 * Convert HTML to Markdown
 *
 * @param html The HTML string to convert
 * @param baseUrl Page URL, used for normalizing relative paths of lazy-loaded images
 */
export function convertToMarkdown(html: string, baseUrl?: string): string {
  if (baseUrl) {
    setBaseUrl(baseUrl);
  }
  const turndown = getTurndownService();
  return turndown.turndown(html);
}
