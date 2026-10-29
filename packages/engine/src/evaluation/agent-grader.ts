import { spawn } from "node:child_process";
import type { Probe } from "./agent-cases.js";

// Code is evaluated in a fresh, resource-limited process, with no inherited
// secrets and no host objects exposed to the VM context.
const evaluator = `
const vm = require('node:vm');
let input = '';
process.stdin.setEncoding('utf8').on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const { code, modules, entry, probes, publicOnly } = JSON.parse(input);
    const checks = probes.map(probe => {
      try {
        // Compile each CommonJS module as a function inside the sandbox. The
        // loader has only supplied source strings, never Node's require or fs.
        const projectCode = modules ? 'const solve = (() => { const factories = Object.create(null);' +
          Object.entries(modules).map(([name, source]) => 'factories[' + JSON.stringify(name) + '] = function(module, exports, require) {\\n' + source + '\\n};').join('\\n') +
          'const cache = Object.create(null); function load(name) {' +
          'if (!Object.hasOwn(factories, name)) throw new Error("Unknown module");' +
          'if (Object.hasOwn(cache, name)) return cache[name].exports;' +
          'const module = {exports: {}}; cache[name] = module;' +
          'factories[name](module, module.exports, request => {' +
          'if (typeof request !== "string" || !request.startsWith(".")) throw new Error("Relative modules only");' +
          'const parts = name.split("/"); parts.pop(); for (const part of request.split("/")) {' +
          'if (part === "..") { if (!parts.length) throw new Error("Outside project"); parts.pop(); }' +
          'else if (part && part !== ".") parts.push(part); } return load(parts.join("/")); });' +
          'return module.exports; } return load(' + JSON.stringify(probe.module ?? entry) + ').solve; })();' : code;
        const script = new vm.Script(projectCode + '\\n' +
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
export interface ModuleProbe extends Probe { module?: string }
export function gradeCode(code: string, probes: Probe[], publicOnly = false): Promise<Grade> {
  return grade({ code, probes, publicOnly });
}

export function gradeModules(modules: Record<string, string>, entry: string, probes: ModuleProbe[], publicOnly = false): Promise<Grade> {
  return grade({ modules: Object.fromEntries(Object.entries(modules).filter(([name]) => name.endsWith(".cjs"))), entry, probes, publicOnly });
}

async function grade(input: { code?: string; modules?: Record<string, string>; entry?: string; probes: Probe[]; publicOnly: boolean }): Promise<Grade> {
  const { probes } = input;
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
    child.stdin.end(JSON.stringify(input));
  });
}
