/**
 * Site adapter registry + matching logic
 */
import type { SiteAdapter } from '../types';

/**
 * Exact hostname match (O(1))
 */
const exactHostMap = new Map<string, SiteAdapter>();

/**
 * Domain suffix match (short array traversal)
 */
const suffixEntries: { suffix: string; adapter: SiteAdapter }[] = [];

/**
 * Regex/function match (short array traversal)
 */
const patternEntries: { match: RegExp | ((url: string) => boolean); adapter: SiteAdapter }[] = [];

/**
 * Register an adapter
 */
export function registerAdapter(adapter: SiteAdapter): void {
  const { match } = adapter;

  if (typeof match === 'string') {
    // Determine if exact hostname or domain suffix
    // If contains / or starts with specific path, use suffixEntries
    if (match.includes('/')) {
      suffixEntries.push({ suffix: match, adapter });
    } else if (match.startsWith('.') || match.includes('.')) {
      // Domain suffix matching
      suffixEntries.push({ suffix: match, adapter });
    } else {
      exactHostMap.set(match, adapter);
    }
  } else {
    patternEntries.push({ match: match as RegExp | ((url: string) => boolean), adapter });
  }
}

/**
 * Batch register adapters
 */
export function registerAdapters(adapters: SiteAdapter[]): void {
  for (const adapter of adapters) {
    registerAdapter(adapter);
  }
}

/**
 * Get matching site adapter
 *
 * Match priority:
 * 1. Exact hostname (O(1))
 * 2. URL contains suffix (short array scan)
 * 3. Regex/function match (short array scan)
 */
export function getSiteAdapter(url: string): SiteAdapter | null {
  let hostname = '';
  try {
    hostname = new URL(url).hostname;
  } catch {
    // URL parse failed, skip exact match
  }

  // 1. Exact hostname
  if (hostname) {
    const exact = exactHostMap.get(hostname);
    if (exact) return exact;
  }

  // 2. Domain suffix match (hostname only, avoid path/query false positives)
  for (const { suffix, adapter } of suffixEntries) {
    if (suffix.includes('/')) {
      // Path match: check hostname + pathname
      try {
        const parsed = new URL(url);
        const hostAndPath = parsed.hostname + parsed.pathname;
        if (hostAndPath.includes(suffix)) return adapter;
      } catch {
        // URL parse failed, skip
      }
    } else {
      // Domain suffix matching：仅对 hostname 操作
      if (hostname === suffix || hostname.endsWith('.' + suffix)) {
        return adapter;
      }
    }
  }

  // 3. Regex/function match
  for (const { match, adapter } of patternEntries) {
    if (match instanceof RegExp) {
      if (match.test(url)) return adapter;
    } else {
      if (match(url)) return adapter;
    }
  }

  return null;
}

/**
 * Clear registry (testing)
 */
export function clearRegistry(): void {
  exactHostMap.clear();
  suffixEntries.length = 0;
  patternEntries.length = 0;
}
