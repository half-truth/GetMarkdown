# Code Review Fixes Plan

> 来源：四方会审（Kimi / Claude Architecture / Claude Performance / Codex）
> 日期：2026-03-26
> 范围：P0 + P1 修复（P2 留待后续迭代）

## 模块划分

### Module A: 安全与类型修复（5 文件）
1. **全局变量命名空间隔离** — `types/index.ts` + `entrypoints/extractor.unlisted.ts` + `entrypoints/popup/main.ts`
   - 声明 `__markdownload_requestId` 类型，消除 `window as any`
   - 给全局变量加 `__MARKDOWNLOAD_` 前缀验证 requestId 匹配

2. **YAML 模板注入防护** — `utils/template.ts`
   - 转义换行符 `\n`/`\r` 在 YAML quoted string 中
   - 防止 title 含 `{{content}}` 被二次替换

3. **受限页面协议检查补全** — `entrypoints/popup/main.ts`
   - 补充 `file://`、`edge://`、`brave://` 等协议检查

### Module B: 内容质量修复（4 文件）
4. **零宽字符扩展** — `utils/text-cleanup.ts`
   - 补充 `U+200E`/`U+200F`/`U+2060`

5. **知乎数学公式保留** — `lib/sites/adapters/zhihu.ts`
   - 在 preprocess 中将 `.ztext-math` 转换为 `$$..$$`

6. **代码块语言识别** — `lib/convert/turndown-factory.ts`
   - 提取 `class="language-xxx"` 作为 fenced code block 语言标记

7. **mergeSplitLinks 空格丢失** — `lib/preprocess/links.ts`
   - 合并链接文本时保留被跳过的空白节点

### Module C: 代码清理（3 文件）
8. **简书适配器兜底选择器** — `lib/sites/adapters/chinese-tech.ts`
   - 在动态类名前添加 `article` 标签兜底

9. **Registry 死代码清理** — `lib/sites/registry.ts`
   - 移除未使用的 `getMainDomain()`

10. **filename 测试对齐** — `utils/filename.test.ts`
    - 测试期望从 50 改为 200 字符

### Module D: 性能优化（2 文件）
11. **轮询→事件驱动** — `entrypoints/popup/main.ts` + `entrypoints/extractor.unlisted.ts`
    - extractor 完成后发 `chrome.runtime.sendMessage`
    - popup 优先监听 message，保留轮询作 fallback

12. **合并 querySelectorAll** — `lib/preprocess/index.ts`
    - adapter.removeSelectors + UNIVERSAL_REMOVE_SELECTORS 合并为一次查询

## 执行顺序

A → B → C → D（各模块内部顺序如上编号）

## 验证标准

- `npm test` 全部通过
- `ESLINT_USE_FLAT_CONFIG=false npx eslint . --ext .ts,.tsx` 无新增错误
- `npm run build` 构建成功
