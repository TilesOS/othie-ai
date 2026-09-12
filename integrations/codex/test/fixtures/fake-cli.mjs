import { readFile } from "node:fs/promises";

let prompt = "";
process.stdin.setEncoding("utf8");
for await (const chunk of process.stdin) prompt += chunk;
const flag = (name) => process.argv[process.argv.indexOf(`--${name}`) + 1];
if (!prompt || process.argv.includes(prompt) || flag("surface") !== "code" || flag("phase") !== "turn_start" || flag("host") !== "codex" || flag("workspace-root") !== "/workspace" || flag("max-tokens") !== "500" || !process.argv.includes("--query-stdin") || !process.argv.includes("--json")) process.exit(2);
process.stdout.write(await readFile(new URL("./relevant-result.json", import.meta.url), "utf8"));
