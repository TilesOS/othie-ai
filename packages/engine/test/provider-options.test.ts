import { afterEach, expect, it, vi } from "vitest";
import { HttpModelProvider } from "../src/providers/http.js";
import { qualityOptionsSchema } from "../src/evaluation/model-quality.js";

afterEach(() => vi.unstubAllGlobals());

it("sends explicit zero sampling values in the runtime's expected fields and leaves defaults absent", async () => {
  const request = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({
    message: { content: "{}" }, choices: [{ message: { content: "{}" } }],
  })));
  vi.stubGlobal("fetch", request);
  for (const kind of ["ollama", "openai_compatible"] as const) {
    const provider = new HttpModelProvider("test", { id: "test", kind, base_url: "http://127.0.0.1:11434", allowed_redirect_origins: [] });
    await provider.generateJson([], "installed-model", {}, new AbortController().signal, { thinking: false, temperature: 0, seed: 0 });
    const body = JSON.parse(request.mock.calls.at(-1)![1]!.body as string);
    expect(kind === "ollama" ? body.options : body).toMatchObject({ temperature: 0, seed: 0 });
    expect(kind === "ollama" ? body.temperature : body.options).toBeUndefined();
    await provider.generateJson([], "installed-model", {}, new AbortController().signal);
    const defaults = JSON.parse(request.mock.calls.at(-1)![1]!.body as string);
    expect(defaults.options).toBeUndefined(); expect(defaults.seed).toBeUndefined(); expect(defaults.temperature).toBeUndefined();
  }
});

it("rejects invalid evaluation settings before starting model work", () => {
  expect(qualityOptionsSchema.parse({ temperature: 0, seed: 0 })).toEqual({ temperature: 0, seed: 0, hook_deadline_ms: 2_000 });
  for (const settings of [{ temperature: NaN }, { temperature: -1 }, { temperature: 3 },
    { seed: 1.5 }, { seed: -1 }, { seed: 2_147_483_648 }, { unknown: true }]) {
    expect(qualityOptionsSchema.safeParse(settings).success).toBe(false);
  }
});
