/**
 * Content Extraction Script
 *
 * Programmatically injected via chrome.scripting.executeScript.
 * All business logic has been migrated to lib/ modules; this file is just the entry point.
 *
 * Results are passed through window.__markdownload_extracted,
 * including requestId to prevent reading stale results.
 */
import { runPipeline } from '@/lib/pipeline';

export default defineUnlistedScript(async () => {
  const marks: Record<string, number> = {};
  const mark = (name: string) => {
    marks[name] = Date.now();
  };

  mark('ex_start');

  // Read requestId set by Popup (used for race-condition prevention)
  const requestId = window.__markdownload_requestId || '';

  const cloned = document.cloneNode(true) as Document;
  mark('ex_clone_done');

  const result = await runPipeline(
    cloned,
    window.location.href,
    document, // Original document, used to read shadowRoot on Shadow DOM sites
    mark
  );
  mark('ex_pipeline_done');

  window.__markdownload_extracted = {
    requestId,
    success: result.success,
    data: result.data,
    error: result.error
      ? { code: result.error as 'NO_CONTENT' | 'EXTRACTION_FAILED', message: result.error === 'NO_CONTENT' ? 'Could not extract article content — page may not contain a readable article' : 'Extraction failed' }
      : undefined,
    _perf: marks,
  };

  // Notify Popup that extraction is complete (event-driven, faster than polling)
  try {
    chrome.runtime.sendMessage({ type: '__markdownload_done', requestId });
  } catch {
    // chrome.runtime may not be available in some injection contexts; fall back to polling
  }
});
