export const DOC_KEYWORDS = [
  'docs',
  'documentation',
  'manual',
  'guide',
  'api',
  'reference',
  'help',
  'tutorial',
  'learn',
  'examples',
  'ref'
];

export function isDocumentationSite(url: string): boolean {
  const lowerUrl = url.toLowerCase();
  return DOC_KEYWORDS.some(keyword => lowerUrl.includes(keyword));
}

export function shouldShowHelpPrompt(url: string): boolean {
  return isDocumentationSite(url);
}
