/**
 * Structure of extracted content
 */
export interface ExtractedContent {
  title: string;
  content: string; // HTML format
  excerpt: string;
  byline: string;
  siteName: string;
}

/**
 * Template data
 */
export interface TemplateData {
  title: string;
  url: string;
  content: string; // Markdown format
}

/**
 * Extracted result data
 */
export interface ExtractedData {
  title: string;
  markdown: string;
  url: string;
  siteName?: string;
}

/**
 * Extraction result message (unified type for communication between extractor and popup)
 */
export interface ExtractResult {
  requestId?: string;
  success: boolean;
  data?: ExtractedData;
  error?: {
    code: 'PAGE_NOT_ACCESSIBLE' | 'EXTRACTION_FAILED' | 'TIMEOUT' | 'NO_CONTENT';
    message: string;
  };
  /** Phase marker (Date.now() ms), for performance analysis, diagnostic only */
  _perf?: Record<string, number>;
}

/**
 * @deprecated Use ExtractResult instead
 */
export type ExtractionResult = ExtractResult;

/**
 * Global Window extension (for communication between extractor and popup)
 */
declare global {
  interface Window {
    __markdownload_extracted?: ExtractResult;
    __markdownload_requestId?: string;
  }
}
