import DOMPurify from 'isomorphic-dompurify';

export interface SanitizeOptions {
  allowedTags?: string[];
  allowedAttributes?: { [key: string]: string[] };
}

const defaultOptions: SanitizeOptions = {
  allowedTags: ['b', 'i', 'em', 'strong', 'br', 'p'],
  allowedAttributes: {},
};

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeHtml(dirty: string, options: SanitizeOptions = {}): string {
  const opts = { ...defaultOptions, ...options };
  
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: opts.allowedTags,
    ALLOWED_ATTR: [],
    ALLOW_DATA_ATTR: false,
    KEEP_CONTENT: true,
  });
}

/**
 * Sanitize plain text (strips all HTML)
 */
export function sanitizeText(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [],
    KEEP_CONTENT: true,
  });
}

/**
 * Escape HTML special characters
 */
export function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  return text.replace(/[&<>"'/]/g, (char) => map[char]);
}

