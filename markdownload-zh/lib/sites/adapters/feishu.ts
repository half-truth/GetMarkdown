/**
 * 飞书文档适配器
 *
 * 覆盖范围（基于知识库 429 链接实测）：
 *   docx (170) ✓  — 虚拟滚动 DOM，本适配器核心目标
 *   file (204) ✓  — 飞书 302 重定向到 docx，自动命中
 *   sheets (49) △ — 部分重定向到 docx（可提取），部分到 base（Canvas，不可提取）
 *   slides (5)  ✗ — 非标准 DOM，SPA 跳转，回退 Readability
 *   base (1)    ✗ — 纯 Canvas 渲染，回退 Readability
 *
 * 虚拟滚动策略：
 *   - div[data-block-id] 块：视口外存在但 innerHTML 为空
 *   - 表格 <tr data-index>：同样只渲染可见行（每次 3-5 行）
 *   - scrollHeight 随滚动动态增长
 *   - 自适应终止：连续 N 步无新内容 = 到底
 *
 * 图片策略：
 *   - 80% 为 blob: URL，20% 为 http（均需登录态）
 *   - 统一 Canvas 转 data:image/jpeg（100% 成功率实测）
 *   - 限宽 800px + JPEG 0.6 压缩（兼容 Typora/Obsidian/Claude）
 */
import type { SiteAdapter } from '../../types';
import { removeZeroWidthChars } from '@/utils/text-cleanup';

// ---------------------------------------------------------------------------
// 工具函数
// ---------------------------------------------------------------------------

export function cleanZeroWidth(text: string): string {
  return removeZeroWidthChars(text).trim();
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ---------------------------------------------------------------------------
// 富文本提取：ace-line > span[data-string] → 干净 HTML
// ---------------------------------------------------------------------------

export function processAceLine(line: HTMLElement): string {
  const parts: string[] = [];
  const processedAnchors = new WeakSet<Element>();

  const pushAnchor = (anchor: Element) => {
    if (processedAnchors.has(anchor)) return;
    processedAnchors.add(anchor);
    const href = anchor.getAttribute('href') || '';
    const text = anchor.textContent?.trim() || '';
    if (text) parts.push(`<a href="${href}">${text}</a>`);
  };

  for (const node of line.querySelectorAll('span[data-string="true"], a')) {
    if (node.tagName === 'A') {
      pushAnchor(node);
      continue;
    }

    if ((node as HTMLElement).hasAttribute('data-enter')) continue;

    const parentAnchor = node.closest('a');
    if (parentAnchor) {
      pushAnchor(parentAnchor);
      continue;
    }

    let text = node.textContent || '';
    if (!text) continue;

    const style = (node as HTMLElement).getAttribute('style') || '';
    if (style.includes('font-weight') && style.includes('bold')) {
      text = `<strong>${text}</strong>`;
    }
    if (style.includes('font-style') && style.includes('italic')) {
      text = `<em>${text}</em>`;
    }
    if (style.includes('text-decoration') && style.includes('line-through')) {
      text = `<del>${text}</del>`;
    }

    parts.push(text);
  }

  return parts.join('');
}

export function extractRichText(el: HTMLElement): string {
  const aceLines = el.querySelectorAll('.ace-line');
  if (aceLines.length > 0) {
    return [...aceLines]
      .map((l) => processAceLine(l as HTMLElement))
      .filter(Boolean)
      .join('<br>');
  }
  return el.textContent?.trim() || '';
}

// ---------------------------------------------------------------------------
// 图片转换：Canvas → data:image/jpeg（100% 成功率实测）
// ---------------------------------------------------------------------------

const IMG_MAX_WIDTH = 800;
const IMG_JPEG_QUALITY = 0.6;

function convertImage(el: HTMLElement): string | null {
  const img = el.querySelector('img');
  if (!img || img.naturalWidth === 0) return null;

  const alt = img.getAttribute('alt') || '';
  try {
    const doc = el.ownerDocument;
    let w = img.naturalWidth;
    let h = img.naturalHeight;
    if (w > IMG_MAX_WIDTH) {
      h = Math.round((h * IMG_MAX_WIDTH) / w);
      w = IMG_MAX_WIDTH;
    }
    const canvas = doc.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
    const dataUrl = canvas.toDataURL('image/jpeg', IMG_JPEG_QUALITY);
    return `<img src="${dataUrl}" alt="${alt}">`;
  } catch {
    // Canvas 失败（CORS 等）→ 尝试原始 src
    const src = img.getAttribute('src') || '';
    if (src && !src.startsWith('blob:')) return `<img src="${src}" alt="${alt}">`;
    return null;
  }
}

// ---------------------------------------------------------------------------
// Block → 干净 HTML（实测覆盖的全部 block type）
// ---------------------------------------------------------------------------

/** 跳过的 block type（非内容或由父级处理） */
const SKIP_TYPES = new Set([
  'page',            // 页面容器，标题单独提取
  'back_ref_list',   // 反向链接
  'table',           // 由表格行收集处理
  // slides 专属（不在 docx 中出现，但防御性跳过）
  'slide', 'shape', 'line', 'group', 'blank', 'presentation',
]);

export function convertBlock(el: HTMLElement): string | null {
  const blockType = el.getAttribute('data-block-type') || '';

  if (SKIP_TYPES.has(blockType)) return null;

  // 标题：heading / heading1 / heading2 / heading3 ...
  if (blockType.startsWith('heading')) {
    // heading-hN class 精确匹配，否则从 blockType 后缀推断
    const fromClass = [1, 2, 3, 4, 5, 6].find((l) =>
      el.classList.contains(`heading-h${l}`),
    );
    const fromType = parseInt(blockType.replace('heading', ''), 10);
    const level = fromClass || (fromType >= 1 && fromType <= 6 ? fromType : 1);
    return `<h${level}>${extractRichText(el)}</h${level}>`;
  }

  // 分割线
  if (blockType === 'divider' || blockType === 'horizontal_rule') return '<hr>';

  // 代码块
  const codeInner = el.querySelector('.docx-code-block-inner-container');
  if (codeInner) {
    const lang =
      el.querySelector('.code-block-header-btn-con')?.textContent?.trim() || '';
    const code = codeInner.textContent || '';
    return `<pre><code${lang ? ` class="language-${lang}"` : ''}>${escapeHtml(code)}</code></pre>`;
  }

  // 图片
  if (blockType === 'image') return convertImage(el);

  // 列表
  if (blockType === 'bullet') return `<ul><li>${extractRichText(el)}</li></ul>`;
  if (blockType === 'ordered') return `<ol><li>${extractRichText(el)}</li></ol>`;

  // 待办
  if (blockType === 'todo') {
    const checked = el.querySelector('[data-checked="true"]') ? 'x' : ' ';
    return `<ul><li>[${checked}] ${extractRichText(el)}</li></ul>`;
  }

  // 引用 / 高亮块
  if (blockType === 'quote' || blockType === 'callout') {
    return `<blockquote>${extractRichText(el)}</blockquote>`;
  }

  // 默认：提取为段落
  const text = extractRichText(el);
  return text ? `<p>${text}</p>` : null;
}

// ---------------------------------------------------------------------------
// 表格行收集（按 data-index 逐行合并，跨滚动位置去重）
// ---------------------------------------------------------------------------

export function collectTableRow(row: Element): string | null {
  const cells = [...row.querySelectorAll('td, th')];
  const hasContent = cells.some((c) => (c.textContent?.trim().length ?? 0) > 2);
  if (!hasContent) return null;

  const isHeader = row.getAttribute('data-index') === '0';
  const cellHtml = cells
    .map((cell) => {
      const tag = isHeader ? 'th' : 'td';
      return `<${tag}>${extractRichText(cell as HTMLElement)}</${tag}>`;
    })
    .join('');
  return `<tr>${cellHtml}</tr>`;
}

// ---------------------------------------------------------------------------
// 页面类型检测
// ---------------------------------------------------------------------------

/** 检测当前页面是否为可提取的 docx 编辑器 */
export function isDocxPage(doc: Document): boolean {
  return !!(
    doc.querySelector('#docx > div') ||
    doc.querySelector('.bear-web-x-container > div')
  );
}

// ---------------------------------------------------------------------------
// 自适应滚动 + 收集
// ---------------------------------------------------------------------------

async function scrollAndCollect(
  liveDoc: Document,
): Promise<{ title: string; contentHtml: string } | null> {
  // 检测是否为 docx 页面（slides/base/sheets 不适用）
  if (!isDocxPage(liveDoc)) return null;

  const scrollContainer = (liveDoc.querySelector('#docx > div') ||
    liveDoc.querySelector('.bear-web-x-container > div')) as HTMLElement;

  // 非表格 block 收集（blockId → { order, html }），order 保证文档顺序
  const collected = new Map<string, { order: number; html: string }>();
  // 表格行收集（data-index → row html），按 table blockId 分组
  const tableMeta = new Map<
    string,
    { order: number; rows: Map<string, string> }
  >();
  let blockOrder = 0;
  let title = '';

  /** 当前收集总量 */
  const contentSize = () => {
    let n = collected.size;
    for (const meta of tableMeta.values()) n += meta.rows.size;
    return n;
  };

  /** 快照当前视口中已渲染的内容 */
  const snapshot = () => {
    // 防护：页面可能在滚动过程中跳转（知识库 SPA 导航）
    if (!isDocxPage(liveDoc)) return;

    // ---- 表格行：逐行收集 ----
    for (const row of liveDoc.querySelectorAll('table tr[data-index]')) {
      const rowIdx = row.getAttribute('data-index')!;
      const tableBlock = row.closest('div[data-block-type="table"]');
      const tableBid = tableBlock?.getAttribute('data-block-id') || '__table';

      if (!tableMeta.has(tableBid)) {
        tableMeta.set(tableBid, { order: blockOrder++, rows: new Map() });
      }
      const meta = tableMeta.get(tableBid)!;
      if (meta.rows.has(rowIdx)) continue;

      const rowHtml = collectTableRow(row);
      if (rowHtml) meta.rows.set(rowIdx, rowHtml);
    }

    // ---- 非表格 block（选择器层面排除表格子孙，避免逐节点 closest() 遍历）----
    for (const el of liveDoc.querySelectorAll(
      'div[data-block-id]:not(div[data-block-type="table"] *)',
    )) {
      const bid = el.getAttribute('data-block-id');
      if (!bid || collected.has(bid)) continue;
      if (!el.textContent?.trim()) continue;

      const blockType = el.getAttribute('data-block-type') || '';

      // 表格占位（内容由行收集覆盖）
      if (blockType === 'table') {
        if (!tableMeta.has(bid)) {
          tableMeta.set(bid, { order: blockOrder++, rows: new Map() });
        }
        continue;
      }

      // 页面标题
      if (blockType === 'page') {
        if (!title) {
          const pageContent = el.querySelector('.page-block-content');
          title = cleanZeroWidth(
            pageContent?.textContent || el.textContent?.trim() || '',
          );
        }
        continue;
      }

      const html = convertBlock(el as HTMLElement);
      if (html) collected.set(bid, { order: blockOrder++, html });
    }
  };

  // 初始快照
  snapshot();

  // ---- 自适应滚动 ----
  let totalH = scrollContainer.scrollHeight;
  const viewH = scrollContainer.clientHeight;

  if (totalH > viewH) {
    const step = Math.max(viewH * 0.7, 300);
    const HARD_CEILING_MS = 25_000;
    const EMPTY_STEPS_LIMIT = 5;
    const deadline = Date.now() + HARD_CEILING_MS;
    let emptySteps = 0;

    for (let y = step; Date.now() < deadline; y += step) {
      // 防护：页面跳转检测
      if (!isDocxPage(liveDoc)) break;

      scrollContainer.scrollTo(0, Math.min(y, totalH));

      const before = contentSize();
      await new Promise((r) => setTimeout(r, 200));
      snapshot();
      const after = contentSize();

      if (after > before) {
        // 发现新内容，额外等待确保渲染完成
        await new Promise((r) => setTimeout(r, 100));
        snapshot();
        emptySteps = 0;
      } else {
        emptySteps++;
      }

      // scrollHeight 随渲染动态增长
      const fresh = scrollContainer.scrollHeight;
      if (fresh > totalH) totalH = fresh;

      // 到底判定：连续 N 步无新内容 且 已超过 scrollHeight
      if (emptySteps >= EMPTY_STEPS_LIMIT && y >= totalH) break;
      if (y > totalH + step * 2) break;
    }

    scrollContainer.scrollTo(0, 0);
  }

  // ---- 组装最终 HTML（按首次出现的 blockOrder 排序，保持文档顺序）----
  const entries: { order: number; html: string }[] = [];

  for (const meta of tableMeta.values()) {
    if (meta.rows.size === 0) continue;
    // 表格行 data-index 是数字，按数字排序
    const sortedRows = [...meta.rows.entries()].sort(
      (a, b) => parseInt(a[0], 10) - parseInt(b[0], 10),
    );
    entries.push({
      order: meta.order,
      html: `<table>\n${sortedRows.map(([, r]) => r).join('\n')}\n</table>`,
    });
  }

  for (const entry of collected.values()) {
    entries.push(entry);
  }

  entries.sort((a, b) => a.order - b.order);

  if (entries.length === 0) return null;

  // convertBlock 对每个 bullet/ordered 独立包 <ul><li>...</li></ul>
  // Turndown 默认不合并相邻同类列表，会在 Markdown 里插入空行断开列表
  // 源头合并：相邻 </ul>\n<ul>、</ol>\n<ol> 抹掉即可，异类 (<ul>→<ol>) 不匹配不受影响
  const contentHtml = `<article>${entries.map((e) => e.html).join('\n')}</article>`
    .replace(/<\/ul>\n<ul>/g, '')
    .replace(/<\/ol>\n<ol>/g, '');

  return {
    title: title || cleanZeroWidth(liveDoc.title || 'Untitled'),
    contentHtml,
  };
}

// ---------------------------------------------------------------------------
// 导出适配器
// ---------------------------------------------------------------------------

export const feishuAdapter: SiteAdapter = {
  id: 'feishu',
  match: 'feishu.cn',
  siteName: '飞书文档',
  needsSourceDoc: true,
  removeSelectors: [
    '.sidebar',
    '.comment-panel',
    '.doc-header-bar',
    '.share-menu',
    '.catalogue-container',
    '.doc-toolbar',
  ],
  customExtract: async (_doc, _url, sourceDoc) => {
    if (!sourceDoc) return null;
    const result = await scrollAndCollect(sourceDoc);
    // result 为 null 时回退 Readability（slides/base/sheets 等不可提取页面）
    if (!result) return null;
    return { title: result.title, content: result.contentHtml };
  },
};
