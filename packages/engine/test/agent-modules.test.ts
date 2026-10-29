import { expect, it } from "vitest";
import { gradeModules } from "../src/evaluation/agent-grader.js";

const files = {
  "src/domain/value.cjs": "exports.solve = value => value * 2;",
  "src/service.cjs": "const domain = require('./domain/value.cjs'); exports.solve = values => values.map(domain.solve);",
  "route.cjs": "const service = require('./src/service.cjs'); exports.solve = request => ({ values: service.solve(request.values) });",
};

it("grades relative CommonJS modules and direct layer probes without exposing host objects", async () => {
  const result = await gradeModules(files, "route.cjs", [
    { input: [{ values: [2, 3] }], expected: { values: [4, 6] } },
    { module: "src/domain/value.cjs", input: [7], expected: 14 },
    { module: "src/service.cjs", input: [[4, 5]], expected: [8, 10] },
  ]);
  expect(result.checks).toEqual([true, true, true]);
  for (const code of [
    "exports.solve = () => { process.env; return true; };",
    "exports.solve = () => { require('node:fs'); return true; };",
    "exports.solve = () => { require('../route.cjs'); return true; };",
    "exports.solve = () => { module.constructor.constructor('return process')(); return true; };",
    "exports.solve = () => { while (true) {} };",
  ]) expect((await gradeModules({ "route.cjs": code }, "route.cjs", [{ input: [], expected: true }])).checks).toEqual([false]);
});

it("rejects missing modules, input mutation and stale module state across probes", async () => {
  const probes = [{ input: [[1, 2]], expected: [1, 2] }];
  expect((await gradeModules({ "route.cjs": "exports.solve = values => { values.push(3); return [1, 2]; };" }, "route.cjs", probes)).passed).toBe(0);
  expect((await gradeModules({}, "route.cjs", probes)).passed).toBe(0);
  expect((await gradeModules({ "route.cjs": "exports.solve = () => require('./missing.cjs');" }, "route.cjs", probes)).passed).toBe(0);
  expect((await gradeModules({ "route.cjs": "let count = 0; exports.solve = () => ++count;" }, "route.cjs", [
    { input: [], expected: 1 }, { input: [], expected: 1 },
  ])).checks).toEqual([true, true]);
});
