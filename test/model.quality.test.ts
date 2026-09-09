import { describe, it } from "vitest";

describe.skipIf(process.env.RUN_OTHIE_MODEL_TESTS!=="1")("real-model quality",()=>{
  it.todo("runs the labeled retrieval/rule set against configured Ollama models and records model identity, license review, relevance, lost qualifiers, unsupported rules, contradictions, and latency");
});
