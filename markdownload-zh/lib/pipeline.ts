/**
 * Main pipeline orchestrator
 *
 * Composes four stages: Preprocess → Extract → Convert → Format
 */
import type { PipelineResult } from './types';
import { getSiteAdapter } from './sites';
import { preprocessDOM } from './preprocess';
import { extractContent } from './extract';
import { convertToMarkdown } from './convert';
import { formatMarkdown } from './format';
import { detectDocFramework } from './sites/adapters/generic-docs';

/**
 * Run the full extraction pipeline
 *
 * @param doc Working document (cloned, for DOM mutations)
 * @param url Page URL
 * @param sourceDoc Original document (optional, for Shadow DOM reading)
 * @param onMark Optional mark callback (for diagnostics), triggered at each stage
 */
export async function runPipeline(
  doc: Document,
  url: string,
  sourceDoc?: Document,
  onMark?: (name: string) => void
): Promise<PipelineResult> {
  const mark = onMark || (() => {});
  try {
    mark('pl_start');
    // Get site adapter (URL matching + DOM detection)
    let adapter = getSiteAdapter(url, doc);
    mark('pl_adapter');

    // Stage 1: Preprocess (non-fatal on failure)
    try {
      await preprocessDOM(doc, url, adapter);
    } catch (e) {
      console.warn('[Markdownload] Stage 1 (preprocess) failed:', e);
    }
    mark('pl_preprocess');

    // If URL didn't match an adapter, re-detect using DOM after preprocessing
    if (!adapter) {
      const docAdapter = detectDocFramework(doc);
      if (docAdapter) {
        adapter = docAdapter;
        // Run the doc framework's removeSelectors as a supplement
        if (adapter.removeSelectors && adapter.removeSelectors.length > 0) {
          try {
            doc.querySelectorAll(adapter.removeSelectors.join(', ')).forEach((el) => el.remove());
          } catch (e) {
            console.warn('[Markdownload] doc framework removeSelectors failed:', e);
          }
        }
      }
    }

    // Stage 2: Extract (core stage, pass sourceDoc for Shadow DOM sites)
    const extracted = await extractContent(doc, url, adapter, sourceDoc);
    mark('pl_extract');
    if (!extracted) {
      return { success: false, error: 'NO_CONTENT' };
    }

    // Stage 3: Convert (pass url for lazy-loaded image relative path normalization)
    const markdown = convertToMarkdown(extracted.html, url);
    mark('pl_convert');

    // Stage 4: Format
    const formatted = formatMarkdown(markdown);
    mark('pl_format');

    return {
      success: true,
      data: {
        title: extracted.title || doc.title || 'Untitled',
        markdown: formatted,
        url,
        siteName: extracted.siteName,
      },
    };
  } catch (error) {
    console.error('[Markdownload] Pipeline error:', error);
    return {
      success: false,
      error: 'EXTRACTION_FAILED',
    };
  }
}
