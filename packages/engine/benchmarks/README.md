# Benchmark records

`macos-apple-m5-pro.json` is a recorded fresh-state lexical-fallback run on the available Apple Silicon machine. Ollama was unavailable, so fallback frequency was 100%; that is useful for the required outage baseline but not a model-latency result.

A Windows x64 machine was not available in this build environment. No Windows numbers are fabricated. Run `npm run benchmark -- --config <path>` on recorded Windows x64 hardware and commit the JSON output before making cross-platform performance claims.

Real-model relevance, extraction quality, licensing review, and synthesis latency belong in the separate `test:models` suite. The configured two-second deadline includes local synthesis queue wait and is not an end-to-end latency promise.
