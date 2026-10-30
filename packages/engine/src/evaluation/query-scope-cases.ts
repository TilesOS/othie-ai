import { nativeAgentDocuments } from "./native-agent-cases.js";
import { nativeAgentProjectCases, nativeAgentProjectPolicySources } from "./native-agent-projects.js";
import { qualityDocuments } from "./quality-cases.js";

export interface QueryScopeCase {
  id: string;
  family: string;
  query: string;
  sources: readonly string[];
}

// Keep the original native fixtures intact. The two additional documents test
// whether scope interventions preserve both sides of an explicit opposition.
export const queryScopeDocuments = [
  ...nativeAgentDocuments,
  ...qualityDocuments.filter((document) => ["current-export.md", "legacy-export.md"].includes(document.name))
    .map(({ name, text }) => ({ name, text })),
];

const arrayTask = nativeAgentProjectCases.find((scenario) => scenario.control)!.task;
export const queryScopeCases: readonly QueryScopeCase[] = [
  ...nativeAgentProjectCases.map((scenario) => ({ id: `native-${scenario.id}`, family: "unchanged-native-task",
    query: scenario.task, sources: nativeAgentProjectPolicySources[scenario.id] ? [nativeAgentProjectPolicySources[scenario.id]!] : [] })),
  { id: "backtick-array", family: "signature-control", query: arrayTask.replace("solve(request)", "`solve(request)`"), sources: [] },
  { id: "multiple-arguments", family: "signature-control", query: "Sort numeric arrays through solve(request, options). Preserve ascending order.", sources: [] },
  { id: "window-argument", family: "signature-control", query: "Sort numeric arrays through solve(window). Preserve ascending order.", sources: [] },
  { id: "access-argument", family: "signature-control", query: "Sort numeric arrays through solve(access). Preserve ascending order.", sources: [] },
  { id: "request-variable", family: "prose-control", query: "Sort an array stored in a variable named request. Preserve numeric ordering.", sources: [] },
  { id: "support-variable", family: "prose-control", query: "Deduplicate numeric values in the variable support.", sources: [] },
  { id: "request-css", family: "prose-control", query: "Change the CSS width of the request panel.", sources: [] },
  { id: "window-css", family: "prose-control", query: "Set window width to 640 pixels.", sources: [] },
  { id: "support-chart", family: "prose-control", query: "Plot support response observations from a local CSV.", sources: [] },
  { id: "numeric-array", family: "clean-control", query: "Sort unique finite numbers in ascending numeric order.", sources: [] },
  { id: "duration-control", family: "clean-control", query: "The median took seventeen minutes.", sources: [] },
  { id: "refund-prose", family: "policy-prose", query: "What is the refund request window?", sources: ["refunds.md"] },
  { id: "request-subject", family: "policy-prose", query: "Summarize company request policy.", sources: ["refunds.md"] },
  { id: "support-prose", family: "policy-prose", query: "What are enterprise support targets on weekends?", sources: ["support.md"] },
  { id: "telemetry-prose", family: "policy-prose", query: "Implement company telemetry defaults.", sources: ["telemetry.md"] },
  { id: "telemetry-code-argument", family: "policy-code-subject", query: "Use company policy to implement solve(telemetry).", sources: ["telemetry.md"] },
  { id: "refund-code-argument", family: "policy-code-subject", query: "Use company policy to implement solve(refund).", sources: ["refunds.md"] },
  { id: "access-code-argument", family: "policy-code-subject", query: "Use company policy to implement solve(access).", sources: ["access.md"] },
  { id: "telemetry-code-name", family: "policy-code-subject", query: "Use company policy to implement telemetry(consent).", sources: ["telemetry.md"] },
  { id: "refund-code-name", family: "policy-code-subject", query: "Use company policy to implement refund(request).", sources: ["refunds.md"] },
  { id: "quoted-policy-subject", family: "policy-code-subject", query: "Implement company defaults for `telemetry`.", sources: ["telemetry.md"] },
  { id: "export-opposition", family: "opposing-policy", query: "Implement CSV export of customer records for the migration project.", sources: ["current-export.md", "legacy-export.md"] },
  { id: "export-code-argument", family: "opposing-policy", query: "Use company policy to implement solve(export).", sources: ["current-export.md", "legacy-export.md"] },
  { id: "late-policy-subject", family: "long-query", query: `${Array.from({ length: 4000 }, (_, index) => `preface${index}`).join(" ")} telemetry consent`, sources: ["telemetry.md"] },
];
