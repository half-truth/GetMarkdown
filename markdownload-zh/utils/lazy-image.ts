/**
 * Lazy image loading utility
 */

/**
 * Lazy-loaded image attribute names (ordered by priority)
 */
export const LAZY_IMAGE_ATTRS = [
  'data-src',
  'data-original',
  'data-actualsrc',
  'data-lazy-src',
  'data-lazyload',
  'data-lazy',
  'data-origin',
  'data-url',
  'data-echo',
  'data-defer-src',
  'data-hi-res-src',
  'data-srcset',
  'loading-src',
] as const;

/**
 * Normalize image URL (supports relative paths, protocol-relative URLs)
 */
export function normalizeImageUrl(value: string, baseUrl: string): string | null {
  if (!value || value.trim() === '') return null;
  try {
    const url = new URL(value, baseUrl);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return url.href;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Extract first URL from srcset attribute
 */
export function extractFirstFromSrcset(srcset: string | null): string | null {
  if (!srcset) return null;
  return srcset.split(',')[0]?.trim().split(' ')[0] || null;
}

/**
 * Check if src is a placeholder image (needs to be replaced)
 */
export function isPlaceholderSrc(src: string | null): boolean {
  if (!src) return true;
  if (src.startsWith('data:')) return true;
  if (/placeholder|loading|blank|spacer|pixel|1x1|lazy|grey|gray/i.test(src)) return true;
  if (/\/img\/bd_logo|default\.(png|jpg|gif)|blank\.(png|jpg|gif)/i.test(src)) return true;
  return false;
}
