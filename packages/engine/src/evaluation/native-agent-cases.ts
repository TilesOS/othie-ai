import { agentCases, agentDocuments, type AgentCase } from "./agent-cases.js";

// A separate corpus keeps the constrained-tool benchmark's fixtures unchanged.
// These are small synthetic implementation tasks, not production repositories.
export const nativeAgentDocuments = [
  ...agentDocuments,
  { name: "expenses.md", text: "Expense claims above $25 require a receipt. Claims of exactly $25 or less do not require a receipt. A lost required receipt must be replaced with a written explanation. A missing receipt that is not lost leaves the claim incomplete. A supplied receipt always satisfies the documentation requirement." },
  { name: "access.md", text: "Privileged access expires eight hours after it is granted. Only an incident commander may approve an extension, and the extension may add at most two hours. An extension must be recorded before the original access expires; recording it at the expiration instant is too late. Access is inactive at or after its expiration instant. Times are measured as hours since the grant." },
  { name: "renewal.md", text: "For Canadian accounts, automatic renewal defaults to disabled unless an administrator explicitly enables it. For Australian accounts, automatic renewal defaults to enabled unless an administrator explicitly disables it. Trial accounts in either region must never renew automatically, even with administrator approval. A null administrator setting means no explicit setting." },
];

export const nativeAgentCases: AgentCase[] = [
  ...agentCases,
  {
    id: "expense-documentation", family: "threshold-and-exception",
    task: "Implement solve(amount, receiptState) in solution.js returning the expense claim documentation status according to company expense policy. amount is a nonnegative number and receiptState is supplied, lost, or missing. Return complete when no further documentation is needed, explanation when a written explanation must replace a lost receipt, or incomplete otherwise. Preserve the function interface.",
    initial: "function solve(amount, receiptState) { return 'complete'; }\n",
    publicProbes: [{ input: [0, "supplied"], expected: "complete" }],
    hiddenProbes: [
      { input: [25, "missing"], expected: "complete" }, { input: [25, "lost"], expected: "complete" },
      { input: [25.01, "missing"], expected: "incomplete" }, { input: [25.01, "lost"], expected: "explanation" },
      { input: [100, "supplied"], expected: "complete" }, { input: [0, "missing"], expected: "complete" },
    ],
  },
  {
    id: "access-expiration", family: "linked-conditions",
    task: "Implement solve(elapsedHours, extension) in solution.js returning whether privileged access remains active under company access policy. elapsedHours is a nonnegative number. extension is null or an object with approver (incident-commander or manager), addedHours (a nonnegative number), and recordedAt (hours since grant). Invalid extensions have no effect. Preserve the function interface and do not mutate extension.",
    initial: "function solve(elapsedHours, extension) { return true; }\n",
    publicProbes: [{ input: [0, null], expected: "boolean" }],
    hiddenProbes: [
      { input: [7.99, null], expected: true }, { input: [8, null], expected: false },
      { input: [9.99, { approver: "incident-commander", addedHours: 2, recordedAt: 7.99 }], expected: true },
      { input: [10, { approver: "incident-commander", addedHours: 2, recordedAt: 7 }], expected: false },
      { input: [8, { approver: "incident-commander", addedHours: 1, recordedAt: 8 }], expected: false },
      { input: [8, { approver: "manager", addedHours: 2, recordedAt: 7 }], expected: false },
      { input: [8, { approver: "incident-commander", addedHours: 3, recordedAt: 7 }], expected: false },
      { input: [8.5, { approver: "incident-commander", addedHours: 1, recordedAt: 7 }], expected: true },
      { input: [9, { approver: "incident-commander", addedHours: 1, recordedAt: 7 }], expected: false },
    ],
  },
  {
    id: "regional-renewal", family: "default-and-override",
    task: "Implement solve(region, trial, administratorSetting) in solution.js returning whether automatic renewal is enabled under company renewal policy. region is CA or AU, trial is boolean, and administratorSetting is true, false, or null for missing. Preserve the function interface.",
    initial: "function solve(region, trial, administratorSetting) { return true; }\n",
    publicProbes: [{ input: ["CA", false, true], expected: "boolean" }],
    hiddenProbes: [
      { input: ["CA", false, null], expected: false }, { input: ["AU", false, null], expected: true },
      { input: ["CA", false, true], expected: true }, { input: ["AU", false, false], expected: false },
      { input: ["CA", false, false], expected: false }, { input: ["AU", false, true], expected: true },
      { input: ["CA", true, true], expected: false }, { input: ["AU", true, true], expected: false },
      { input: ["AU", true, null], expected: false },
    ],
  },
];

export const nativeAgentInstructions = "Work only in this synthetic repository. Implement the task in solution.js as a self-contained function solve without imports or exports. Use your native file editing and shell tools, inspect the repository, and run node --test before finishing. Only solution.js may be changed. Do not look outside this repository, search for benchmark fixtures or scoring data, access the network, or install dependencies. Company documents are maintained outside the repository; use any supplied context as evidence. If policy is absent, make your best implementation and state the assumption. Do not mutate input arguments.";

export const nativeAgentPolicySources: Readonly<Record<string, string>> = {
  "support-targets": "support.md", "refund-boundaries": "refunds.md", "telemetry-consent": "telemetry.md",
  "expense-documentation": "expenses.md", "access-expiration": "access.md", "regional-renewal": "renewal.md",
};
