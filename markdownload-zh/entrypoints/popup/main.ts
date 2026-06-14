import { sanitizeFilename } from '@/utils/filename';
import { renderTemplate, DEFAULT_TEMPLATE } from '@/utils/template';
import type { TemplateData, ExtractResult, ExtractedData } from '@/types';

const MARKDOWN_MIME = 'text/markdown;charset=utf-8';

// Poll for extraction results: virtual-scroll sites like Feishu need ~25s max (HARD_CEILING_MS)
const POLL_INTERVAL_MS = 200;
const POLL_TIMEOUT_MS = 30_000;
const MAX_POLL_ATTEMPTS = Math.floor(POLL_TIMEOUT_MS / POLL_INTERVAL_MS);

// ---------- Phase Marks (diagnostic) ----------
const popupMarks: Record<string, number> = {};
const mark = (name: string) => {
  popupMarks[name] = Date.now();
};
mark('popup_ready');

function printPerf(extractorMarks?: Record<string, number>): void {
  const all: Record<string, number> = { ...popupMarks, ...(extractorMarks || {}) };
  const entries = Object.entries(all).sort((a, b) => a[1] - b[1]);
  if (entries.length === 0) return;
  const t0 = entries[0][1];
  const rows = entries.map(([stage, t], i) => ({
    stage,
    'at (ms)': t - t0,
    'delta (ms)': i === 0 ? 0 : t - entries[i - 1][1],
  }));
console.log('[MD-perf] Phase durations (ms, from first mark)');
  console.table(rows);
}

const RESTRICTED_PROTOCOLS = [
  'chrome://',
  'chrome-extension://',
  'edge://',
  'brave://',
  'about:',
  'file://',
];

// DOM Elements
const loadingEl = document.getElementById('loading')!;
const mainEl = document.getElementById('main')!;
const errorEl = document.getElementById('error')!;
const titleInput = document.getElementById('title') as HTMLInputElement;
const previewEl = document.getElementById('preview')!;
const statusEl = document.getElementById('status')!;
const wordCountEl = document.getElementById('word-count')!;
const btnDownload = document.getElementById('btn-download')!;
const btnCopy = document.getElementById('btn-copy')!;
const btnRetry = document.getElementById('btn-retry')!;
const errorMessageEl = document.getElementById('error-message')!;

// Session-level state
let currentData: ExtractedData | null = null;

async function init() {
  mark('init_start');
showLoading();

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    mark('tab_queried');

    if (!tab.id || !tab.url) {
throw new Error('Unable to access current tab');
    }

    // Check for chrome:// or other restricted pages
    if (RESTRICTED_PROTOCOLS.some((p) => tab.url!.startsWith(p))) {
throw new Error('Extension not available on this page');
    }

    // Generate unique requestId to prevent reading stale results
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    // Clear old results + write requestId
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (rid: string) => {
        delete window.__markdownload_extracted;
        window.__markdownload_requestId = rid;
      },
      args: [requestId],
    });
    mark('clear_done');

    // Inject content script file (includes Readability.js and Turndown)
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['extractor.js'],
    });
    mark('inject_done');

    // Wait for extraction: event-driven first, polling as fallback
    const waitForResult = async (): Promise<ExtractResult | undefined> => {
      const readResult = async (): Promise<ExtractResult | null> => {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id! },
          func: (expectedId: string) => {
            const result = window.__markdownload_extracted;
            if (result && result.requestId === expectedId) {
              delete window.__markdownload_extracted;
              delete window.__markdownload_requestId;
              return result;
            }
            return null;
          },
          args: [requestId],
        });
        return results[0]?.result as ExtractResult | null;
      };

      return new Promise<ExtractResult | undefined>((resolve) => {
        let settled = false;
        const settle = (r: ExtractResult | undefined) => {
          if (settled) return;
          settled = true;
          chrome.runtime.onMessage.removeListener(messageListener);
          resolve(r);
        };

        // Event-driven: listen for extractor done signal
        const messageListener = (msg: unknown) => {
          const m = msg as { type?: string; requestId?: string } | null;
          if (m?.type === '__markdownload_done' && m?.requestId === requestId) {
            readResult().then((r) => settle(r || undefined));
          }
        };
        chrome.runtime.onMessage.addListener(messageListener);

        (async () => {
          for (let i = 0; i < MAX_POLL_ATTEMPTS && !settled; i++) {
            const r = await readResult();
            if (r) { settle(r); return; }
            await new Promise((w) => setTimeout(w, POLL_INTERVAL_MS));
          }
          settle(undefined);
        })();
      });
    };

    const result = await waitForResult();
    mark('result_received');

    if (!result || !result.success || !result.data) {
      printPerf(result?._perf);
throw new Error(result?.error?.message || 'Extraction failed');
    }

    currentData = result.data;
    showMain();

    titleInput.value = currentData.title;
    updatePreview();
    mark('preview_rendered');
    updateStatus('');

    printPerf(result._perf);
  } catch (error) {
showError(error instanceof Error ? error.message : 'Unknown error');
  }
}

function createTemplateData(): TemplateData | null {
  if (!currentData) return null;
return {
    title: titleInput.value || currentData.title,
    url: currentData.url,
    content: currentData.markdown,
  };
}

function getFullMarkdown(): string {
  const templateData = createTemplateData();
  if (!templateData) return '';
  return renderTemplate(DEFAULT_TEMPLATE, templateData);
}

let _lastPreview = '';
function updatePreview(): void {
  const markdown = getFullMarkdown();
  if (!markdown || markdown === _lastPreview) return;
  _lastPreview = markdown;

  previewEl.textContent = markdown;
  wordCountEl.textContent = `${markdown.length} chars`;
}

// Download: inject via Content Script to bypass Chrono interception
// Fallback chain: Content Script injection → chrome.downloads → <a download> last resort
async function handleDownload() {
  if (!currentData) return;

  const dlStart = Date.now();
  popupMarks.download_click = dlStart;

  const title = titleInput.value || currentData.title || 'untitled';
  const filename = sanitizeFilename(title);
  const markdown = getFullMarkdown();
  popupMarks.download_markdown_ready = Date.now();

  // ===== Primary: Content Script injection download (bypass Chrono) =====
  // Principle: Create blob URL in the target page context so its origin is the page domain
  // rather than the extension origin, so Chrono won't intercept the download
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.id) throw new Error('Unable to access tab');

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (content: string, fname: string, mime: string) => {
        const blob = new Blob([content], { type: mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fname;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        // Delay releasing Blob URL: Content Script context cannot use onChanged listener,
        // use 60s timeout to ensure large files and saveAs dialogs have enough time
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      args: [markdown, `${filename}.md`, MARKDOWN_MIME],
    });
    popupMarks.download_injected = Date.now();

    console.log(
      `[MD-perf] Download injection: ${popupMarks.download_injected - dlStart}ms ` +
        `(markdown render ${popupMarks.download_markdown_ready - dlStart}ms, ` +
        `executeScript ${popupMarks.download_injected - popupMarks.download_markdown_ready}ms)`
    );

    updateStatus('✅ Download successful');
    return;
  } catch (err) {
    console.warn('[GetMarkdown] Content Script injection download failed, falling back to chrome.downloads:', err);
  }

  // ===== Fallback 1: chrome.downloads (may be intercepted by Chrono) =====
  const blob = new Blob([markdown], { type: MARKDOWN_MIME });
  const blobUrl = URL.createObjectURL(blob);

  try {
    const downloadId = await chrome.downloads.download({
      url: blobUrl,
      filename: `${filename}.md`,
      saveAs: false,
    });

    let cleaned = false;
    // Set safety timeout to ensure Blob URL is released even if addListener throws
    const safetyTimer = setTimeout(() => {
      if (cleaned) return;
      cleaned = true;
      URL.revokeObjectURL(blobUrl);
    }, 60_000);

    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      URL.revokeObjectURL(blobUrl);
      chrome.downloads.onChanged.removeListener(listener);
      clearTimeout(safetyTimer);
    };

    const listener = (delta: chrome.downloads.DownloadDelta) => {
      if (delta.id !== downloadId) return;
      if (
        delta.state?.current === 'complete' ||
        delta.state?.current === 'interrupted'
      ) {
        cleanup();
      }
    };

    chrome.downloads.onChanged.addListener(listener);

    updateStatus('✅ Download successful');
  } catch {
    // ===== Fallback 2: <a download> last resort =====
    try {
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${filename}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);

      updateStatus('✅ Download successful');
    } catch (error) {
      URL.revokeObjectURL(blobUrl);
updateStatus(`❌ Download failed: ${error}`);
    }
  }
}

async function handleCopy() {
  const markdown = getFullMarkdown();

  try {
    await navigator.clipboard.writeText(markdown);
    updateStatus('✅ Copied to clipboard');
  } catch (error) {
    updateStatus('❌ Copy failed');
  }
}

// UI State Management
function showLoading() {
  loadingEl.classList.remove('hidden');
  mainEl.classList.add('hidden');
  errorEl.classList.add('hidden');
}

function showMain() {
  loadingEl.classList.add('hidden');
  mainEl.classList.remove('hidden');
  errorEl.classList.add('hidden');
}

function showError(message: string) {
  loadingEl.classList.add('hidden');
  mainEl.classList.add('hidden');
  errorEl.classList.remove('hidden');
  errorMessageEl.textContent = message;
}

function updateStatus(message: string) {
  statusEl.textContent = message;
}

// Event Binding
titleInput.addEventListener('input', updatePreview);
btnDownload.addEventListener('click', handleDownload);
btnCopy.addEventListener('click', handleCopy);
btnRetry.addEventListener('click', init);

// Start
init();
