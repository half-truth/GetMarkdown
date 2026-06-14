# CLAUDE.md

> 🕐 Last updated: 2026-04-04

## Project Overview

GetMarkdown: A Chrome extension that saves web pages as clean Markdown.

**Tech Stack**: WXT + TypeScript + Chrome MV3 + Readability.js + Turndown
**Permissions**: `activeTab` + `scripting` + `downloads`, injected on demand, no full-site access.

## Common Commands

```bash
npm run dev                    # Watch mode (hot reload)
npm run build                  # Production build → ../output/chrome-mv3/
npm test                       # Vitest unit tests
npm run test:integration       # Integration tests
npm run test:e2e               # E2E (Playwright headless)
ESLINT_USE_FLAT_CONFIG=false npx eslint lib/ --ext .ts  # Lint (project uses legacy .eslintrc.json)
```

Post-build sync:
```bash
cp ../output/chrome-mv3/extractor.js ../markdownload-zh-extension/extractor.js
cp ../output/chrome-mv3/chunks/*.js ../markdownload-zh-extension/chunks/
cp ../output/chrome-mv3/popup.html ../markdownload-zh-extension/popup.html
```

## Architecture

### Data Flow

```
Popup init() → chrome.scripting.executeScript({ files: ['extractor.js'] })
    ↓
extractor.unlisted.ts (live doc + cloned doc) → runPipeline()
    ├── Stage 1: preprocessDOM (lazy images, tables, video)
    ├── Stage 2: extractContent (Readability / customExtract)
    ├── Stage 3: convertToMarkdown (Turndown + GFM)
    └── Stage 4: formatMarkdown (zero-width chars, blank line compression)
    ↓
Result stored in window.__markdownload_extracted → Popup polls (every 200ms, max 30s)
    ↓
Download: Content Script injection (bypass Chrono) → chrome.downloads → <a download> fallback
```

### Core Modules

```
lib/
├── pipeline.ts          # Main orchestrator
├── types.ts             # SiteAdapter interface (includes needsSourceDoc / customExtract)
├── preprocess/          # Stage 1
├── sites/               # 12 adapter files, 68 sites
│   ├── registry.ts      # URL matching: exactHost O(1) → suffix → regex
│   └── adapters/
│       ├── feishu.ts    # Feishu Docs (virtual scroll + table row merge + Canvas images)
│       ├── wechat.ts    # WeChat Official Accounts
│       ├── zhihu.ts     # Zhihu
│       ├── reddit.ts    # Reddit (Shadow DOM, needsSourceDoc)
│       └── ...          # csdn / qq-news / tiktok-shop / chinese-tech(12 sites) / news / tech-blogs / generic-docs / _simple
├── extract/             # Stage 2 (Readability + fallback + customExtract)
├── convert/             # Stage 3 (Turndown + custom rules)
└── format/              # Stage 4 (cleanup)
```

## SiteAdapter Interface

```typescript
interface SiteAdapter {
  id: string;
  match: string | RegExp | ((url: string) => boolean);
  removeSelectors?: string[];
  preprocess?: (doc: Document, url: string) => void;
  fallbackSelectors?: string[];
  needsSourceDoc?: boolean;           // true → customExtract receives live doc (not clone)
  customExtract?: (doc, url, sourceDoc?) => Promise<{ title, content } | null>;
  siteName?: string;
}
```

`needsSourceDoc` scenario: virtual scroll (Feishu), Shadow DOM (Reddit).

## Feishu Adapter (feishu.ts)

Most complex adapter, tested against 429 links across 5 page types.

**Coverage**: docx ✓ / file ✓ (302→docx) / sheets △ / slides ✗ / base ✗ (Canvas)

**Core Mechanics**:
- **Virtual Scroll**: auto-scroll `#docx > div`, wait 300ms for new content, 200ms on empty area, 5 consecutive empty steps = end, hard ceiling 25s
- **Tables**: `<tr data-index>` row-by-row collection merged across scroll positions (scrollHeight grows dynamically 7000→9500+)
- **Images**: 80% blob: URL → Canvas to `data:image/jpeg` (0.6 quality, max width 800px), 100% success rate
- **Title**: extracted from `page` block, cleaned via `cleanZeroWidth()`
- **Headings**: `heading` / `heading1` / `heading2`... full coverage, class-based matching preferred
- **Guard**: `isDocxPage()` check on every step to prevent knowledge-base SPA redirects; defensive skip for slides block type

## Known Gotchas

| Gotcha | Mitigation |
|--------|-----------|
| Blob URL released too early | Only release after `downloads.onChanged` complete/interrupted |
| Injection script wait unreliable | Dual polling + event-driven mode |
| Lazy image relative path loss | `new URL(value, location.href)` normalization |
| Feishu table captures initial rows only | `data-index` row-by-row collection merged across scrolls |
| Feishu scrollHeight grows dynamically | Update upper bound every step via `scrollContainer.scrollHeight` |
| Feishu blob: URLs inaccessible externally | Canvas → data:image/jpeg inline |
| Feishu title zero-width chars | `cleanZeroWidth()` regex cleanup |
| ESLint 9 incompatible with old config | Requires `ESLINT_USE_FLAT_CONFIG=false` |

## Build Output

`extractor.js` (~89KB) = Readability.js + Turndown + all adapters. Output to `../output/chrome-mv3/`.
Pre-built version in `../markdownload-zh-extension/`; manual sync needed after build.