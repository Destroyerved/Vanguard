/**
 * VANGUARD — Google Gemini client.
 *
 * Deliberately dependency-free: a direct fetch against the Generative Language
 * REST API rather than an SDK. Three reasons, all of them hackathon-relevant:
 *   - one fewer package to break on a fresh clone,
 *   - no SDK version drift against a moving API surface,
 *   - the exact wire format is visible in this file, so a judge asking
 *     "what are you actually sending the model?" gets a direct answer.
 *
 * Every call uses `responseMimeType: application/json` with an explicit
 * `responseSchema`, so the model returns parseable structured output rather
 * than prose that has to be scraped. This is what makes the grounding check in
 * `grounding.ts` possible at all.
 */

import { GEMINI_MAX_RETRIES, GEMINI_TIMEOUT_MS } from '../config/constants.js';
import { env } from '../config/env.js';
import { createLogger } from '../util/logger.js';

const log = createLogger('ai:gemini');

/** Subset of JSON Schema that the Gemini structured-output API accepts. */
export interface GeminiSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'integer' | 'boolean';
  description?: string;
  properties?: Record<string, GeminiSchema>;
  items?: GeminiSchema;
  required?: string[];
  enum?: string[];
  nullable?: boolean;
}

export interface GenerateOptions {
  /** System-level instruction establishing role and hard rules. */
  systemInstruction: string;
  /** The user-turn prompt carrying the evidence pack. */
  prompt: string;
  /** Schema the response must conform to. */
  schema: GeminiSchema;
  /** Sampling temperature. Low by default — this is analysis, not prose. */
  temperature?: number;
  maxOutputTokens?: number;
}

export interface GenerateResult<T> {
  data: T;
  model: string;
  latencyMs: number;
  /** Token accounting, when the API reports it. */
  usage?: { promptTokens?: number; responseTokens?: number };
}

/** Thrown for any failure that should trigger the deterministic fallback. */
export class GeminiError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'GeminiError';
  }
}

interface GeminiApiResponse {
  candidates?: {
    content?: { parts?: { text?: string }[] };
    finishReason?: string;
  }[];
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  error?: { message?: string; status?: string; code?: number };
}

/** True when a live Gemini key is configured. */
export const isGeminiAvailable = (): boolean => env.aiEnabled;

/**
 * Call Gemini and parse a structured JSON response.
 * Retries transient failures with exponential backoff; throws `GeminiError`
 * when every attempt is exhausted, which every caller handles by falling back
 * to the deterministic engine.
 */
export async function generateStructured<T>(
  options: GenerateOptions,
): Promise<GenerateResult<T>> {
  if (!env.aiEnabled) {
    throw new GeminiError('GEMINI_API_KEY is not configured', false);
  }

  const url =
    `${env.geminiBaseUrl}/models/${env.geminiModel}:generateContent` +
    `?key=${encodeURIComponent(env.geminiApiKey)}`;

  const body = {
    systemInstruction: { parts: [{ text: options.systemInstruction }] },
    contents: [{ role: 'user', parts: [{ text: options.prompt }] }],
    generationConfig: {
      temperature: options.temperature ?? 0.2,
      maxOutputTokens: options.maxOutputTokens ?? 4_096,
      responseMimeType: 'application/json',
      responseSchema: options.schema,
    },
  };

  let lastError: GeminiError = new GeminiError('No attempt was made', false);

  for (let attempt = 0; attempt <= GEMINI_MAX_RETRIES; attempt++) {
    const started = Date.now();

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
      });

      const json = (await response.json()) as GeminiApiResponse;

      if (!response.ok) {
        const message = json.error?.message ?? `HTTP ${response.status}`;
        // 429 and 5xx are worth retrying; 4xx client errors are not.
        const retryable = response.status === 429 || response.status >= 500;
        throw new GeminiError(`Gemini API error: ${message}`, retryable);
      }

      const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        const finish = json.candidates?.[0]?.finishReason ?? 'unknown';
        throw new GeminiError(`Gemini returned no content (finishReason: ${finish})`, true);
      }

      let data: T;
      try {
        data = JSON.parse(text) as T;
      } catch {
        // Structured output should make this impossible, but a truncated
        // response can still produce invalid JSON. Retry rather than crash.
        throw new GeminiError('Gemini returned unparseable JSON', true);
      }

      const latencyMs = Date.now() - started;
      log.debug(`generate ok in ${latencyMs}ms (attempt ${attempt + 1})`);

      return {
        data,
        model: env.geminiModel,
        latencyMs,
        usage: {
          promptTokens: json.usageMetadata?.promptTokenCount,
          responseTokens: json.usageMetadata?.candidatesTokenCount,
        },
      };
    } catch (error) {
      lastError =
        error instanceof GeminiError
          ? error
          : new GeminiError(
              error instanceof Error ? error.message : String(error),
              // Timeouts and network resets are transient.
              true,
            );

      log.warn(`attempt ${attempt + 1} failed: ${lastError.message}`);
      if (!lastError.retryable || attempt === GEMINI_MAX_RETRIES) break;

      // Exponential backoff: 400ms, 800ms.
      await sleep(400 * 2 ** attempt);
    }
  }

  throw lastError;
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
