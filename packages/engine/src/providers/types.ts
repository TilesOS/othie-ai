export interface JsonMessage { role: "system" | "user"; content: string }

export interface GenerationOptions {
  thinking?: boolean;
  temperature?: number;
  seed?: number;
}

export interface ModelProvider {
  readonly id: string;
  readonly remote: boolean;
  embed(texts: string[], model: string, signal: AbortSignal): Promise<number[][]>;
  generateJson(messages: JsonMessage[], model: string, schema: Record<string, unknown>, signal: AbortSignal, options?: GenerationOptions): Promise<unknown>;
}

export class ProviderError extends Error {
  constructor(message: string, public readonly retryable = true) { super(message); }
}
