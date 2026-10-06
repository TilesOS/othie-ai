import { describe, expect, it } from "vitest";
import { hasLexicalOverlap, meaningfulTerms } from "../src/retrieval/terms.js";

describe("lexical relevance", () => {
  it("does not retrieve a policy solely because a repository prompt says do not use tools", () => {
    const query = "The repository function double(n) returns n * 2. What is double(21)? Reply with the number only. Do not use tools.";
    expect(hasLexicalOverlap("Canary enterprise support policy requires the first response within eleven hours. This is not a resolution deadline.", meaningfulTerms(query))).toBe(false);
  });
  it("does not use shared durations as the sole relevance signal", () => {
    expect(hasLexicalOverlap("Support tickets require acknowledgement within thirty minutes.", meaningfulTerms("median took seventeen minutes"))).toBe(false);
    expect(hasLexicalOverlap("Support tickets require acknowledgement within thirty minutes.", meaningfulTerms("support acknowledgement time"))).toBe(true);
  });
  it("still finds a scoped negated policy by its subject", () => {
    expect(hasLexicalOverlap("Employees must not enable telemetry without consent.", meaningfulTerms("Should telemetry not be enabled?"))).toBe(true);
  });
});
