/** Table hard limit: skip rowspan expansion when exceeding this number of rows/columns/cells, only do basic cleanup */
const MAX_ROWS = 500;
const MAX_COLS = 50;
const MAX_CELLS = 10_000;

/**
 * Generic table preprocessor
 *
 * Processing strategy:
 * 1. Remove all interfering attributes (table and child elements)
 * 2. Remove colgroup/col (not needed in Markdown)
 * 3. Expand rowspan (copy content to subsequent rows to avoid information loss)
 * 4. Remove colspan (Markdown does not support column merging)
 * 5. Clean up complex nested structures inside cells
 *
 * Large tables (exceeding hard limit) skip rowspan expansion, only do basic attribute cleanup.
 */
export function normalizeTables(doc: Document): void {
  doc.querySelectorAll('table').forEach((table) => {
    // 1. Clean up all attributes on the table element itself
    Array.from(table.attributes).forEach((attr) => table.removeAttribute(attr.name));

    // 2. Remove colgroup/col (meaningless for Markdown)
    table.querySelectorAll('colgroup').forEach((el) => el.remove());

    // 3. Clean up attributes on all child elements (preserve rowspan/colspan for expansion)
    const allTableElements = table.querySelectorAll('thead, tbody, tfoot, tr, th, td');
    allTableElements.forEach((el) => {
      const rowspan = el.getAttribute('rowspan');
      const colspan = el.getAttribute('colspan');
      Array.from(el.attributes).forEach((attr) => el.removeAttribute(attr.name));
      if (rowspan) el.setAttribute('rowspan', rowspan);
      if (colspan) el.setAttribute('colspan', colspan);
    });

    // 4. Expand rowspan (copy content to subsequent rows)
    // Hard limit check: skip rowspan expansion for large tables
    const rows = Array.from(table.rows);
    const firstRowCells = rows[0]?.cells.length || 0;
    const totalCells = rows.length * Math.max(firstRowCells, 1);

    if (rows.length > MAX_ROWS || firstRowCells > MAX_COLS || totalCells > MAX_CELLS) {
      console.warn(
        `[Markdownload] 表格过大 (${rows.length}×${firstRowCells}=${totalCells} cells)，跳过 rowspan 展开`
      );
      // 只移除 rowspan/colspan 属性，不做展开
      table.querySelectorAll('[rowspan], [colspan]').forEach((el) => {
        el.removeAttribute('rowspan');
        el.removeAttribute('colspan');
      });
      return; // 跳过后续的 rowspan 展开和单元格清理
    }

    const grid: (Element | null)[][] = []; // 虚拟网格跟踪占位

    rows.forEach((row, rowIdx) => {
      if (!grid[rowIdx]) grid[rowIdx] = [];

      const cells = Array.from((row as HTMLTableRowElement).cells);
      let cellIdx = 0;
      let gridCol = 0;

      while (cellIdx < cells.length || grid[rowIdx][gridCol]) {
        // 跳过被 rowspan 占用的位置
        while (grid[rowIdx][gridCol]) {
          gridCol++;
        }

        if (cellIdx >= cells.length) break;

        const cell = cells[cellIdx];
        const rowspan = parseInt(cell.getAttribute('rowspan') || '1', 10);
        const colspan = parseInt(cell.getAttribute('colspan') || '1', 10);

        // 在网格中标记占位
        for (let r = 0; r < rowspan; r++) {
          for (let c = 0; c < colspan; c++) {
            if (!grid[rowIdx + r]) grid[rowIdx + r] = [];
            if (r === 0 && c === 0) {
              grid[rowIdx + r][gridCol + c] = cell;
            } else {
              grid[rowIdx + r][gridCol + c] = cell; // 标记为被占用
              // 对于 rowspan > 1 的情况，在后续行插入重复单元格
              if (r > 0 && c === 0) {
                const newCell = doc.createElement(cell.tagName.toLowerCase());
                newCell.textContent = cell.textContent; // 复制内容
                // 找到正确的插入位置
                const targetRow = rows[rowIdx + r] as HTMLTableRowElement | undefined;
                if (targetRow) {
                  const targetCells = Array.from(targetRow.cells);
                  let insertBefore: Element | null = null;
                  let currentCol = 0;
                  for (const tc of targetCells) {
                    if (currentCol >= gridCol) {
                      insertBefore = tc;
                      break;
                    }
                    currentCol++;
                  }
                  if (insertBefore) {
                    targetRow.insertBefore(newCell, insertBefore);
                  } else {
                    targetRow.appendChild(newCell);
                  }
                }
              }
            }
          }
        }

        // 移除 rowspan/colspan 属性
        cell.removeAttribute('rowspan');
        cell.removeAttribute('colspan');

        gridCol += colspan;
        cellIdx++;
      }
    });

    // 5. 确保表格有表头（GFM 要求）
    // 如果没有 thead，将第一行的 td 转换为 th 并包装在 thead 中
    if (!table.querySelector('thead')) {
      const firstRow = table.querySelector('tr');
      if (firstRow) {
        // 将 td 转换为 th（使用 DOM 方法移动子节点）
        firstRow.querySelectorAll('td').forEach((td) => {
          const th = doc.createElement('th');
          while (td.firstChild) {
            th.appendChild(td.firstChild);
          }
          td.replaceWith(th);
        });
        // 创建 thead 并移动第一行
        const thead = doc.createElement('thead');
        thead.appendChild(firstRow);
        // 确保 tbody 存在并在 thead 之后
        let tbody = table.querySelector('tbody');
        if (!tbody) {
          tbody = doc.createElement('tbody');
          // 移动剩余的 tr 到 tbody
          table.querySelectorAll('tr').forEach((tr) => tbody!.appendChild(tr));
        }
        table.insertBefore(thead, table.firstChild);
        if (!table.contains(tbody)) {
          table.appendChild(tbody);
        }
      }
    }

    // 6. 清理单元格内容
    table.querySelectorAll('th, td').forEach((cell) => {
      // a. Slate.js 编辑器等复杂结构 → 提取纯文本
      const slateEditor = cell.querySelector('[data-slate-editor="true"]');
      if (slateEditor) {
        const text = (slateEditor as HTMLElement).innerText || slateEditor.textContent || '';
        while (cell.firstChild) cell.removeChild(cell.firstChild);
        const lines = text.trim().split('\n');
        lines.forEach((line, idx) => {
          if (idx > 0) cell.appendChild(doc.createElement('br'));
          cell.appendChild(doc.createTextNode(line));
        });
        return;
      }

      // b. 块级元素扁平化
      const blocks = cell.querySelectorAll('div, p');
      blocks.forEach((block, idx) => {
        if (idx > 0 && block.parentNode === cell) {
          cell.insertBefore(doc.createElement('br'), block);
        }
        while (block.firstChild) {
          block.parentNode?.insertBefore(block.firstChild, block);
        }
        block.remove();
      });

      // c. 移除 span 包装
      cell.querySelectorAll('span').forEach((span) => {
        while (span.firstChild) {
          span.parentNode?.insertBefore(span.firstChild, span);
        }
        span.remove();
      });
    });
  });
}
