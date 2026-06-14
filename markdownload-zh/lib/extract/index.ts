/**
 * Stage 2: Content Extraction
 */
import type { SiteAdapter } from '../types';
import { readabilityExtract } from './readability';
import { getFallbackContent, getSiteName } from './fallback';

/**
 * Extract content (Stage 2)
 *
 * Priority:
 * 1. Adapter custom extraction (customExtract)
 * 2. Readability
 * 3. Fallback extractor
 */
export async function extractContent(
  doc: Document,
  url: string,
  adapter: SiteAdapter | null,
  sourceDoc?: Document
): Promise<{ title: string; html: string; siteName?: string } | null> {
  // 1. Adapter custom extraction
  if (adapter?.customExtract) {
    try {
      // Pass the original document to adapters that need Shadow DOM access
      const docForExtract = adapter.needsSourceDoc ? sourceDoc : undefined;
      const result = await adapter.customExtract(doc, url, docForExtract);
      if (result) {
        return {
          title: result.title,
          html: result.content,
          siteName: adapter.siteName || getSiteName(doc, url),
        };
      }
    } catch (e) {
      console.warn('[Markdownload] customExtract failed, falling through:', e);
    }
  }

  // 2. Readability
  const article = readabilityExtract(doc);
  if (article) {
    return {
      title: article.title || doc.title || 'Untitled',
      html: article.content,
      siteName: adapter?.siteName || article.siteName || getSiteName(doc, url),
    };
  }

  // 3. Fallback extractor
  const fallback = getFallbackContent(doc, url, adapter);
  if (fallback) {
    return fallback;
  }

  return null;
}
