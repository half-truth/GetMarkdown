export default defineBackground(() => {
  console.log('GetMarkdown started');

  // Register event listener to keep Service Worker alive
  chrome.runtime.onInstalled.addListener((details) => {
    console.log('GetMarkdown installed/updated:', details.reason);
  });
});
