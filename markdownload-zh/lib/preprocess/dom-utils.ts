/**
 * DOM utility functions
 *
 * Migrated as-is from extractor.unlisted.ts:
 * - safeQuerySelectorAll()
 * - safeRemoveElements()
 */

/**
 * Safely execute querySelectorAll, handling unsupported selectors (e.g. :has())
 */
export function safeQuerySelectorAll(doc: Document, selectors: string[]): Element[] {
  const elements: Element[] = [];
  for (const selector of selectors) {
    try {
      doc.querySelectorAll(selector).forEach((el) => elements.push(el));
    } catch {
      // Selector not supported (e.g. some browsers don't support :has()), silently skip
      console.debug(`[Markdownload] Unsupported selector skipped: ${selector}`);
    }
  }
  return elements;
}

/**
 * Safely remove elements, using safeQuerySelectorAll to handle potentially unsupported selectors
 */
export function safeRemoveElements(doc: Document, selectors: string[]): void {
  safeQuerySelectorAll(doc, selectors).forEach((el) => el.remove());
}
