<div align="center">

# MarkDownload 中文版

**将网页一键剪藏为 Markdown，专为 Obsidian 用户打造**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Chrome MV3](https://img.shields.io/badge/Chrome-MV3-4285F4?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![WXT](https://img.shields.io/badge/Built_with-WXT-FF6C37)](https://wxt.dev/)

[English](README.en.md) | 简体中文

<img src="docs/screenshot-popup.png" width="480" alt="MarkDownload 弹窗界面">

</div>

---

## 为什么选择 MarkDownload 中文版？

| | 其他剪藏工具 | MarkDownload 中文版 |
|:---:|:---:|:---:|
| **权限** | 全站权限 / 读取所有网站 | 仅 `activeTab` — 点击时才访问当前页 |
| **中文站点** | 图片丢失、乱码、广告残留 | 68 个站点深度适配 |
| **Obsidian** | 需要手动加 Frontmatter | 自动生成完整 Frontmatter |
| **隐私** | 可能上传数据 | 完全本地处理，零网络请求 |

## 核心特性

- **一键剪藏** — 点击图标，自动提取正文、生成 Markdown、下载到本地
- **68 个站点适配** — 微信公众号 / 知乎 / CSDN / 掘金 / 腾讯新闻 / Reddit 等
- **Obsidian Frontmatter** — 自动生成 `title` / `id` / `created` / `tags` / `source` 元数据
- **智能图片处理** — 13 种懒加载属性自动识别，相对路径自动转绝对路径
- **实时预览** — 下载前预览完整 Markdown 内容，支持编辑标题
- **隐私优先** — 仅 `activeTab` + `scripting` + `downloads` 三项权限

## 快速开始

### 安装（开发版）

```bash
git clone https://github.com/yuevthins/markdownload-zh.git
cd markdownload-zh/markdownload-zh
npm install
npm run build
```

然后在 Chrome 中：
1. 打开 `chrome://extensions/`
2. 开启「开发者模式」
3. 点击「加载已解压的扩展」
4. 选择 `.output/chrome-mv3/` 目录

### 使用

1. 打开任意网页
2. 点击扩展图标
3. 预览 Markdown / 编辑标题
4. 点击 **下载** 或 **复制**

## 输出格式

生成的 Markdown 文件自动包含 Obsidian 兼容的 Frontmatter：

```yaml
---
title: "深度学习在自然语言处理中的最新进展"
id: 20260318-k7f2
created: 2026-03-18
updated: 2026-03-18
captured: 2026-03-18 21:30:00
status: draft
category: resource
tags:
  - 收藏
source: https://example.com/article
site: example.com
---
```

## 适配站点

<details>
<summary><b>查看全部 68 个适配站点</b></summary>

| 分类 | 站点 |
|:-----|:-----|
| **中文社区** | 微信公众号、知乎、CSDN、掘金、博客园、思否、简书、少数派 |
| **新闻媒体** | 腾讯新闻、澎湃新闻、凤凰网、网易新闻、百度百科 |
| **技术博客** | Medium、Dev.to、Hacker News、InfoQ |
| **文档框架** | GitBook、Docusaurus、VuePress、MkDocs、Read the Docs |
| **社交平台** | Reddit（含 Shadow DOM）、TikTok Shop |
| **其他** | 维基百科中文、及更多通用站点… |

</details>

## 架构

```
4 阶段管线架构（Pipeline + Site Adapter）

用户点击图标 → Popup
       ↓
chrome.scripting.executeScript
       ↓
┌──────────────────────────────────────┐
│  Stage 1: Preprocess                 │
│  懒加载图片 · 表格归一化 · 噪声移除    │
├──────────────────────────────────────┤
│  Stage 2: Extract                    │
│  Readability.js + 后备提取器          │
├──────────────────────────────────────┤
│  Stage 3: Convert                    │
│  Turndown HTML→Markdown + GFM        │
├──────────────────────────────────────┤
│  Stage 4: Format                     │
│  零宽字符清理 · 空行压缩              │
└──────────────────────────────────────┘
       ↓
Popup 渲染预览 → 下载 / 复制
```

## 开发

```bash
cd markdownload-zh

npm run dev              # 开发模式（热重载）
npm test                 # 单元测试（Vitest）
npm run test:integration # 集成测试
npm run test:e2e         # E2E 测试（Playwright）
npm run lint             # ESLint
npm run build            # 生产构建
```

### 添加新站点适配器

1. 在 `lib/sites/adapters/` 创建适配器文件
2. 实现 `SiteAdapter` 接口（或用 `createSimpleAdapter()` 工厂函数）
3. 在 `lib/sites/index.ts` 注册
4. 添加测试 fixture

## 技术栈

| 技术 | 用途 |
|:-----|:-----|
| [WXT](https://wxt.dev/) | 浏览器扩展框架 |
| [TypeScript](https://www.typescriptlang.org/) | 类型安全 |
| [Readability.js](https://github.com/mozilla/readability) | 正文提取（Mozilla） |
| [Turndown](https://github.com/mixmark-io/turndown) | HTML → Markdown |
| [Vitest](https://vitest.dev/) | 单元测试 |
| [Playwright](https://playwright.dev/) | E2E 测试 |

## 许可

[MIT](LICENSE)

---

<div align="center">

**如果觉得好用，欢迎给个 Star ⭐**

</div>
