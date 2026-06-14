/**
 * Turndown instance factory + custom rules
 *
 * Migrated from extractor.unlisted.ts getTurndownService()
 */
import TurndownService from 'turndown';
import { gfm } from 'turndown-plugin-gfm';
import { LAZY_IMAGE_ATTRS, normalizeImageUrl, isPlaceholderSrc, extractFirstFromSrcset } from '@/utils/lazy-image';
import { getSmartAlt } from './smart-alt';

/**
 * TurndownService singleton (performance: avoid recreating instance and re-adding rules)
 */
let _turndownInstance: TurndownService | null = null;

/**
 * Current page URL for conversion (set by setBaseUrl, replaces window.location.href)
 */
let _currentBaseUrl = '';

/**
 * Set the current page URL (call before convertToMarkdown)
 */
export function setBaseUrl(url: string): void {
  _currentBaseUrl = url;
}

/**
 * Get Turndown service (singleton pattern)
 *
 * Performance optimization: TurndownService instance and rules are created only once,
 * subsequent calls reuse them directly.
 * In browser extension scenarios, each page injection creates a new JS context,
 * so the singleton is only valid within a single page's lifecycle, not across pages.
 */
export function getTurndownService(): TurndownService {
  if (_turndownInstance) {
    return _turndownInstance;
  }

  const turndown = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    emDelimiter: '*',
    bulletListMarker: '-',
  });

  turndown.use(gfm);

  // Handle lazy images (supports multiple data-* attrs + relative paths)
  turndown.addRule('lazyImages', {
    filter: (node) => {
      if (node.nodeName !== 'IMG') return false;
      const src = node.getAttribute('src');
      // If src is a placeholder, check for lazy-load attributes
      if (isPlaceholderSrc(src)) {
        return LAZY_IMAGE_ATTRS.some((attr) => node.getAttribute(attr));
      }
      return false;
    },
    replacement: (_content, node) => {
      const img = node as HTMLImageElement;
      const baseUrl = _currentBaseUrl || (typeof window !== 'undefined' ? window.location.href : '');
      let src = '';

      // Try to get the real image URL by priority
      for (const attr of LAZY_IMAGE_ATTRS) {
        const value = img.getAttribute(attr);
        const normalizedUrl = normalizeImageUrl(value || '', baseUrl);
        if (normalizedUrl) {
          src = normalizedUrl;
          break;
        }
      }

      // If still none, try to extract from srcset
      if (!src) {
        const srcset = img.getAttribute('srcset') || img.getAttribute('data-srcset');
        if (srcset) {
          src = normalizeImageUrl(extractFirstFromSrcset(srcset) || '', baseUrl) || '';
        }
      }

      const alt = getSmartAlt(img);
      return src ? `![${alt}](${src})` : '';
    },
  });

  // Handle figure elements (containing images and captions)
  turndown.addRule('figure', {
    filter: 'figure',
    replacement: (content) => {
      return '\n\n' + content.trim() + '\n\n';
    },
  });

  // Handle figcaption elements
  turndown.addRule('figcaption', {
    filter: 'figcaption',
    replacement: (content) => {
      return '\n*' + content.trim() + '*\n';
    },
  });

  // Code block language detection: extract language from class="language-xxx"
  turndown.addRule('fencedCodeBlockLanguage', {
    filter: (node) => {
      return (
        node.nodeName === 'PRE' &&
        node.firstChild !== null &&
        node.firstChild.nodeName === 'CODE'
      );
    },
    replacement: (_content, node) => {
      const code = (node as HTMLElement).querySelector('code')!;
      const classAttr = code.getAttribute('class') || '';
      const langMatch = classAttr.match(/(?:language-|lang-)(\S+)/);
      const lang = langMatch ? langMatch[1] : '';
      const text = code.textContent || '';
      // Dynamically extend fence length to avoid collisions with ``` in code
      let fence = '```';
      const fenceRegex = /(`{3,})/g;
      let match;
      while ((match = fenceRegex.exec(text)) !== null) {
        if (match[1].length >= fence.length) {
          fence = '`'.repeat(match[1].length + 1);
        }
      }
      return `\n\n${fence}${lang}\n${text.replace(/\n$/, '')}\n${fence}\n\n`;
    },
  });

  turndown.addRule('emptyLinks', {
    filter: (node) => {
      return (
        node.nodeName === 'A' &&
        (!node.getAttribute('href') ||
          node.getAttribute('href')?.startsWith('javascript:'))
      );
    },
    replacement: (content) => content,
  });

  _turndownInstance = turndown;
  return turndown;
}
