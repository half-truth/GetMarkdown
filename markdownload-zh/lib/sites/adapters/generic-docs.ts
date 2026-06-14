/**
 * Generic documentation framework adapter
 *
 * Carried over unchanged from extractor.unlisted.ts documentation site matching logic
 */
import type { SiteAdapter } from '../../types';

export const gitbookAdapter: SiteAdapter = {
  id: 'gitbook',
  match: (url: string) => url.includes('gitbook.io'),
  siteName: 'GitBook',
  removeSelectors: [
    '.book-summary', '.navigation', '.page-actions',
    '[class*="toolbar"]', '[class*="search"]',
  ],
};

// Adapters based on DOM feature matching cannot match at URL stage
// Need to detect via DOM in the preprocess stage
// The following adapters use broad URL matching + DOM detection combination

export const readthedocsAdapter: SiteAdapter = {
  id: 'readthedocs',
  match: (url: string) => url.includes('readthedocs.io') || url.includes('readthedocs.org'),
  siteName: 'Read the Docs',
  removeSelectors: [
    '.wy-nav-side', '.rst-versions', '.rst-footer-buttons',
    '[role="navigation"]', '.wy-side-scroll',
  ],
};

export const docusaurusAdapter: SiteAdapter = {
  id: 'docusaurus',
  match: (url: string) => false, // DOM detection only
  removeSelectors: [
    '.theme-doc-sidebar-container', '.pagination-nav',
    '.navbar', '.footer', '[class*="tableOfContents"]',
  ],
};

export const vuepressAdapter: SiteAdapter = {
  id: 'vuepress',
  match: (url: string) => false, // DOM detection only
  removeSelectors: [
    '.sidebar', '.page-nav', '.navbar',
    '.vp-sidebar', '.vp-nav', '[class*="footer"]',
  ],
};

export const mkdocsAdapter: SiteAdapter = {
  id: 'mkdocs',
  match: (url: string) => false, // DOM detection only
  removeSelectors: [
    '.md-sidebar', '.md-header', '.md-footer',
    '[class*="navigation"]', '[class*="search"]',
  ],
};

/**
 * DOM detection matcher
 * Called in the preprocess stage to detect documentation frameworks that cannot be matched by URL
 */
export function detectDocFramework(doc: Document): SiteAdapter | null {
  // GitBook (DOM detection supplement)
  if (doc.querySelector('.gitbook-root')) {
    return gitbookAdapter;
  }

  // Read the Docs (DOM detection supplement)
  if (doc.querySelector('.rst-versions')) {
    return readthedocsAdapter;
  }

  // Docusaurus
  if (doc.querySelector('[class*="docusaurus"]') || doc.querySelector('.theme-doc-sidebar-container')) {
    return docusaurusAdapter;
  }

  // VuePress/VitePress
  if (doc.querySelector('.vp-sidebar') || doc.querySelector('.sidebar-links') ||
      doc.querySelector('[class*="vuepress"]')) {
    return vuepressAdapter;
  }

  // MkDocs
  if (doc.querySelector('[class*="md-sidebar"]') || doc.querySelector('.md-container')) {
    return mkdocsAdapter;
  }

  return null;
}

/**
 * Documentation site adapters that can be matched by URL
 */
export const genericDocsAdapters: SiteAdapter[] = [
  gitbookAdapter,
  readthedocsAdapter,
];
