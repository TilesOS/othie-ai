export interface JsonMessage { role: "system" | "user"; content: string }

export interface ModelProvider {
  readonly id: string;
  readonly remote: boolean;
  embed(texts: string[], model: string, signal: AbortSignal): Promise<number[][]>;
  generateJson(messages: JsonMessage[], model: string, schema: Record<string, unknown>, signal: AbortSignal, options?: { thinking?: boolean }): Promise<unknown>;
}

export class ProviderError extends Error {
  constructor(message: string, public readonly retryable = true) { super(message); }
}
