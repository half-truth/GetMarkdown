import { generateId, formatDate, formatDateTime } from '@/utils/id';
import { sanitizeFilename } from '@/utils/filename';
import { renderTemplate, DEFAULT_TEMPLATE } from '@/utils/template';
import type { TemplateData, ExtractResult, ExtractedData } from '@/types';

const MARKDOWN_MIME = 'text/markdown;charset=utf-8';

const RESTRICTED_PROTOCOLS = [
  'chrome://',
  'chrome-extension://',
  'edge://',
  'brave://',
  'about:',
  'file://',
];

// DOM 元素
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

// 会话级状态：ID 和日期只生成一次
let sessionId: string;
let sessionDate: string;
let sessionCapturedAt: string;
let currentData: ExtractedData | null = null;

async function init() {
  showLoading();

  // 生成会话级 ID 和日期（整个会话只生成一次）
  sessionId = generateId();
  sessionDate = formatDate();
  sessionCapturedAt = formatDateTime();

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab.id || !tab.url) {
      throw new Error('无法获取当前标签页');
    }

    // 检查是否为 chrome:// 或其他受限页面
    if (RESTRICTED_PROTOCOLS.some((p) => tab.url!.startsWith(p))) {
      throw new Error('无法在此页面使用扩展');
    }

    // 生成唯一 requestId 防止读取到过期结果
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    // 清除旧结果 + 写入 requestId
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (rid: string) => {
        delete window.__markdownload_extracted;
        window.__markdownload_requestId = rid;
      },
      args: [requestId],
    });

    // 注入 content script 文件（包含 Readability.js 和 Turndown）
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['extractor.js'],
    });

    // 等待提取结果：优先事件驱动，保留轮询作 fallback
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

        // 事件驱动：监听 extractor 完成信号
        const messageListener = (msg: unknown) => {
          const m = msg as { type?: string; requestId?: string } | null;
          if (m?.type === '__markdownload_done' && m?.requestId === requestId) {
            readResult().then((r) => settle(r || undefined));
          }
        };
        chrome.runtime.onMessage.addListener(messageListener);

        // 轮询 fallback（每 200ms，最多 10 秒）
        (async () => {
          const maxAttempts = 50;
          for (let i = 0; i < maxAttempts && !settled; i++) {
            const r = await readResult();
            if (r) { settle(r); return; }
            await new Promise((w) => setTimeout(w, 200));
          }
          settle(undefined);
        })();
      });
    };

    const result = await waitForResult();

    if (!result || !result.success || !result.data) {
      throw new Error(result?.error?.message || '提取失败');
    }

    currentData = result.data;
    showMain();

    titleInput.value = currentData.title;
    updatePreview();
    updateStatus(`来源: ${new URL(currentData.url).hostname}`);
  } catch (error) {
    showError(error instanceof Error ? error.message : '未知错误');
  }
}

function createTemplateData(): TemplateData | null {
  if (!currentData) return null;
  return {
    title: titleInput.value || currentData.title,
    url: currentData.url,
    date: sessionDate,
    id: sessionId,
    content: currentData.markdown,
    siteName: currentData.siteName,
    capturedAt: sessionCapturedAt,
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
  wordCountEl.textContent = `${markdown.length} 字符`;
}

// 下载处理：优先通过 Content Script 注入到目标页面下载（绕过 Chrono 拦截）
// 降级链：Content Script 注入 → chrome.downloads → <a download> 兜底
async function handleDownload() {
  if (!currentData) return;

  const title = titleInput.value || currentData.title || 'untitled';
  const filename = sanitizeFilename(title);
  const markdown = getFullMarkdown();

  // ===== 优先：Content Script 注入下载（绕过 Chrono）=====
  // 原理：在目标网页上下文中创建 blob URL，其 origin 为网页域名（如 blob:https://example.com/...）
  // 而非扩展域名（blob:chrome-extension://...），Chrono 不会拦截此类下载
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.id) throw new Error('无法获取标签页');

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
        // 延迟释放 Blob URL：Content Script 上下文无法用 onChanged 监听，
        // 使用 60s 超时确保大文件和 saveAs 对话框场景有足够时间完成下载
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      args: [markdown, `${filename}.md`, MARKDOWN_MIME],
    });

    updateStatus('✅ 下载成功');
    return;
  } catch (err) {
    console.warn('[MarkDownload] Content Script 注入下载失败, 降级到 chrome.downloads:', err);
  }

  // ===== 降级 1：chrome.downloads（可能被 Chrono 改名）=====
  const blob = new Blob([markdown], { type: MARKDOWN_MIME });
  const blobUrl = URL.createObjectURL(blob);

  try {
    const downloadId = await chrome.downloads.download({
      url: blobUrl,
      filename: `${filename}.md`,
      saveAs: false,
    });

    let cleaned = false;
    // 先设置安全超时，确保即使 addListener 抛异常也能清理 Blob URL
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

    updateStatus('✅ 下载成功');
  } catch {
    // ===== 降级 2：<a download> 兜底 =====
    try {
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${filename}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);

      updateStatus('✅ 下载成功');
    } catch (error) {
      URL.revokeObjectURL(blobUrl);
      updateStatus(`❌ 下载失败: ${error}`);
    }
  }
}

async function handleCopy() {
  const markdown = getFullMarkdown();

  try {
    await navigator.clipboard.writeText(markdown);
    updateStatus('✅ 已复制到剪贴板');
  } catch (error) {
    updateStatus('❌ 复制失败');
  }
}

// UI 状态切换
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

// 事件绑定
titleInput.addEventListener('input', updatePreview);
btnDownload.addEventListener('click', handleDownload);
btnCopy.addEventListener('click', handleCopy);
btnRetry.addEventListener('click', init);

// 启动
init();
