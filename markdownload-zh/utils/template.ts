import type { TemplateData } from '@/types';

/**
 * Default template - conforms to user Vault Frontmatter spec
 */
export const DEFAULT_TEMPLATE = `
---
title: "{{title}}"
source: {{url}}
---

{{content}}
`;

/**
 * Escape special characters in YAML double-quoted strings
 */
function escapeYamlQuoted(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
}

/**
 * Render template (single pass, prevents replacement results from being reprocessed by subsequent patterns)
 */
export function renderTemplate(template: string, data: TemplateData): string {
const replacements: Record<string, string> = {
    title: escapeYamlQuoted(data.title),
    url: data.url,
    content: data.content,
  };

  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    return key in replacements ? replacements[key] : match;
  });
}
