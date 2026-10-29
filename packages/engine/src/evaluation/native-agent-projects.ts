import type { AgentCase } from "./agent-cases.js";
import type { ModuleProbe } from "./agent-grader.js";

export interface NativeAgentCase extends AgentCase {
  project?: { files: Record<string, string>; editable: string[]; entry: string };
  publicProbes: ModuleProbe[];
  hiddenProbes: ModuleProbe[];
}

const entry = "src/route.cjs";
const editable = ["src/domain.cjs", "src/service.cjs", entry];
function project(domain: string, validate: string, contract: string) {
  return {
    entry, editable,
    files: {
      "src/domain.cjs": domain + "\n",
      "src/service.cjs": "const domain = require('./domain.cjs');\nexports.solve = values => [];\n",
      [entry]: "const { validate } = require('./validate.cjs');\nconst service = require('./service.cjs');\nexports.solve = request => ({ status: 501, body: { error: 'unimplemented' } });\n",
      "src/validate.cjs": "exports.validate = request => " + validate + ";\n",
      "package.json": '{"private":true,"type":"commonjs","scripts":{"test":"node --test"}}\n',
      "CONTRACT.md": `${contract}\nEach editable module exports a synchronous function named solve. The domain module handles one item, the service maps an array preserving order, and the route accepts an object with an items array. Valid requests return {status: 200, body: {items: serviceResult}}. Invalid requests return {status: 400, body: {error: 'invalid request'}}. Keep the existing validator unchanged. Domain arguments and service item shapes are described in the task. Do not mutate inputs. Use only relative CommonJS requires with explicit .cjs extensions; no built-in or third-party modules.\n`,
    },
  };
}

const supportItem = (id: string, tier: string, day: string) => ({ id, tier, day });
const refundItem = (id: string, customer: string, plan: string, daysSincePurchase: number) => ({ id, customer, plan, daysSincePurchase });
const ok = (items: unknown[]) => ({ status: 200, body: { items } });
const invalid = { status: 400, body: { error: "invalid request" } };
const domain = "src/domain.cjs", service = "src/service.cjs";

// A separate corpus leaves both earlier single-function corpora unchanged.
// These miniature service repositories add module integration, not production scale.
export const nativeAgentProjectCases: NativeAgentCase[] = [
  {
    id: "support-service", family: "multi-file-external-policy", initial: "",
    task: "Repair the support batch endpoint across src/domain.cjs, src/service.cjs and src/route.cjs using company support policy. Read CONTRACT.md and preserve exports. Domain solve(tier, day) returns the first-response target in hours; tier is standard or enterprise and day is a lowercase weekday. Service solve(items) maps {id, tier, day} tickets to {id, responseHours}. Route solve(request) validates and wraps the batch. Run node --test.",
    project: project("exports.solve = (tier, day) => 24;",
      "!!request && Array.isArray(request.items) && request.items.every(item => !!item && typeof item.id === 'string' && ['standard','enterprise'].includes(item.tier) && ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].includes(item.day))",
      "This endpoint computes support first-response targets. The public tests intentionally do not specify company policy values."),
    publicProbes: [{ input: [{ items: [] }], expected: ok([]) }, { input: [null], expected: invalid }],
    hiddenProbes: [
      { module: domain, input: ["standard", "monday"], expected: 4 },
      { module: domain, input: ["standard", "saturday"], expected: 12 },
      { module: domain, input: ["enterprise", "friday"], expected: 2 },
      { module: domain, input: ["enterprise", "sunday"], expected: 6 },
      { module: service, input: [[supportItem("b", "standard", "sunday"), supportItem("a", "enterprise", "monday")]], expected: [{ id: "b", responseHours: 12 }, { id: "a", responseHours: 2 }] },
      { module: service, input: [[]], expected: [] },
      { input: [{ items: [supportItem("w", "enterprise", "saturday"), supportItem("d", "standard", "friday")] }], expected: ok([{ id: "w", responseHours: 6 }, { id: "d", responseHours: 4 }]) },
      { input: [{ items: [] }], expected: ok([]) },
      { input: [{}], expected: invalid }, { input: [null], expected: invalid },
      { input: [{ items: [{ id: "x", tier: "standard", day: "someday" }] }], expected: invalid },
      { input: [{ items: [supportItem("valid", "standard", "monday"), { id: 1 }] }], expected: invalid },
    ],
  },
  {
    id: "refund-service", family: "multi-file-customer-exception", initial: "",
    task: "Repair the refund batch endpoint across src/domain.cjs, src/service.cjs and src/route.cjs using company refund policy. Read CONTRACT.md and preserve exports. Domain solve(customer, plan, daysSincePurchase) returns refund eligibility; customer is Acme or Other, plan is annual or monthly, and daysSincePurchase is a nonnegative integer. Service solve(items) maps {id, customer, plan, daysSincePurchase} purchases to {id, eligible}. Route solve(request) validates and wraps the batch. Run node --test.",
    project: project("exports.solve = (customer, plan, daysSincePurchase) => true;",
      "!!request && Array.isArray(request.items) && request.items.every(item => !!item && typeof item.id === 'string' && ['Acme','Other'].includes(item.customer) && ['annual','monthly'].includes(item.plan) && Number.isInteger(item.daysSincePurchase) && item.daysSincePurchase >= 0)",
      "This endpoint computes refund eligibility. The public tests intentionally do not specify company policy values."),
    publicProbes: [{ input: [{ items: [] }], expected: ok([]) }, { input: [null], expected: invalid }],
    hiddenProbes: [
      { module: domain, input: ["Acme", "annual", 7], expected: true }, { module: domain, input: ["Acme", "annual", 8], expected: false },
      { module: domain, input: ["Acme", "monthly", 30], expected: true }, { module: domain, input: ["Acme", "monthly", 31], expected: false },
      { module: domain, input: ["Other", "annual", 30], expected: true }, { module: domain, input: ["Other", "annual", 31], expected: false },
      { module: service, input: [[refundItem("b", "Acme", "annual", 8), refundItem("a", "Other", "monthly", 30)]], expected: [{ id: "b", eligible: false }, { id: "a", eligible: true }] },
      { module: service, input: [[]], expected: [] },
      { input: [{ items: [refundItem("e", "Acme", "annual", 7), refundItem("s", "Acme", "monthly", 31)] }], expected: ok([{ id: "e", eligible: true }, { id: "s", eligible: false }]) },
      { input: [null], expected: invalid }, { input: [{ items: [refundItem("x", "Other", "annual", -1)] }], expected: invalid },
      { input: [{ items: [refundItem("x", "Other", "annual", 0.5)] }], expected: invalid },
    ],
  },
  {
    id: "array-service-control", family: "multi-file-repository-only-control", control: true, initial: "",
    task: "Repair the array batch endpoint across src/domain.cjs, src/service.cjs and src/route.cjs. Read CONTRACT.md and preserve exports. Domain solve(numbers) returns unique finite numbers in ascending numeric order. Service solve(items) maps {id, numbers} groups to {id, values} while retaining group order. Route solve(request) validates and wraps the batch. Do not mutate arguments. Run node --test.",
    project: project("exports.solve = numbers => numbers.sort();",
      "!!request && Array.isArray(request.items) && request.items.every(item => !!item && typeof item.id === 'string' && Array.isArray(item.numbers) && item.numbers.every(Number.isFinite))",
      "This array endpoint is completely specified in the task; it needs no external evidence."),
    publicProbes: [{ input: [{ items: [] }], expected: ok([]) }, { input: [null], expected: invalid }],
    hiddenProbes: [
      { module: domain, input: [[10, 2, -1, 10]], expected: [-1, 2, 10] },
      { module: domain, input: [[1.5, 0, -2, 1.5]], expected: [-2, 0, 1.5] },
      { module: domain, input: [[]], expected: [] },
      { module: service, input: [[{ id: "z", numbers: [2, 2, 1] }, { id: "a", numbers: [] }]], expected: [{ id: "z", values: [1, 2] }, { id: "a", values: [] }] },
      { input: [{ items: [{ id: "x", numbers: [10, 2, 10] }] }], expected: ok([{ id: "x", values: [2, 10] }]) },
      { input: [{}], expected: invalid }, { input: [null], expected: invalid },
      { input: [{ items: [{ id: "x", numbers: ["1"] }] }], expected: invalid },
    ],
  },
];

export const nativeAgentProjectPolicySources: Readonly<Record<string, string>> = { "support-service": "support.md", "refund-service": "refunds.md" };

export function nativeAgentProjectInstructions(scenario: NativeAgentCase): string {
  return `Work only in this synthetic repository. Read CONTRACT.md. Only ${scenario.project!.editable.join(", ")} may be changed; preserve module interfaces and every other file. Use native file editing and shell tools, inspect the repository, and run node --test before finishing. Do not look outside the repository, search for benchmark fixtures or scoring data, access the network, or install dependencies. Company documents are maintained outside the repository; use supplied context as evidence. If policy is absent, make your best implementation and state the assumption. Do not mutate input arguments.`;
}
