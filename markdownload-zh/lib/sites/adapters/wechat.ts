/**
 * WeChat Official Accounts adapter
 *
 * ⚠️ Ported as-is from extractor.unlisted.ts, no logic changes
 */
import type { SiteAdapter } from '../../types';

export const wechatAdapter: SiteAdapter = {
  id: 'wechat',
  match: 'mp.weixin.qq.com',
  siteName: 'WeChat Official Accounts',

  removeSelectors: [
    '#js_pc_qr_code', '#js_share_area', '.qr_code_pc',
    'iframe', '.rich_media_tool', '.rich_media_meta_list',
  ],

  preprocess(doc: Document) {
    // WeChat Official Accounts image style attributes interfere with display
    doc.querySelectorAll('img').forEach((img) => img.removeAttribute('style'));
  },

  fallbackSelectors: ['#js_content', '.rich_media_content', '#js_article'],
};
