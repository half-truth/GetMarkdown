/**
 * Zhihu adapter
 *
 * ⚠️ Ported as-is from extractor.unlisted.ts, logic unchanged
 */
import type { SiteAdapter } from '../../types';

export const zhihuAdapter: SiteAdapter = {
  id: 'zhihu',
  match: 'zhihu.com',
  siteName: 'Zhihu',

  removeSelectors: [
    '.RecommendationColumn', '.HotAnswers', '.AdCard',
    '.RichContent-actions', '.ContentItem-actions', '.Reward',
    '.FollowButton', '.VoteButton', '.ShareMenu',
    '.Comments-container', '.Post-topicsAndReviewer',
    '.Question-sideColumn', '.Sticky', '.CornerAnimay498', '.CornerBubble',
  ],

  preprocess: (doc: Document) => {
    // Convert Zhihu math formula elements to TeX markup, preserving formula content
    doc.querySelectorAll('.ztext-math').forEach((el) => {
      const tex = el.getAttribute('data-tex');
      if (!tex) return;
      // Block formula (span or p occupying its own line) vs inline formula
      const isBlock =
        (el.parentElement?.tagName === 'P' &&
          el.parentElement.children.length === 1);
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
