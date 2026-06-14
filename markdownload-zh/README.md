# GetMarkdown

Save web pages as clean Markdown.

## Features

- 🎯 One-click article extraction
- 📝 Real-time Markdown preview
- 📋 Copy to clipboard
- 🌐 Optimized for Chinese sites (WeChat, Zhihu, etc.)
- 📋 Obsidian Vault-compatible Frontmatter
- 🔒 `activeTab` permission only — no full-site access required

## Privacy

**This extension processes everything locally. No data is collected, and no network requests are sent.**

## Installation

### Development Build

1. Clone the repository
2. `npm install`
3. `npm run build`
4. Load `../output/chrome-mv3/` in Chrome via "Load unpacked"

## Usage

1. Open any web page
2. Click the extension icon
3. Preview/edit the title
4. Download or copy

## Frontmatter Format

```yaml
---
title: "Article Title"
id: 20260124-a3f9
created: 2026-01-24
updated: 2026-01-24
captured: 2026-01-24 17:30:00
status: draft
category: resource
tags:
  - bookmark
source: https://example.com/article
site: example.com
---
```

## Development

```bash
npm run dev     # Watch mode with hot reload
npm run build   # Production build
npm test        # Run tests
npm run lint    # Lint code
```

## Tech Stack

- WXT Framework
- TypeScript
- Chrome Extension MV3
- activeTab + Scripting API

## License

MIT