/**
 * Stage 1: DOM Preprocessing
 */
import type { SiteAdapter } from '../types';
import { preprocessLazyImages } from './lazy-images';
import { normalizeTables } from './tables';
import { removeVideoPlayers } from './video-players';

/**
 * Universal cleanup selectors (all sites)
 */
const UNIVERSAL_REMOVE_SELECTORS = [
  // Ad-related (these selectors are generally safe)
  '[id*="google_ads"]', '[class*="google-ad"]', '[class*="GoogleAd"]',
  '[id*="taboola"]', '[id*="outbrain"]', '[class*="sponsored-content"]',
  // Social share buttons
  '.addthis_toolbox', '.shareaholic',
  // Cookie notices (use more specific selectors)
  '[class*="cookie-banner"]', '[class*="cookie-consent"]',
  '[id*="cookie-notice"]', '[id*="gdpr-banner"]',
];

/**
 * 预处理 DOM（Stage 1）
 *
 * 执行顺序：
 * 1. Generic lazy image handling
 * 2. Generic video player filtering
 * 3. Generic table preprocessing
 * 4. Site-specific removeSelectors
 * 5. Site-specific preprocess hook
 * 6. Generic cleanup
 *
 * Each stage failure does not interrupt the pipeline
 */
export async function preprocessDOM(
  doc: Document,
  url: string,
  adapter: SiteAdapter | null
): Promise<void> {
  const baseUrl = url;

  // 1. Generic lazy image handling
  try {
    preprocessLazyImages(doc, baseUrl);
  } catch (e) {
    console.warn('[Markdownload] preprocessLazyImages failed:', e);
  }

  // 2. Generic video player filtering
  try {
    removeVideoPlayers(doc);
  } catch (e) {
    console.warn('[Markdownload] removeVideoPlayers failed:', e);
  }

  // 3. Generic table preprocessing
  try {
    normalizeTables(doc);
  } catch (e) {
    console.warn('[Markdownload] normalizeTables failed:', e);
  }

  // 4. Site-specific preprocess hook
  if (adapter?.preprocess) {
    try {
      await adapter.preprocess(doc, url);
    } catch (e) {
      console.warn('[Markdownload] adapter.preprocess failed:', e);
    }
  }

  // 5. Combined cleanup: site removeSelectors + UNIVERSAL_REMOVE_SELECTORS (single querySelectorAll)
  try {
    const adapterSelectors = adapter?.removeSelectors || [];
    const allSelectors = [...adapterSelectors, ...UNIVERSAL_REMOVE_SELECTORS];
    if (allSelectors.length > 0) {
      const mainContent = doc.querySelector('article, main, [role="main"], .article-content, .post-content');
      const adapterSelectorStr = adapterSelectors.length > 0 ? adapterSelectors.join(', ') : '';

      doc.querySelectorAll(allSelectors.join(', ')).forEach((el) => {
        // Site-specific selectors: unconditional removal
        if (adapterSelectorStr && el.matches(adapterSelectorStr)) {
          el.remove();
          return;
        }
        // Generic selectors: don't delete inside main content (except ad iframes)
        if (mainContent && mainContent.contains(el)) {
          if (el.tagName === 'IFRAME' && (el as HTMLIFrameElement).src?.includes('ads')) {
            el.remove();
          }
        } else {
          el.remove();
        }
      });
    }
  } catch (e) {
    console.warn('[Markdownload] cleanup failed:', e);
  }
}
