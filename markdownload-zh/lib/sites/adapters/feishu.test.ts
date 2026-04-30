import { describe, it, expect } from 'vitest';
import {
  cleanZeroWidth,
  escapeHtml,
  processAceLine,
  extractRichText,
  convertBlock,
  collectTableRow,
  isDocxPage,
  feishuAdapter,
} from './feishu';

function makeDiv(html: string): HTMLElement {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.firstElementChild as HTMLElement;
}

function makeRow(html: string): Element {
  const table = document.createElement('table');
  table.innerHTML = `<tbody>${html}</tbody>`;
  return table.querySelector('tr')!;
}

describe('cleanZeroWidth', () => {
  it('移除零宽空格族并 trim', () => {
    expect(cleanZeroWidth('  hello​world  ')).toBe('helloworld');
  });

  it('移除 U+2029 段分隔符（feishu 场景）', () => {
    expect(cleanZeroWidth('a b')).toBe('ab');
  });

  it('保留正常文本', () => {
    expect(cleanZeroWidth('飞书文档')).toBe('飞书文档');
  });
});

describe('escapeHtml', () => {
  it('转义 & < >', () => {
    expect(escapeHtml('a & b <c> d')).toBe('a &amp; b &lt;c&gt; d');
  });

  it('空字符串', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('保留中文和引号（不转义）', () => {
    expect(escapeHtml('代码"x"')).toBe('代码"x"');
  });
});

describe('processAceLine', () => {
  it('提取纯文本', () => {
    const line = makeDiv('<div class="ace-line"><span data-string="true">hello</span></div>');
    expect(processAceLine(line)).toBe('hello');
  });

  it('bold 样式包 <strong>', () => {
    const line = makeDiv(
      '<div class="ace-line"><span data-string="true" style="font-weight: bold">粗体</span></div>',
    );
    expect(processAceLine(line)).toBe('<strong>粗体</strong>');
  });

  it('italic 样式包 <em>', () => {
    const line = makeDiv(
      '<div class="ace-line"><span data-string="true" style="font-style: italic">斜</span></div>',
    );
    expect(processAceLine(line)).toBe('<em>斜</em>');
  });

  it('line-through 样式包 <del>', () => {
    const line = makeDiv(
      '<div class="ace-line"><span data-string="true" style="text-decoration: line-through">删</span></div>',
    );
    expect(processAceLine(line)).toBe('<del>删</del>');
  });

  it('直接 <a> 节点转成链接', () => {
    const line = makeDiv(
      '<div class="ace-line"><a href="https://example.com">link</a></div>',
    );
    expect(processAceLine(line)).toBe('<a href="https://example.com">link</a>');
  });

  it('span 嵌套在 <a> 内：用 anchor 文本，不重复', () => {
    const line = makeDiv(
      '<div class="ace-line"><a href="https://example.com"><span data-string="true">link text</span></a></div>',
    );
    expect(processAceLine(line)).toBe('<a href="https://example.com">link text</a>');
  });

  it('data-enter 属性跳过', () => {
    const line = makeDiv(
      '<div class="ace-line"><span data-string="true" data-enter="true">X</span><span data-string="true">Y</span></div>',
    );
    expect(processAceLine(line)).toBe('Y');
  });
});

describe('extractRichText', () => {
  it('有 .ace-line 子元素：走富文本路径，多行用 <br> 连接', () => {
    const el = makeDiv(
      '<div><div class="ace-line"><span data-string="true">line1</span></div><div class="ace-line"><span data-string="true">line2</span></div></div>',
    );
    expect(extractRichText(el)).toBe('line1<br>line2');
  });

  it('无 .ace-line 子元素：返回 trim 过的 textContent', () => {
    const el = makeDiv('<div>  plain text  </div>');
    expect(extractRichText(el)).toBe('plain text');
  });
});

describe('convertBlock', () => {
  function block(type: string, inner = '<div class="ace-line"><span data-string="true">X</span></div>', extra = '') {
    return makeDiv(`<div data-block-type="${type}" ${extra}>${inner}</div>`);
  }

  it('heading1-6 通过 class 识别', () => {
    for (const lvl of [1, 2, 3, 4, 5, 6]) {
      const el = makeDiv(
        `<div data-block-type="heading" class="heading-h${lvl}"><div class="ace-line"><span data-string="true">T</span></div></div>`,
      );
      expect(convertBlock(el)).toBe(`<h${lvl}>T</h${lvl}>`);
    }
  });

  it('heading 通过 blockType 后缀识别（heading2）', () => {
    expect(convertBlock(block('heading2'))).toBe('<h2>X</h2>');
  });

  it('divider 输出 <hr>', () => {
    expect(convertBlock(block('divider', ''))).toBe('<hr>');
  });

  it('bullet 输出独立 <ul><li>', () => {
    expect(convertBlock(block('bullet'))).toBe('<ul><li>X</li></ul>');
  });

  it('ordered 输出独立 <ol><li>', () => {
    expect(convertBlock(block('ordered'))).toBe('<ol><li>X</li></ol>');
  });

  it('todo 未勾选', () => {
    expect(convertBlock(block('todo'))).toBe('<ul><li>[ ] X</li></ul>');
  });

  it('todo 已勾选', () => {
    const el = makeDiv(
      '<div data-block-type="todo"><span data-checked="true"></span><div class="ace-line"><span data-string="true">X</span></div></div>',
    );
    expect(convertBlock(el)).toBe('<ul><li>[x] X</li></ul>');
  });

  it('quote / callout 输出 <blockquote>', () => {
    expect(convertBlock(block('quote'))).toBe('<blockquote>X</blockquote>');
    expect(convertBlock(block('callout'))).toBe('<blockquote>X</blockquote>');
  });

  it('代码块附带语言', () => {
    const el = makeDiv(
      '<div data-block-type="code"><div class="code-block-header-btn-con">typescript</div><div class="docx-code-block-inner-container">const x = 1;</div></div>',
    );
    expect(convertBlock(el)).toBe(
      '<pre><code class="language-typescript">const x = 1;</code></pre>',
    );
  });

  it('代码块无语言 + 转义 < >', () => {
    const el = makeDiv(
      '<div data-block-type="code"><div class="docx-code-block-inner-container">code&lt;x&gt;</div></div>',
    );
    // innerHTML `&lt;` 解析后 textContent 是 `<`，escapeHtml 再转成 `&lt;`
    expect(convertBlock(el)).toBe('<pre><code>code&lt;x&gt;</code></pre>');
  });

  it('page / table / back_ref_list 返回 null', () => {
    expect(convertBlock(block('page'))).toBeNull();
    expect(convertBlock(block('table'))).toBeNull();
    expect(convertBlock(block('back_ref_list'))).toBeNull();
  });

  it('slides 专属类型防御性跳过', () => {
    for (const t of ['slide', 'shape', 'line', 'group', 'blank', 'presentation']) {
      expect(convertBlock(block(t))).toBeNull();
    }
  });

  it('默认走段落', () => {
    expect(convertBlock(block('text'))).toBe('<p>X</p>');
  });

  it('空内容返回 null', () => {
    const el = makeDiv('<div data-block-type="text"></div>');
    expect(convertBlock(el)).toBeNull();
  });
});

describe('collectTableRow', () => {
  it('header 行（data-index="0"）用 <th>', () => {
    const row = makeRow('<tr data-index="0"><td>列A表头</td><td>列B</td></tr>');
    expect(collectTableRow(row)).toBe('<tr><th>列A表头</th><th>列B</th></tr>');
  });

  it('普通行用 <td>', () => {
    const row = makeRow('<tr data-index="1"><td>数据1号</td><td>数据2</td></tr>');
    expect(collectTableRow(row)).toBe('<tr><td>数据1号</td><td>数据2</td></tr>');
  });

  it('所有 cell 文本都 ≤2 字符返回 null（过滤空/占位行）', () => {
    const row = makeRow('<tr><td>ab</td><td></td></tr>');
    expect(collectTableRow(row)).toBeNull();
  });
});

describe('isDocxPage', () => {
  it('#docx > div 存在时返回 true', () => {
    const doc = new DOMParser().parseFromString(
      '<html><body><div id="docx"><div></div></div></body></html>',
      'text/html',
    );
    expect(isDocxPage(doc)).toBe(true);
  });

  it('.bear-web-x-container > div 存在时返回 true', () => {
    const doc = new DOMParser().parseFromString(
      '<html><body><div class="bear-web-x-container"><div></div></div></body></html>',
      'text/html',
    );
    expect(isDocxPage(doc)).toBe(true);
  });

  it('都不存在时返回 false', () => {
    const doc = new DOMParser().parseFromString(
      '<html><body><div>other</div></body></html>',
      'text/html',
    );
    expect(isDocxPage(doc)).toBe(false);
  });
});

describe('feishuAdapter end-to-end（列表合并正则）', () => {
  function buildDocxDoc(blocks: string): Document {
    // 模拟飞书 docx 页面结构：#docx > div 作为 scroll container
    // 注意 scrollHeight/clientHeight 在 jsdom 都是 0，scrollAndCollect 会跳过滚动循环
    // 只对初始 snapshot 的内容做断言
    return new DOMParser().parseFromString(
      `<html><body><div id="docx"><div>${blocks}</div></body></html>`,
      'text/html',
    );
  }

  it('相邻 bullet block 合并，异类（bullet→ordered）不合并', async () => {
    const doc = buildDocxDoc(`
      <div data-block-id="1" data-block-type="page"><div class="page-block-content">标题</div></div>
      <div data-block-id="2" data-block-type="bullet"><div class="ace-line"><span data-string="true">a</span></div></div>
      <div data-block-id="3" data-block-type="bullet"><div class="ace-line"><span data-string="true">b</span></div></div>
      <div data-block-id="4" data-block-type="bullet"><div class="ace-line"><span data-string="true">c</span></div></div>
      <div data-block-id="5" data-block-type="ordered"><div class="ace-line"><span data-string="true">1</span></div></div>
      <div data-block-id="6" data-block-type="ordered"><div class="ace-line"><span data-string="true">2</span></div></div>
      <div data-block-id="7" data-block-type="text"><div class="ace-line"><span data-string="true">段落</span></div></div>
    `);

    const result = await feishuAdapter.customExtract!(doc, 'https://x.feishu.cn/docx/x', doc);
    expect(result).not.toBeNull();
    const html = result!.content;

    // 3 个 bullet 合并为单个 <ul>
    expect(html).toContain('<ul><li>a</li><li>b</li><li>c</li></ul>');
    // 2 个 ordered 合并为单个 <ol>
    expect(html).toContain('<ol><li>1</li><li>2</li></ol>');
    // bullet → ordered 不合并（保留 </ul>\n<ol>）
    expect(html).toContain('</ul>\n<ol>');
    // 段落独立
    expect(html).toContain('<p>段落</p>');
  });

  it('非 docx 页面返回 null', async () => {
    const doc = new DOMParser().parseFromString(
      '<html><body><div>not feishu</div></body></html>',
      'text/html',
    );
    const result = await feishuAdapter.customExtract!(doc, 'https://x.feishu.cn/x', doc);
    expect(result).toBeNull();
  });
});
