const FORBIDDEN_CHARS = /[\/\\:*?"<>|]/g;

// Windows reserved filenames
const WINDOWS_RESERVED = /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i;

/**
 * Clean filename to make it conform to file system and Vault rules
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || filename.trim() === '') {
    return 'untitled';
  }

  let sanitized = filename
    .trim()
    // Replace forbidden characters
    .replace(FORBIDDEN_CHARS, '-')
    // Remove path traversal (including .. and multiple slashes)
    .replace(/\.\./g, '')
    .replace(/\/+/g, '-')
    .replace(/^-+/, '')
    // Replace multiple consecutive - with single
    .replace(/-+/g, '-')
    // Remove leading/trailing -
    .replace(/^-+|-+$/g, '')
    .trim();

  // Handle Windows reserved names
  if (WINDOWS_RESERVED.test(sanitized)) {
    sanitized = '_' + sanitized;
  }

  // Truncate to 200 chars (Chinese titles are usually long, 50 chars is not enough)
  if (sanitized.length > 200) {
    sanitized = sanitized.substring(0, 200).trim().replace(/-+$/, '');
  }

  return sanitized || 'untitled';
}
