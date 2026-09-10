import { countTokens as countO200k } from "gpt-tokenizer/encoding/o200k_base";
import { countTokens as countCl100k } from "gpt-tokenizer/encoding/cl100k_base";

export type SupportedTokenizer = "o200k_base" | "cl100k_base";

export function countTokens(text: string, tokenizer: SupportedTokenizer): number {
  return tokenizer === "cl100k_base" ? countCl100k(text) : countO200k(text);
}

export function tokenizerIsEstimate(hostModel: string | undefined, tokenizer: SupportedTokenizer): boolean {
  if (!hostModel) return false;
  if (hostModel.startsWith("gpt-5") || hostModel.startsWith("gpt-4o") || hostModel.startsWith("o")) return tokenizer !== "o200k_base";
  if (hostModel.includes("embedding-3") || hostModel.startsWith("gpt-4")) return tokenizer !== "cl100k_base";
  return true;
}
