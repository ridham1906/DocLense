import OpenAI from 'openai';
import {config} from 'dotenv'
config();

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  throw new Error('Missing OPENAI_API_KEY environment variable');
}

export const openai = new OpenAI({ apiKey });

export function chunkText(text: string, chunkSize = 1000, overlap = 200): string[] {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];

  const chunks: string[] = [];
  let start = 0;

  while (start < normalized.length) {
    const end = Math.min(start + chunkSize, normalized.length);
    chunks.push(normalized.slice(start, end));
    if (end === normalized.length) break;
    start = end - overlap;
    if (start < 0) start = 0;
  }

  return chunks;
}

export async function embedText(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });

  const [item] = response.data;
  if (!item) throw new Error('Embedding response missing data');
  return item.embedding;
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: texts,
  });

  if (response.data.length !== texts.length) {
    throw new Error('Embedding batch response length mismatch');
  }

  return response.data.map((item) => item.embedding);
}
