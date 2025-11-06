import { SystemStatus } from "crawlee";
import { openai } from "./embeddings.ts";
import type { SearchResult } from "./enhancedSearch.ts";
import { Readable } from 'stream';

type Sources = {
  title: string;
  url: string;
};

interface GenerelizedResult {
  answer: string;
  sources: Sources[];
}

const SYSTEM_PROMPT = 
`You are DocLense, an expert documentation assistant.
You must answer the user's question **strictly using only** the information provided in the documentation snippets.
If the information is not present or insufficient, respond exactly with:
"I couldn't find this information in the provided documentation."

Your goal is to produce a clear, concise, and human-readable explanation that is entirely grounded in the provided documentation content. 
Use examples, bullet points, or code snippets if available in the documentation. 
Do not include any external knowledge or assumptions.`;


export class TextGenerelizer {
  /**
   * Generate a unified, human-readable, and documentation-grounded answer.
   */
  async generalizeResult(results: SearchResult[], query: string): Promise<GenerelizedResult> {
    const { cleanedText, sources } = this.cleanText(results);
    const summarizedResult = await this.summarize(query, cleanedText);

    // Fallback if result is empty or unrelated
    const finalAnswer =
      !summarizedResult ||
      summarizedResult.toLowerCase().includes("not found") ||
      summarizedResult.length < 40
        ? "My bad! I couldn't find sufficient information about this topic in the provided documentation."
        : summarizedResult;

    return { answer: finalAnswer, sources };
  }

  /**
   * Stream a unified, human-readable, and documentation-grounded answer.
   */
  async streamResult(results: SearchResult[], query: string): Promise<Readable> {
    const { cleanedText, sources } = this.cleanText(results);
    
    // Create a readable stream
    const stream = new Readable({
      read() {} // We'll push data manually
    });

    try {
      // Send sources first
      stream.push(`data: ${JSON.stringify({
        type: 'sources',
        content: sources
      })}\n\n`);

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: `User query: ${query}

Documentation snippets (use only the text between <<<DOC>>> and <<<ENDDOC>>>):

<<<DOC>>>
${cleanedText}
<<<ENDDOC>>>`,
          },
        ],
        stream: true, // Enable streaming
      });

      // Stream the response
      for await (const chunk of completion) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          stream.push(`data: ${JSON.stringify({
            type: 'chunk',
            content: content
          })}\n\n`);
        }
      }

      // Send end marker
      stream.push(`data: ${JSON.stringify({
        type: 'end'
      })}\n\n`);
      stream.push(null); // End the stream
    } catch (err) {
      console.error("STREAMING ERROR:", err);
      stream.push(`data: ${JSON.stringify({
        type: 'error',
        content: err instanceof Error ? err.message : 'Something went wrong during streaming'
      })}\n\n`);
      stream.push(null); // End the stream
    }

    return stream;
  }

  /**
   * Summarize retrieved documentation text based on the user's query.
   * Ensures the model uses ONLY provided documentation content.
   */
  private async summarize(query: string, cleanedText: string) {
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: `User query: ${query}

Documentation snippets (use only the text between <<<DOC>>> and <<<ENDDOC>>>):

<<<DOC>>>
${cleanedText}
<<<ENDDOC>>>`,
          },
        ],
      });

      return completion?.choices?.[0]?.message?.content?.trim() ?? "";
    } catch (err) {
      console.error("SUMMARIZATION ERROR:", err);
      throw new Error(
        err instanceof Error
          ? err.message
          : "SUMMARIZATION_ERR: Something went wrong"
      );
    }
  }

  /**
   * Clean text and remove duplicate documentation sources.
   */
  private cleanText(results: SearchResult[]) {
    const sources = results.map((r) => ({
      title: r.title,
      url: r.url,
    }));

    // Remove duplicates by URL
    const uniqueSources = Array.from(
      new Map(sources.map((src) => [src.url, src])).values()
    );

    // Merge and normalize text
    const cleanedText = results
      .map((r) => r.content)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    return { cleanedText, sources: uniqueSources };
  }
}