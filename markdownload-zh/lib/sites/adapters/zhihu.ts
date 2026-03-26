/**
 * 知乎适配器
 *
 * ⚠️ 原样搬迁自 extractor.unlisted.ts，不改任何逻辑
 */
import type { SiteAdapter } from '../../types';

export const zhihuAdapter: SiteAdapter = {
  id: 'zhihu',
  match: 'zhihu.com',
  siteName: '知乎',

  removeSelectors: [
    '.RecommendationColumn', '.HotAnswers', '.AdCard',
    '.RichContent-actions', '.ContentItem-actions', '.Reward',
    '.FollowButton', '.VoteButton', '.ShareMenu',
    '.Comments-container', '.Post-topicsAndReviewer',
    '.Question-sideColumn', '.Sticky', '.CornerAnimay498', '.CornerBubble',
  ],

  preprocess: (doc: Document) => {
    // 将知乎数学公式元素转换为 TeX 标记，保留公式内容
    doc.querySelectorAll('.ztext-math').forEach((el) => {
      const tex = el.getAttribute('data-tex');
      if (!tex) return;
      // 块级公式（独占一行的 span 或 p 内）vs 行内公式
      const isBlock =
        el.tagName === 'P' ||
        el.parentElement?.tagName === 'P' &&
          el.parentElement.children.length === 1;
      const replacement = doc.createTextNode(
        isBlock ? `$$\n${tex}\n$$` : `$${tex}$`
      );
      el.replaceWith(replacement);
    });
  },

  fallbackSelectors: [
    '.RichContent-inner', '.Post-RichText', '.RichText', '.ztext',
  ],
};
