import { execFile } from "node:child_process";
import { access, mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { expect, it } from "vitest";

const execute = promisify(execFile);

it("rejects ambiguous native and latency CLI invocations before creating evidence", async () => {
  const root = await mkdtemp(join(tmpdir(), "othie-evaluation-arguments-"));
  try {
    for (const name of ["native-hooks", "hook-latency", "hook-default-latency", "native-agent"]) {
      const compiled = fileURLToPath(new URL(`../dist/src/evaluation/${name}.js`, import.meta.url));
      await access(compiled);
      const base = name === "native-hooks" ? ["--host", "codex"] : [];
      const out = join(root, name, "evidence");
      for (const args of [
        ["--out", out, "--deadline-mss", "1"],
        ["--out", out, "--out", "duplicate"],
        ["--out", out, "--repeats"],
        ["--out", "--repeats", "1"],
        ["--out", out, "positional"],
      ]) {
        await expect(execute(process.execPath, [compiled, ...base, ...args], { timeout: 5_000 }))
          .rejects.toMatchObject({ code: 1, stderr: expect.stringMatching(/native acceptance argument|native agent argument|requires a value|check arguments/) });
        expect(await readdir(root)).toEqual([]);
      }
    }
  } finally { await rm(root, { recursive: true, force: true }); }
});
