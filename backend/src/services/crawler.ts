import { PlaywrightCrawler } from 'crawlee';
import type { Page } from 'playwright';

export interface CrawlResult {
  url: string;
  domain: string;
  title: string;
  content: string;
}

const BLOCKED_EXTENSIONS = /(\.png|\.jpg|\.jpeg|\.gif|\.pdf|\.zip|\.svg)$/i;
const MAIN_CONTENT_SELECTOR = 'main, article, .content, .documentation, .docs, .main-content, [role="main"], [data-docs-root]';
const TEXT_CONTENT_SELECTORS = 'p, div, span, h1, h2, h3, h4, h5, h6, li, td, th, dt, dd, blockquote, pre, code, em, strong, b, i, u, mark, small, big, sub, sup, q, cite, abbr, acronym, dfn, time, address';
const NAVIGATION_SELECTORS = 'nav, header, footer, aside, .sidebar, .navbar, .menu, .navigation, .breadcrumb, .toc, .sidebar-nav, .nav-sidebar, [role="navigation"], [role="banner"], [role="contentinfo"], .skip-link';
const UNWANTED_SELECTORS = 'script, style, noscript, iframe, embed, object, param, source, track, canvas, svg, math, form, input, button, select, textarea, option, optgroup, fieldset, legend, label, meter, progress, output, .advertisement, .ads, .ad, .banner, .popup, .modal, .overlay, .tooltip, .dropdown, .social-share, .comments, .comment-form, .related-posts, .pagination, .pager';

const logger = {
  info(message: string, meta: Record<string, unknown> = {}) {
    console.log(`[crawler] ${message}`, meta);
  },
  warn(message: string, meta: Record<string, unknown> = {}) {
    console.warn(`[crawler] ${message}`, meta);
  },
  error(message: string, meta: Record<string, unknown> = {}) {
    console.error(`[crawler] ${message}`, meta);
  },
};

export class DocumentationCrawler {
  private readonly domain: string;
  private readonly documentationPath: string;
  private readonly startUrlNormalized: string;
  private readonly visited = new Set<string>();

  constructor(startUrl: string) {
    const parsed = new URL(startUrl);
    this.domain = parsed.hostname;
    this.documentationPath = parsed.pathname.endsWith('/') ? parsed.pathname : `${parsed.pathname}/`;
    this.startUrlNormalized = this.normalizeUrl(startUrl);
  }

  async run(maxPages: number = 100): Promise<CrawlResult[]> {
    logger.info('crawl-start', { startUrl: this.startUrlNormalized, maxPages });

    const results: CrawlResult[] = [];

    const crawler = new PlaywrightCrawler({
      launchContext: {
        launchOptions: {
          headless: true,
        },
      },
      maxRequestsPerCrawl: maxPages,
      navigationTimeoutSecs: 45,
      preNavigationHooks: [
        async ({ page }, gotoOptions) => {
          await page.route('**/*', (route) => {
            const type = route.request().resourceType();
            const requestUrl = route.request().url();

            if (['image', 'font', 'media', 'other'].includes(type)) {
              route.abort();
              return;
            }

            if (BLOCKED_EXTENSIONS.test(requestUrl)) {
              route.abort();
              return;
            }

            route.continue();
          });

          gotoOptions.waitUntil = 'domcontentloaded';
        },
      ],
      requestHandler: async ({ request, page, enqueueLinks }) => {
        const currentUrl = this.normalizeUrl(request.loadedUrl ?? request.url);
        if (this.visited.has(currentUrl)) {
          return;
        }

        this.visited.add(currentUrl);
        logger.info('process-url', { url: currentUrl, collected: results.length });

        await page.waitForLoadState('networkidle', { timeout: 7000 }).catch(() => undefined);
        await page.waitForSelector(MAIN_CONTENT_SELECTOR, { timeout: 7000 }).catch(() => undefined);

        const title = await this.extractTitle(page);
        const content = await this.extractContent(page);

        if (!content) {
          logger.warn('empty-content', { url: currentUrl });
        } else {
          results.push({ url: currentUrl, domain: this.domain, title, content });
          logger.info('page-collected', { url: currentUrl, titleLength: title.length, contentLength: content.length });
        }

        const links = await this.collectLinks(page);
        const filtered = links.filter((link) => !this.visited.has(link));
        if (filtered.length > 0) {
          await enqueueLinks({
            urls: filtered,
          });
        }
        logger.info('links-enqueued', { url: currentUrl, newLinks: filtered.length });
      },
      failedRequestHandler: async ({ request, error }) => {
        logger.error('crawl-error', { url: request.url, error });
      },
    });

    await crawler.run([this.startUrlNormalized]);

    logger.info('crawl-complete', { pages: results.length, visited: this.visited.size });

    return results;
  }

  private async extractTitle(page: Page): Promise<string> {
    const title = (await page.title())?.trim();
    if (title) return title;

    const fallback = await page.locator('h1').first().textContent().catch(() => null);
    return (fallback ?? 'Untitled').trim() || 'Untitled';
  }

  private async extractContent(page: Page): Promise<string> {
    return page.evaluate((
      config: {
        mainSelector: string;
        textSelectors: string;
        navigationSelectors: string;
        unwantedSelectors: string;
      }
    ) => {
      const { mainSelector, textSelectors, navigationSelectors, unwantedSelectors } = config;

      // Remove unwanted elements
      const cleanupSelectors = unwantedSelectors.split(', ');
      cleanupSelectors.forEach((sel) => {
        document.querySelectorAll(sel.trim()).forEach((el) => el.remove());
      });

      // Find main content area
      const mainContent = document.querySelector<HTMLElement>(mainSelector);
      const contentRoot = mainContent ?? document.body;

      // Collect text from all text-containing elements within the content root
      const textElements = contentRoot.querySelectorAll(textSelectors);
      const textChunks: string[] = [];

      textElements.forEach((element) => {
      
        const navigationSelector = navigationSelectors.split(', ')[0]?.trim();
        if (navigationSelector && element.closest(navigationSelector)) {
          return;
        }

        // Skip elements with very little text or only whitespace
        const text = element.textContent?.trim();
        if (!text || text.length < 10) {
          return;
        }

        // Skip elements that are likely code examples or scripts
        const tagName = element.tagName.toLowerCase();
        if (tagName === 'pre' && text.length < 50) {
          return;
        }

        // Add appropriate spacing based on element type
        let prefix = '';
        let suffix = ' ';

        if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
          prefix = '\n\n';
          suffix = '\n\n';
        } else if (tagName === 'p') {
          suffix = '\n\n';
        } else if (tagName === 'li') {
          prefix = '• ';
        } else if (tagName === 'blockquote') {
          prefix = '> ';
        }

        textChunks.push(prefix + text + suffix);
      });

      // If no text found in content root, try the whole document body
      if (textChunks.length === 0) {
        const allTextElements = document.querySelectorAll(textSelectors);
        allTextElements.forEach((element) => {
          const text = element.textContent?.trim();
          if (text && text.length > 10) {
            const tagName = element.tagName.toLowerCase();
            let prefix = '';
            let suffix = ' ';

            if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
              prefix = '\n\n';
              suffix = '\n\n';
            } else if (tagName === 'p') {
              suffix = '\n\n';
            } else if (tagName === 'li') {
              prefix = '• ';
            } else if (tagName === 'blockquote') {
              prefix = '> ';
            }

            textChunks.push(prefix + text + suffix);
          }
        });
      }

      // Clean up the text
      const fullText = textChunks.join('').replace(/\s+/g, ' ').trim();

      // Remove excessive whitespace and normalize
      return fullText
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[ \t]+/g, ' ')
        .trim();
    }, {
      mainSelector: MAIN_CONTENT_SELECTOR,
      textSelectors: TEXT_CONTENT_SELECTORS,
      navigationSelectors: NAVIGATION_SELECTORS,
      unwantedSelectors: UNWANTED_SELECTORS
    });
  }

  private async collectLinks(page: Page): Promise<string[]> {
    return page.evaluate(({ domain, path, pattern }: { domain: string; path: string; pattern: string }) => {
      const blocked = new RegExp(pattern, 'i');
      const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]'));
      const collected: string[] = [];

      for (const anchor of anchors) {
        try {
          const absolute = anchor.href.split('#')[0];
          const parsed = new URL(absolute as string);
          if (parsed.hostname !== domain) continue;
          if (!parsed.pathname.startsWith(path)) continue;
          if (blocked.test(parsed.pathname)) continue;
          parsed.hash = '';
          parsed.search = '';
          collected.push(parsed.toString());
        } catch {
          // ignore malformed URLs
        }
      }

      return Array.from(new Set(collected));
    }, { domain: this.domain, path: this.documentationPath, pattern: BLOCKED_EXTENSIONS.source });
  }

  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      parsed.hash = '';
      parsed.search = '';
      return parsed.toString();
    } catch {
      return url;
    }
  }
}
