/**
 * Universal lazy image preprocessor
 *
 * Migrated as-is from extractor.unlisted.ts preprocessLazyImages()
 */
import { LAZY_IMAGE_ATTRS, normalizeImageUrl, isPlaceholderSrc, extractFirstFromSrcset } from '@/utils/lazy-image';

/**
 * Pre-computed lazy attribute selector (perf: avoid runtime construction)
 */
const LAZY_ATTR_SELECTOR = LAZY_IMAGE_ATTRS.map(attr => `img[${attr}]`).join(',');

/**
 * Universal lazy image preprocessing
 *
 * Perf: use CSS selector to pre-filter images with lazy attributes,
 * avoids iterating all images and checking each attribute individually.
 */
export function preprocessLazyImages(doc: Document, baseUrl: string): void {
  const processedImages = new Set<Element>();

  /**
   * Process a single lazy image
   */
  const processImage = (img: Element): void => {
    if (processedImages.has(img)) return;
    processedImages.add(img);

    // Try to get real image URL from various data-* attributes
    for (const attr of LAZY_IMAGE_ATTRS) {
      const value = img.getAttribute(attr);
      const normalizedUrl = normalizeImageUrl(value || '', baseUrl);
      if (normalizedUrl) {
        img.setAttribute('src', normalizedUrl);
        return; // 找到有效 URL 就返回
      }
    }

    // Process srcset (if no valid URL found above)
    const srcset = img.getAttribute('data-srcset') || img.getAttribute('srcset');
    if (srcset && isPlaceholderSrc(img.getAttribute('src'))) {
      const firstUrl = extractFirstFromSrcset(srcset);
      const normalizedUrl = normalizeImageUrl(firstUrl || '', baseUrl);
      if (normalizedUrl) {
        img.setAttribute('src', normalizedUrl);
      }
    }
  };

  // Optimization 1: use CSS selector to filter lazy-load images (O(1) query)
  doc.querySelectorAll(LAZY_ATTR_SELECTOR).forEach(processImage);

  // Optimization 2: only check remaining placeholder src images (usually few)
  doc.querySelectorAll('img').forEach((img) => {
    if (processedImages.has(img)) return;
    const currentSrc = img.getAttribute('src');
    if (isPlaceholderSrc(currentSrc)) {
      processImage(img);
    }
  });

  // Handle picture/source elements
  doc.querySelectorAll('picture').forEach((picture) => {
    const img = picture.querySelector('img');
    if (!img) return;

    const sources = picture.querySelectorAll('source');
    for (const source of sources) {
      const srcset = source.getAttribute('srcset') || source.getAttribute('data-srcset');
      if (srcset) {
        const firstUrl = extractFirstFromSrcset(srcset);
        if (firstUrl && !img.getAttribute('src')) {
          img.setAttribute('src', firstUrl);
          break;
        }
      }
    }
  });

  // Handle images in noscript (some sites place real images in noscript)
  doc.querySelectorAll('noscript').forEach((noscript) => {
    const content = noscript.textContent || '';
    if (!content.includes('<img')) return;

    // Use DOMParser to safely parse HTML
    const parser = new DOMParser();
    const tempDoc = parser.parseFromString(content, 'text/html');
    const realImg = tempDoc.querySelector('img');
    if (!realImg) return;

    const realSrc = realImg.getAttribute('src');
    if (!realSrc) return;

    // Strategy 1: previous sibling is IMG
    const prevSibling = noscript.previousElementSibling;
    if (prevSibling?.tagName === 'IMG' && isPlaceholderSrc(prevSibling.getAttribute('src'))) {
      prevSibling.setAttribute('src', realSrc);
      return;
    }

    // Strategy 2: next sibling is IMG
    const nextSibling = noscript.nextElementSibling;
    if (nextSibling?.tagName === 'IMG' && isPlaceholderSrc(nextSibling.getAttribute('src'))) {
      nextSibling.setAttribute('src', realSrc);
      return;
    }

    // Strategy 3: parent has placeholder IMG (common in lazy-load wrappers)
    const parent = noscript.parentElement;
    if (parent) {
      const siblingImg = parent.querySelector('img');
      if (siblingImg && isPlaceholderSrc(siblingImg.getAttribute('src'))) {
        siblingImg.setAttribute('src', realSrc);
        return;
      }
    }

    // Strategy 4: no matching IMG, create new IMG to replace noscript
    const newImg = doc.createElement('img');
    newImg.setAttribute('src', realSrc);
    const alt = realImg.getAttribute('alt');
    if (alt) newImg.setAttribute('alt', alt);
    noscript.replaceWith(newImg);
  });
}

export { LAZY_ATTR_SELECTOR };
