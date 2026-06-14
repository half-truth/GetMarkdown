/**
 * Reddit Adapter
 *
 * ⚠️ extractRedditContent() migrated from extractor.unlisted.ts as-is, no logic changes
 */
import type { SiteAdapter } from '../../types';
import { isPlaceholderSrc } from '@/utils/lazy-image';

/**
 * Extract content specifically for Reddit
 * Supports new Shreddit (Shadow DOM) and legacy Reddit
 *
 * @param doc Working document (cloned, for DOM manipulation and legacy Reddit)
 * @param _url Page URL (unused)
 * @param sourceDoc Original document (for Shadow DOM access, cloneNode cannot copy shadowRoot)
 */
function extractRedditContent(
  doc: Document,
  _url: string,
  sourceDoc?: Document
): { title: string; content: string } | null {
  // Reddit DOM structure is complex, Readability often fails, need manual extraction

  // Attempt to read from the original document's Shadow DOM (new Shreddit UI)
  // cloneNode(true) does not copy Shadow DOM, so must use sourceDoc
  const liveDoc = sourceDoc || doc;
  const shredditPost = liveDoc.querySelector('shreddit-post') as HTMLElement | null;
  const shadowRoot = shredditPost?.shadowRoot;

  // Extract title (multi-selector fallback)
  let title: string | undefined;
  if (shadowRoot) {
    title = shadowRoot.querySelector('[slot="title"]')?.textContent?.trim();
  }
  if (!title) {
    title =
      liveDoc.querySelector('h1[slot="title"]')?.textContent?.trim() ||
      liveDoc.querySelector('[data-testid="post-title"]')?.textContent?.trim() ||
      liveDoc.querySelector('h1')?.textContent?.trim() ||
      liveDoc.title || doc.title;
  }

  // Build content container
  const contentContainer = doc.createElement('div');

  // 1. Extract media content (images/videos)
  let mediaEl: Element | null = null;

  // New Shreddit UI media container
  if (shadowRoot) {
    mediaEl = shadowRoot.querySelector('[slot="post-media-container"]');
  }
  if (!mediaEl) {
    mediaEl =
      liveDoc.querySelector('[slot="post-media-container"]') ||
      liveDoc.querySelector('shreddit-post [slot="post-media-container"]') ||
      liveDoc.querySelector('[data-testid="post-container"] [data-testid="media-container"]') ||
      liveDoc.querySelector('.Post [data-click-id="media"]');
  }

  if (mediaEl) {
    // Extract images
    const images = mediaEl.querySelectorAll('img');
    images.forEach((img) => {
      // Get best image URL (prefer src, then various data-* attributes)
      let imgSrc = img.getAttribute('src') || '';

      if (isPlaceholderSrc(imgSrc)) {
        imgSrc = img.getAttribute('data-src') ||
                 img.getAttribute('data-lazy-src') ||
                 img.getAttribute('data-preview-src') ||
                 '';
      }

      if (imgSrc && !isPlaceholderSrc(imgSrc)) {
        const newImg = doc.createElement('img');
        newImg.setAttribute('src', imgSrc);
        newImg.setAttribute('alt', img.getAttribute('alt') || 'Reddit image');
        contentContainer.appendChild(newImg);
        contentContainer.appendChild(doc.createElement('br'));
      }
    });

    // Extract gallery images (shreddit-gallery)
    const gallery = mediaEl.querySelector('shreddit-gallery, [data-testid="gallery"]');
    if (gallery) {
      // Gallery may have multiple image URLs stored in data attributes
      const galleryImages = gallery.querySelectorAll('img, [data-testid="media-element"]');
      galleryImages.forEach((img) => {
        const imgEl = img as HTMLImageElement;
        const imgSrc = imgEl.src || imgEl.getAttribute('data-src') || '';
        if (imgSrc && !isPlaceholderSrc(imgSrc)) {
          const newImg = doc.createElement('img');
          newImg.setAttribute('src', imgSrc);
          newImg.setAttribute('alt', imgEl.alt || 'Reddit gallery image');
          contentContainer.appendChild(newImg);
          contentContainer.appendChild(doc.createElement('br'));
        }
      });
    }
  }

  // 2. Extract text body
  let postContentEl: Element | null = null;

  // Prefer reading from Shadow DOM (new Shreddit)
  if (shadowRoot) {
    postContentEl =
      shadowRoot.querySelector('[slot="text-body"]') ||
      shadowRoot.querySelector('[data-testid="post-content"]');
  }

  // Light DOM fallback (legacy Reddit or old.reddit.com)
  if (!postContentEl) {
    postContentEl =
      liveDoc.querySelector('[slot="text-body"]') ||
      liveDoc.querySelector('[data-testid="post-container"] [data-testid="post-content"]') ||
      liveDoc.querySelector('.Post [data-click-id="text"]') ||
              liveDoc.querySelector('.usertext-body') ||  // old.reddit
              liveDoc.querySelector('.md');  // old.reddit markdown content
  }

  if (postContentEl) {
    const contentClone = postContentEl.cloneNode(true) as HTMLElement;
    contentContainer.appendChild(contentClone);
  }

  // If neither media nor text content found, return null
  if (!contentContainer.innerHTML.trim()) {
    return null;
  }

  return {
    title: title || 'Untitled',
    content: contentContainer.innerHTML,
  };
}

export const redditAdapter: SiteAdapter = {
  id: 'reddit',
  match: 'reddit.com',
  siteName: 'Reddit',
  needsSourceDoc: true,

  customExtract(doc: Document, url: string, sourceDoc?: Document) {
    return extractRedditContent(doc, url, sourceDoc);
  },
};
