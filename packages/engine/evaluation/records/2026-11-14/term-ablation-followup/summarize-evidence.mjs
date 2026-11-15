import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const metrics = rows => {
  const positive = rows.filter(row => row.expected_sources.length);
  const noOp = rows.filter(row => !row.expected_sources.length);
  const count = (items, field) => ({ correct: items.filter(row => row[field]).length, total: items.length });
  return { positive_recall: count(positive, 'correct'), positive_exact: count(positive, 'precise_correct'), no_op: count(noOp, 'correct') };
};

// Retrospective uniform single-term removals. This is not a selected strategy,
// joint-removal experiment, semantic classifier or independent validation.
export function summarizeEvidence(rows, diagnostics) {
  return ['excerpts', 'rules_only'].map(mode => {
    const baseline = rows.filter(row => row.mode === mode && row.repeat === 0 && row.strategy === 'qualified-bindings');
    const cases = diagnostics.cases.filter(row => row.mode === mode && row.repeat === 0);
    const terms = [...new Set(cases.flatMap(row => row.interventions.map(probe => probe.term)))].sort();
    const additional = new Map();
    for (const row of cases) for (const probe of row.interventions.filter(item => item.kind === 'only-term')) {
      for (const source of probe.result.additional_sources) {
        const key = JSON.stringify([probe.term, source]);
        const item = additional.get(key) ?? { term: probe.term, source, task_ids: [] };
        item.task_ids.push(row.id); additional.set(key, item);
      }
    }
    return { mode, sample: 'First repeat only; all repeated probes are separately checked for stability.', baseline: metrics(baseline),
      single_term_additional_sources: [...additional.values()].map(item => ({ ...item, task_ids: item.task_ids.sort() }))
        .sort((a, b) => a.term.localeCompare(b.term) || a.source.localeCompare(b.source)),
      uniform_term_removals: terms.map(term => {
        const changed = [];
        const counterfactual = baseline.map(base => {
          const diagnostic = cases.find(row => row.id === base.id);
          const probe = diagnostic.interventions.find(item => item.kind === 'without-term' && item.term === term);
          if (!probe) return base;
          const result = probe.result;
          if (probe.removed_sources.length || probe.added_sources.length || base.correct !== result.correct || base.precise_correct !== result.precise_correct) {
            changed.push({ id: base.id, removed_sources: probe.removed_sources, added_sources: probe.added_sources,
              positive_recall_lost: base.expected_sources.length > 0 && base.correct && !result.correct,
              exact_gained: !base.precise_correct && result.precise_correct,
              exact_lost: base.precise_correct && !result.precise_correct });
          }
          return result;
        });
        return { term, metrics: metrics(counterfactual), changed_tasks: changed };
      }) };
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const reports = {};
  for (const name of ['transfer', 'historical']) {
    const json = async file => JSON.parse(await readFile(new URL(`${name}/${file}`, import.meta.url), 'utf8'));
    reports[name] = summarizeEvidence(await json('results.json'), await json('term-diagnostics.json'));
  }
  await writeFile(new URL('findings.json', import.meta.url), JSON.stringify(reports, null, 2) + '\n', { flag: 'wx' });
}
