/**
 * Pipeline + Site Adapter internal types
 */

/**
 * Site adapter interface
 */
export interface SiteAdapter {
  id: string;
  match: string | RegExp | ((url: string) => boolean);

  // Stage 1: Preprocess
  removeSelectors?: string[];
  preprocess?: (doc: Document, url: string) => Promise<void> | void;

  // Stage 2: Extract
  fallbackSelectors?: string[];
  /** Whether the original document is needed (for Shadow DOM reading) */
  needsSourceDoc?: boolean;
  customExtract?: (
    doc: Document,
    url: string,
    sourceDoc?: Document
  ) =>
    | Promise<{ title: string; content: string } | null>
    | { title: string; content: string }
    | null;

  siteName?: string;
}

/**
 * Pipeline output result
 */
export interface PipelineResult {
  success: boolean;
  data?: {
    title: string;
    markdown: string;
    url: string;
    siteName?: string;
  };
  error?: string;
}
