/**
 * Tencent News adapter
 *
 * ⚠️ Ported verbatim from extractor.unlisted.ts, no logic changes
 */
import type { SiteAdapter } from '../../types';

const qqNewsSelectors = [
  '.txp_video_container', '.video-container', '.video_function',
  '.function_bar', '.barrage_area', '[class*="player_"]',
  '.relative-wrap', '.feed-card', '.hot-news', '.author-articles',
  '.original-card', '.copyright-card', '.copyright', '.cmt_wrap',
  '#comment', '.footer', 'footer', '.bottom-bar',
  '[class*="recommend"]', '[class*="related"]', '[class*="hot-"]',
  '.J-FontSet', '.like-button', '.action-bar', '.function-button',
  '.feedback', '.download-app', '.hot-app', '.qr_code_pc', '#js_pc_qr_code',
  '[class*="ai-assistant"]', '[class*="yuanbao"]', '[class*="ai-bot"]',
  '[class*="share"]', '[class*="qrcode"]', '[data-boss*="share"]',
  '.sidebar', '.ad_area', '[class^="ad-"]', '[class*=" ad-"]',
];

export const qqNewsAdapter: SiteAdapter = {
  id: 'qq-news',
  match: (url: string) => url.includes('news.qq.com') || url.includes('new.qq.com'),
  siteName: 'Tencent News',

  removeSelectors: qqNewsSelectors,

  preprocess(doc: Document) {
    // Smart iframe handling: only remove clearly-ad iframes, preserve potential embedded content
    const mainContent = doc.querySelector('article, main, [role="main"], .content-article');
    doc.querySelectorAll('iframe').forEach((iframe) => {
      const src = iframe.src || '';
      // Known ad domain list
      const adDomains = ['doubleclick', 'googlesyndication', 'taboola', 'outbrain',
                         'adservice', 'adsense', 'adnxs', 'pubmatic', 'criteo'];
      const isAdIframe = adDomains.some(domain => src.includes(domain)) ||
                         (!src && !iframe.srcdoc); // Empty iframe without src or srcdoc

      if (mainContent) {
        // If main content area is found, only remove iframes outside it or clearly-ad iframes
        if (!mainContent.contains(iframe) || isAdIframe) {
          iframe.remove();
        }
      } else {
        // If no main content area is found, only remove clearly-ad iframes, keep others
        if (isAdIframe) {
          iframe.remove();
        }
      }
    });
  },
};
