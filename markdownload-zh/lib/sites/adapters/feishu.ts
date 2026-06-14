/**
 * Feishu Docs adapter
 *
 * Coverage (tested against knowledge base #429 links):
 *   docx (170) ✓  — Virtual-scroll DOM, primary target of this adapter
 *   file (204) ✓  — Feishu 302 redirects to docx, matched automatically
 *   sheets (49) △ — Partially redirect to docx (extractable), partially to base (Canvas, not extractable)
 *   slides (5)  ✗ — Non-standard DOM, SPA navigation, falls back to Readability
 *   base (1)    ✗ — Pure Canvas rendering, falls back to Readability
 *
 * Virtual scroll strategy:
 *   - div[data-block-id] blocks: exist outside viewport but innerHTML is empty
 *   - Table <tr data-index>: only visible rows rendered (3-5 rows per batch)
 *   - scrollHeight grows dynamically during scroll
 *   - Adaptive termination: N consecutive steps with no new content = reached bottom
 *
 * Image strategy:
 *   - 80% are blob: URLs, 20% are http (all require login session)
 *   - Unified Canvas conversion to data:image/jpeg (100% success rate in testing)
 *   - Capped at 800px width + JPEG 0.6 quality (compatible with Typora/Obsidian/Claude)
 */
import type { SiteAdapter } from '../../types';
import { removeZeroWidthChars } from '@/utils/text-cleanup';

// ---------------------------------------------------------------------------
// Utility functions
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
// Rich text extraction: ace-line > span[data-string] → clean HTML
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
// Image conversion: Canvas → data:image/jpeg (100% success rate in testing)
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
    // Canvas failure (CORS etc.) → try original src
    const src = img.getAttribute('src') || '';
    if (src && !src.startsWith('blob:')) return `<img src="${src}" alt="${alt}">`;
    return null;
  }
}

// ---------------------------------------------------------------------------
// Block → clean HTML (covers all block types verified in testing)
// ---------------------------------------------------------------------------

/** Skipped block types (non-content or handled by parent) */
const SKIP_TYPES = new Set([
  'page',            // Page container, title extracted separately
  'back_ref_list',   // Back references
  'table',           // Handled by table row collection
  // Slides-specific (not in docx, but defensive skip)
  'slide', 'shape', 'line', 'group', 'blank', 'presentation',
]);

export function convertBlock(el: HTMLElement): string | null {
  const blockType = el.getAttribute('data-block-type') || '';

  if (SKIP_TYPES.has(blockType)) return null;

  // Heading: heading / heading1 / heading2 / heading3 ...
  if (blockType.startsWith('heading')) {
    // heading-hN class exact match, otherwise infer from blockType suffix
    const fromClass = [1, 2, 3, 4, 5, 6].find((l) =>
      el.classList.contains(`heading-h${l}`),
    );
    const fromType = parseInt(blockType.replace('heading', ''), 10);
    const level = fromClass || (fromType >= 1 && fromType <= 6 ? fromType : 1);
    return `<h${level}>${extractRichText(el)}</h${level}>`;
  }

  // Divider
  if (blockType === 'divider' || blockType === 'horizontal_rule') return '<hr>';

  // Code block
  const codeInner = el.querySelector('.docx-code-block-inner-container');
  if (codeInner) {
    const lang =
      el.querySelector('.code-block-header-btn-con')?.textContent?.trim() || '';
    const code = codeInner.textContent || '';
    return `<pre><code${lang ? ` class="language-${lang}"` : ''}>${escapeHtml(code)}</code></pre>`;
  }

  // Image
  if (blockType === 'image') return convertImage(el);

  // List
  if (blockType === 'bullet') return `<ul><li>${extractRichText(el)}</li></ul>`;
  if (blockType === 'ordered') return `<ol><li>${extractRichText(el)}</li></ol>`;

  // Todo
  if (blockType === 'todo') {
    const checked = el.querySelector('[data-checked="true"]') ? 'x' : ' ';
    return `<ul><li>[${checked}] ${extractRichText(el)}</li></ul>`;
  }

  // Blockquote / Callout
  if (blockType === 'quote' || blockType === 'callout') {
    return `<blockquote>${extractRichText(el)}</blockquote>`;
  }

  // Default: extract as paragraph
  const text = extractRichText(el);
  return text ? `<p>${text}</p>` : null;
}

// ---------------------------------------------------------------------------
// Table row collection (merge by data-index across scroll positions)
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
// Page type detection
// ---------------------------------------------------------------------------

/** Detect if the current page is an extractable docx editor */
export function isDocxPage(doc: Document): boolean {
  return !!(
    doc.querySelector('#docx > div') ||
    doc.querySelector('.bear-web-x-container > div')
  );
}

// ---------------------------------------------------------------------------
// Adaptive scroll + collection
// ---------------------------------------------------------------------------

async function scrollAndCollect(
  liveDoc: Document,
): Promise<{ title: string; contentHtml: string } | null> {
  // Check if it is a docx page (slides/base/sheets are not applicable)
  if (!isDocxPage(liveDoc)) return null;

  const scrollContainer = (liveDoc.querySelector('#docx > div') ||
    liveDoc.querySelector('.bear-web-x-container > div')) as HTMLElement;

  // Non-table block collection (blockId → { order, html }), order preserves document sequence
  const collected = new Map<string, { order: number; html: string }>();
  // Table row collection (data-index → row html), grouped by table blockId
  const tableMeta = new Map<
    string,
    { order: number; rows: Map<string, string> }
  >();
  let blockOrder = 0;
  let title = '';

  /** Current collection count */
  const contentSize = () => {
    let n = collected.size;
    for (const meta of tableMeta.values()) n += meta.rows.size;
    return n;
  };

  /** Snapshot the currently rendered content in the viewport */
  const snapshot = () => {
    // Guard: page may navigate during scroll (knowledge base SPA navigation)
    if (!isDocxPage(liveDoc)) return;

    // ---- Table rows: collect row by row ----
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

    // ---- Non-table blocks (exclude table descendants at selector level, avoid per-node closest()) ----
    for (const el of liveDoc.querySelectorAll(
      'div[data-block-id]:not(div[data-block-type="table"] *)',
    )) {
      const bid = el.getAttribute('data-block-id');
      if (!bid || collected.has(bid)) continue;
      if (!el.textContent?.trim()) continue;

      const blockType = el.getAttribute('data-block-type') || '';

      // Table placeholder (content covered by row collection)
      if (blockType === 'table') {
        if (!tableMeta.has(bid)) {
          tableMeta.set(bid, { order: blockOrder++, rows: new Map() });
        }
        continue;
      }

      // Page title
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

  // Initial snapshot
  snapshot();

  // ---- Adaptive scroll ----
  let totalH = scrollContainer.scrollHeight;
  const viewH = scrollContainer.clientHeight;

  if (totalH > viewH) {
    const step = Math.max(viewH * 0.7, 300);
    const HARD_CEILING_MS = 25_000;
    const EMPTY_STEPS_LIMIT = 5;
    const deadline = Date.now() + HARD_CEILING_MS;
    let emptySteps = 0;

    for (let y = step; Date.now() < deadline; y += step) {
      // Guard: page navigation detection
      if (!isDocxPage(liveDoc)) break;

      scrollContainer.scrollTo(0, Math.min(y, totalH));

      const before = contentSize();
      await new Promise((r) => setTimeout(r, 200));
      snapshot();
      const after = contentSize();

      if (after > before) {
        // Found new content, wait extra to ensure rendering completes
        await new Promise((r) => setTimeout(r, 100));
        snapshot();
        emptySteps = 0;
      } else {
        emptySteps++;
      }

      // scrollHeight grows dynamically as content renders
      const fresh = scrollContainer.scrollHeight;
      if (fresh > totalH) totalH = fresh;

      // End determination: N consecutive empty steps and past scrollHeight
      if (emptySteps >= EMPTY_STEPS_LIMIT && y >= totalH) break;
      if (y > totalH + step * 2) break;
    }

    scrollContainer.scrollTo(0, 0);
  }

  // ---- Assemble final HTML (sorted by blockOrder, preserves document order) ----
  const entries: { order: number; html: string }[] = [];

  for (const meta of tableMeta.values()) {
    if (meta.rows.size === 0) continue;
    // Table row data-index is numeric, sort numerically
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

  // convertBlock wraps each bullet/ordered independently in <ul><li>...</li></ul>
  // Turndown does not merge adjacent same-type lists, inserting blank lines between them
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
// Export adapter
// ---------------------------------------------------------------------------

export const feishuAdapter: SiteAdapter = {
  id: 'feishu',
  match: 'feishu.cn',
  siteName: 'Feishu Docs',
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
    // Return null to fall back to Readability for non-extractable pages (slides/base/sheets)
    if (!result) return null;
    return { title: result.title, content: result.contentHtml };
  },
};
