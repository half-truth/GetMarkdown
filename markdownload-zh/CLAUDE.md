# CLAUDE.md

> 🕐 最后更新: 2026-04-04

## 项目概述

MarkDownload 中文版：Chrome 扩展，将网页内容剪藏为 Markdown，专为 Obsidian 用户优化。

**技术栈**：WXT + TypeScript + Chrome MV3 + Readability.js + Turndown
**权限模型**：`activeTab` + `scripting` + `downloads`，按需注入，无全站权限。

## 常用命令

```bash
npm run dev                    # 开发模式（热重载）
npm run build                  # 生产构建 → .output/chrome-mv3/
npm test                       # Vitest 单元测试
npm run test:integration       # 集成测试
npm run test:e2e               # E2E（Playwright 无头）
ESLINT_USE_FLAT_CONFIG=false npx eslint lib/ --ext .ts  # Lint（项目用旧 .eslintrc.json）
```

构建后同步产物：
```bash
cp .output/chrome-mv3/extractor.js ../markdownload-zh-extension/extractor.js
cp .output/chrome-mv3/chunks/*.js ../markdownload-zh-extension/chunks/
cp .output/chrome-mv3/popup.html ../markdownload-zh-extension/popup.html
```

## 架构

### 数据流

```
Popup init() → chrome.scripting.executeScript({ files: ['extractor.js'] })
    ↓
extractor.unlisted.ts（活文档 + 克隆文档）→ runPipeline()
    ├── Stage 1: preprocessDOM（懒加载、表格、视频）
    ├── Stage 2: extractContent（Readability / customExtract）
    ├── Stage 3: convertToMarkdown（Turndown + GFM）
    └── Stage 4: formatMarkdown（零宽字符、空行压缩）
    ↓
结果存入 window.__markdownload_extracted → Popup 轮询（每 200ms，最多 30 秒）
    ↓
下载：Content Script 注入（绕过 Chrono）→ chrome.downloads → <a download> 兜底
```

### 核心模块

```
lib/
├── pipeline.ts          # 主管线
├── types.ts             # SiteAdapter 接口（含 needsSourceDoc / customExtract）
├── preprocess/          # Stage 1
├── sites/               # 12 个适配器文件，68 个站点
│   ├── registry.ts      # URL 匹配：exactHost O(1) → suffix → regex
│   └── adapters/
│       ├── feishu.ts    # 飞书（虚拟滚动 + 表格逐行合并 + Canvas 图片）
│       ├── wechat.ts    # 微信公众号
│       ├── zhihu.ts     # 知乎
│       ├── reddit.ts    # Reddit（Shadow DOM，needsSourceDoc）
│       └── ...          # csdn / qq-news / tiktok-shop / chinese-tech(12站) / news / tech-blogs / generic-docs / _simple
├── extract/             # Stage 2（Readability + fallback + customExtract）
├── convert/             # Stage 3（Turndown + 自定义规则）
└── format/              # Stage 4（清理）
```

## SiteAdapter 接口

```typescript
interface SiteAdapter {
  id: string;
  match: string | RegExp | ((url: string) => boolean);
  removeSelectors?: string[];
  preprocess?: (doc: Document, url: string) => void;
  fallbackSelectors?: string[];
  needsSourceDoc?: boolean;           // true → customExtract 收到活文档（非克隆）
  customExtract?: (doc, url, sourceDoc?) => Promise<{ title, content } | null>;
  siteName?: string;
}
```

`needsSourceDoc` 场景：虚拟滚动（飞书）、Shadow DOM（Reddit）。

## 飞书适配器（feishu.ts）

最复杂的适配器，基于 429 链接 5 种页面类型实测。

**覆盖范围**：docx ✓ / file ✓（302→docx）/ sheets △ / slides ✗ / base ✗（Canvas）

**核心机制**：
- **虚拟滚动**：自适应滚动 `#docx > div`，有新内容等 300ms，空区域 200ms，连续 5 步无新内容 = 到底，硬性上限 25 秒
- **表格**：`<tr data-index>` 逐行收集跨滚动位置合并（scrollHeight 动态增长 7000→9500+）
- **图片**：80% blob: URL → Canvas 转 `data:image/jpeg`（0.6 质量 + 限宽 800px），100% 成功率
- **标题**：从 `page` block 提取，`cleanZeroWidth()` 清理
- **heading**：`heading` / `heading1` / `heading2`... 全覆盖，优先 class 匹配
- **防护**：每步 `isDocxPage()` 检测，防知识库 SPA 跳转；slides block type 防御性跳过

## 已知陷阱

| 陷阱 | 规避 |
|------|------|
| Blob URL 过早释放 | 仅在 `downloads.onChanged` complete/interrupted 后释放 |
| 注入脚本等待不可靠 | 轮询 + 事件驱动双模式 |
| 懒加载图片相对路径丢失 | `new URL(value, location.href)` 归一化 |
| 飞书表格只采集初始行 | `data-index` 逐行收集，跨滚动合并 |
| 飞书 scrollHeight 动态增长 | 每步读 `scrollContainer.scrollHeight` 更新上界 |
| 飞书图片 blob: URL 不可外部访问 | Canvas → data:image/jpeg 内嵌 |
| 飞书标题零宽字符 | `cleanZeroWidth()` 正则清理 |
| ESLint 9 不兼容旧配置 | 需 `ESLINT_USE_FLAT_CONFIG=false` |

## 构建产物

`extractor.js`（~89KB）= Readability.js + Turndown + 全部适配器。输出到 `.output/chrome-mv3/`。
预构建版本在 `../markdownload-zh-extension/`，构建后需手动同步。
