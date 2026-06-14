/**
 * Readability wrapper + timeout protection
 */
import { Readability } from '@mozilla/readability';

/** Skip Readability beyond this node count, use fallback extractor directly */
const MAX_NODE_COUNT = 50_000;

/** Useless tags removed before parsing (reduces Readability workload) */
const STRIP_TAGS = ['script', 'style', 'noscript', 'link[rel="stylesheet"]', 'svg'];

/**
 * Trim DOM: remove nodes useless to Readability, reduce parsing time
 */
function trimDOM(doc: Document): void {
  const selector = STRIP_TAGS.join(', ');
  doc.querySelectorAll(selector).forEach((el) => el.remove());
}

/**
 * Extract content using Readability
 *
 * - Remove useless tags like script/style before parsing
 * - Return null directly when node count exceeds threshold (caller uses fallback extractor)
 * - Includes performance.now() timing warning
 */
export function readabilityExtract(
  doc: Document
): { title: string; content: string; siteName: string } | null {
  // Trim DOM (reduce Readability processing load)
  trimDOM(doc);

  // Node count threshold check
  const nodeCount = doc.getElementsByTagName('*').length;
  if (nodeCount > MAX_NODE_COUNT) {
    console.warn(
      `[Markdownload] DOM node count ${nodeCount} exceeds threshold ${MAX_NODE_COUNT}, skipping Readability`
    );
    return null;
  }

  const reader = new Readability(doc, {
    debug: false,
    charThreshold: 50,
  });

  const startTime = performance.now();
  const article = reader.parse();
  const elapsed = performance.now() - startTime;

  if (elapsed > 3000) {
    console.warn(`[Markdownload] Readability.parse() took ${elapsed.toFixed(0)}ms (>3s warning)`);
  }

  if (!article || !article.content) {
    return null;
  }

  return {
    title: article.title || '',
    content: article.content,
    siteName: article.siteName || '',
  };
}
