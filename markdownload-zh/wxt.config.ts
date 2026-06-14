import { defineConfig } from 'wxt';
import { resolve } from 'path';

export default defineConfig({
  outDir: resolve(__dirname, '../output'),
  alias: {
    '@': resolve(__dirname, './'),
  },
  manifest: {
    name: 'GetMarkdown',
    description: 'Save web pages as clean Markdown',
    version: '0.1.0',
    permissions: ['activeTab', 'scripting', 'downloads'],
    action: {
      default_title: 'GetMarkdown',
      default_popup: 'popup.html',
      default_icon: {
        16: 'icon/icon-16.png',
        48: 'icon/icon-48.png',
        128: 'icon/icon-128.png',
      },
    },
    icons: {
      16: 'icon/icon-16.png',
      48: 'icon/icon-48.png',
      128: 'icon/icon-128.png',
    },
    web_accessible_resources: [
      {
        resources: ['extractor.js'],
        matches: ['<all_urls>'],
      },
    ],
  },
});
