export interface Probe { input: unknown[]; expected: unknown }
export interface AgentCase {
  id: string;
  family: string;
  task: string;
  initial: string;
  publicProbes: Probe[];
  hiddenProbes: Probe[];
  control?: boolean;
}

export const agentDocuments = [
  { name: "support.md", text: "Standard support tickets require a first response within four hours on weekdays and twelve hours on weekends. Enterprise support tickets require a first response within two hours on weekdays and six hours on weekends. Saturday and Sunday are weekends. These targets are not resolution deadlines." },
  { name: "refunds.md", text: "The standard refund request window is thirty days after purchase. Acme annual-plan purchases are an exception with a seven-day refund request window. Acme monthly plans retain the standard thirty-day window. Refund requests on the last day of the window are eligible." },
  { name: "telemetry.md", text: "For EU users, product telemetry defaults to disabled unless consent is explicitly true. Missing or false consent is not explicit consent. Outside the EU, product telemetry defaults to enabled when consent is missing, but explicitly false consent disables telemetry." },
  { name: "facilities.md", text: "Office visitors check in at reception. Meeting rooms can be booked through the building calendar. This facilities reference does not define product behavior or customer commitments." },
  { name: "brand.md", text: "Brand presentations use clear sentences and restrained colors. The design library contains monochrome logo examples. This communications reference does not set support targets, purchase terms, or telemetry rules." },
] as const;

export const agentCases: AgentCase[] = [
  {
    id: "support-targets", family: "external-policy",
    task: "Implement solve(tier, day) in solution.js returning the first-response target in hours for standard or enterprise support tickets, according to company support policy. day is a lowercase weekday name. Preserve the function interface.",
    initial: "function solve(tier, day) { return 24; }\n",
    publicProbes: [{ input: ["standard", "monday"], expected: "number" }],
    hiddenProbes: [
      { input: ["standard", "monday"], expected: 4 }, { input: ["standard", "saturday"], expected: 12 },
      { input: ["standard", "sunday"], expected: 12 }, { input: ["enterprise", "friday"], expected: 2 },
      { input: ["enterprise", "saturday"], expected: 6 }, { input: ["enterprise", "sunday"], expected: 6 },
    ],
  },
  {
    id: "refund-boundaries", family: "customer-exception",
    task: "Implement solve(customer, plan, daysSincePurchase) in solution.js returning whether a refund request is eligible according to company refund policy. customer is Acme or Other; plan is annual or monthly; daysSincePurchase is a nonnegative integer. Preserve the function interface.",
    initial: "function solve(customer, plan, daysSincePurchase) { return true; }\n",
    publicProbes: [{ input: ["Other", "monthly", 0], expected: "boolean" }],
    hiddenProbes: [
      { input: ["Acme", "annual", 7], expected: true }, { input: ["Acme", "annual", 8], expected: false },
      { input: ["Acme", "monthly", 30], expected: true }, { input: ["Acme", "monthly", 31], expected: false },
      { input: ["Other", "annual", 30], expected: true }, { input: ["Other", "annual", 31], expected: false },
      { input: ["Acme", "annual", 0], expected: true },
    ],
  },
  {
    id: "telemetry-consent", family: "negation-and-scope",
    task: "Implement solve(region, consent) in solution.js returning whether telemetry is enabled by default according to company telemetry policy. region is EU or US; consent is true, false, or null (missing). Preserve the function interface.",
    initial: "function solve(region, consent) { return true; }\n",
    publicProbes: [{ input: ["US", true], expected: "boolean" }],
    hiddenProbes: [
      { input: ["EU", null], expected: false }, { input: ["EU", false], expected: false },
      { input: ["EU", true], expected: true }, { input: ["US", null], expected: true },
      { input: ["US", false], expected: false }, { input: ["US", true], expected: true },
    ],
  },
  {
    id: "repository-only-control", family: "repository-only-control", control: true,
    task: "Implement solve(numbers) in solution.js returning unique numbers in ascending numeric order, without mutating the input array. All inputs are finite numbers. Preserve the function interface.",
    initial: "function solve(numbers) { return numbers.sort(); }\n",
    publicProbes: [{ input: [[2, 1]], expected: [1, 2] }],
    hiddenProbes: [
      { input: [[10, 2, 10, -1]], expected: [-1, 2, 10] }, { input: [[]], expected: [] },
      { input: [[1.5, 0, -2, 1.5]], expected: [-2, 0, 1.5] },
    ],
  },
];
