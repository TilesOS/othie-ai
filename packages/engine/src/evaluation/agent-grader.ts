import { spawn } from "node:child_process";
import type { Probe } from "./agent-cases.js";

// The model has no shell tool. Code is evaluated in a fresh, resource-limited process,
// with no inherited secrets and no host objects exposed to the VM context.
const evaluator = `
const vm = require('node:vm');
let input = '';
process.stdin.setEncoding('utf8').on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const { code, probes, publicOnly } = JSON.parse(input);
    const checks = probes.map(probe => {
      try {
        const script = new vm.Script(code + '\\n' +
          '(() => { const args = ' + JSON.stringify(probe.input) + '; ' +
          'const before = JSON.stringify(args); const actual = solve(...args); ' +
          'return JSON.stringify({actual, unchanged: before === JSON.stringify(args)}); })()');
        const result = JSON.parse(script.runInNewContext(Object.create(null), {
          timeout: 250, contextCodeGeneration: { strings: false, wasm: false }, microtaskMode: 'afterEvaluate'
        }));
        const correct = publicOnly && ['number', 'boolean'].includes(probe.expected)
          ? typeof result.actual === probe.expected
          : JSON.stringify(result.actual) === JSON.stringify(probe.expected);
        return correct && result.unchanged;
      } catch { return false; }
    });
    process.stdout.write(JSON.stringify({checks, passed: checks.filter(Boolean).length, total: checks.length}));
  } catch { process.exitCode = 1; }
});
`;

export interface Grade { checks: boolean[]; passed: number; total: number }
export async function gradeCode(code: string, probes: Probe[], publicOnly = false): Promise<Grade> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--permission", "--max-old-space-size=64", "-e", evaluator], {
      env: {}, stdio: "pipe",
    });
    let output = "";
    const timer = setTimeout(() => child.kill("SIGKILL"), 5000);
    child.stdout.setEncoding("utf8").on("data", (chunk: string) => {
      output += chunk;
      if (output.length > 100_000) child.kill("SIGKILL");
    });
    child.stderr.resume();
    child.stdin.on("error", () => {});
    child.once("error", (error) => { clearTimeout(timer); reject(error); });
    child.once("close", (exitCode) => {
      clearTimeout(timer);
      if (exitCode !== 0) return resolve({ checks: probes.map(() => false), passed: 0, total: probes.length });
      try { resolve(JSON.parse(output) as Grade); } catch { reject(new Error("Invalid grader response")); }
    });
    child.stdin.end(JSON.stringify({ code, probes, publicOnly }));
  });
}
