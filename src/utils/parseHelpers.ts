import * as cheerio from 'cheerio';

export interface ParsedContent {
  title: string;
  content: string;
  rawHtml?: string;
}

export function parseContent(html: string, selectors: { title: string; content: string }): ParsedContent {
  const $ = cheerio.load(html);
  
  const title = $(selectors.title).first().text().trim();
  const content = $(selectors.content).first().text().trim();
  
  return {
    title,
    content,
    rawHtml: html, // Include raw HTML for debugging
  };
}

export function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/\n+/g, '\n') // Replace multiple newlines with single newline
    .trim();
} 