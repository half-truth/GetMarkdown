/**
 * Site adapter entry point
 *
 * Import all adapter modules (trigger registration), then export getSiteAdapter
 */
import { registerAdapter, registerAdapters, getSiteAdapter as _getSiteAdapter } from './registry';
import { detectDocFramework } from './adapters/generic-docs';
import type { SiteAdapter } from '../types';

// Import adapters
import { wechatAdapter } from './adapters/wechat';
import { redditAdapter } from './adapters/reddit';
import { discourseAdapter } from './adapters/discourse';
import { qqNewsAdapter } from './adapters/qq-news';
import { tiktokShopAdapter } from './adapters/tiktok-shop';
import { csdnAdapter } from './adapters/csdn';
import { zhihuAdapter } from './adapters/zhihu';
import { feishuAdapter } from './adapters/feishu';
import { aiSiteAdapters } from './adapters/ai-sites';
import { chineseTechAdapters } from './adapters/chinese-tech';
import { newsAdapters } from './adapters/news';
import { techBlogAdapters } from './adapters/tech-blogs';
import { genericDocsAdapters } from './adapters/generic-docs';
import { simpleAdapters } from './adapters/_simple';

// Register all adapters
// Registration order determines matching priority: more specific first

// 1. Complex sites (with custom logic)
registerAdapter(wechatAdapter);
registerAdapter(redditAdapter);
registerAdapter(discourseAdapter);
registerAdapter(qqNewsAdapter);
registerAdapter(tiktokShopAdapter);
registerAdapter(csdnAdapter);
registerAdapter(zhihuAdapter);
registerAdapter(feishuAdapter);
registerAdapters(aiSiteAdapters);

// 2. Chinese tech communities
registerAdapters(chineseTechAdapters);

// 3. News sites
registerAdapters(newsAdapters);

// 4. Tech blogs
registerAdapters(techBlogAdapters);

// 5. Documentation frameworks
registerAdapters(genericDocsAdapters);

// 6. Simple sites
registerAdapters(simpleAdapters);

/**
 * Get site adapter
 *
 * First try URL matching, if no match, try DOM-based document framework detection
 */
export function getSiteAdapter(url: string, doc?: Document): SiteAdapter | null {
  // URL matching
  const adapter = _getSiteAdapter(url);
  if (adapter) return adapter;

  // DOM-based document framework detection
  if (doc) {
    return detectDocFramework(doc);
  }

  return null;
}
