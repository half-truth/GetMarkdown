/**
 * Adapter factory functions
 */
import type { SiteAdapter } from '../types';

/**
 * News site base remove selectors
 */
const NEWS_BASE_SELECTORS = [
  'nav', '.navigation', '.sidebar', '.related-articles',
  '.comments', '.social-share', '[class*="ad-"]', '.newsletter-signup',
];

/**
 * Tech blog base remove selectors
 */
const TECH_BLOG_BASE_SELECTORS = [
  '.sidebar', '.comments', '.author-card', '.share-buttons',
  '[class*="ad-"]', '.newsletter', '.related-posts',
];

/**
 * Create news site adapter
 */
export function createNewsAdapter(
  config: Partial<SiteAdapter> & { id: string; match: SiteAdapter['match'] }
): SiteAdapter {
  return {
    ...config,
    removeSelectors: [...NEWS_BASE_SELECTORS, ...(config.removeSelectors ?? [])],
  };
}

/**
 * Create tech blog adapter
 */
export function createTechBlogAdapter(
  config: Partial<SiteAdapter> & { id: string; match: SiteAdapter['match'] }
): SiteAdapter {
  return {
    ...config,
    removeSelectors: [...TECH_BLOG_BASE_SELECTORS, ...(config.removeSelectors ?? [])],
  };
}

/**
 * Create simple adapter (selectors only)
 */
export function createSimpleAdapter(
  config: Partial<SiteAdapter> & { id: string; match: SiteAdapter['match'] }
): SiteAdapter {
  return {
    removeSelectors: [],
    ...config,
  };
}
