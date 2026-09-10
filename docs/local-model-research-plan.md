# Othie Local Model Research and Development Plan

## Executive recommendation

Othie should begin with **Qwen3.5-4B** as its primary local compiler model, use **Qwen3-4B** as the fallback candidate, and treat the first model-development cycle as a supervised fine-tuning program followed by a narrowly targeted preference-optimization pass. Do not begin with DPO alone.

Qwen3.5-4B is the strongest fit because it combines an Apache 2.0 license, a 262,144-token native context window, a current Ollama artifact, and an officially documented BF16 LoRA path whose nominal model footprint is about 10 GB. Its Ollama Q8 artifact is approximately 5.3 GB and the Q4_K_M artifact is approximately 3.4 GB, leaving ample inference headroom on both the 48 GB MacBook Pro and the 16 GB RTX desktop.[^1][^2][^3] Those specifications do not prove that Othie's task will work well; they make the model the best candidate to test.

The initial training target should be the post-trained `Qwen/Qwen3.5-4B`, not the base checkpoint. Othie benefits immediately from its instruction following, JSON behavior, and existing chat template. A base-model path can be reconsidered only after the dataset and evaluator are large enough to replace those capabilities reliably.

The two computers should have distinct roles:

| Machine | Primary role | Secondary role |
| --- | --- | --- |
| M5 Pro MacBook Pro, 48 GB unified memory | Product inference, baseline measurement, dataset generation with a larger local teacher | Q8/Q4 release validation and macOS acceptance tests |
| RTX 5060 Ti 16 GB desktop, Ubuntu | BF16 LoRA SFT, short feasibility sweeps, DPO after SFT | CUDA inference and Windows/Ubuntu product-parity testing |

Use Ubuntu, not native Windows, as the canonical training environment. Unsloth documents Linux and Windows support, RTX 50-series support, and a 10 GB BF16 LoRA footprint for Qwen3.5-4B.[^3][^4] Keep native Windows for product acceptance because Othie ships to Windows users.

The highest-leverage correction to the proposed strategy is architectural: **the current Othie engine never gives the compiler a 10,000-word document**. It parses the document into 500-token chunks and calls rule extraction once per chunk. Query-time synthesis sees selected rules and excerpts, not the original whole document. A direct document-to-150-word model would therefore be trained for a path the product does not currently execute.

The recommended production design is a two-level distiller:

```text
document
  -> parser and section-aware chunks
  -> atomic rule extraction with exact evidence
  -> document-level consolidation and deduplication
  -> 150-word high-density taste ruleset
  -> stored RuleRecords plus the compact derived representation

query
  -> hybrid retrieval over chunks and rules
  -> authority/conflict-aware selection
  -> deterministic packing or optional cited synthesis
```

The same 4B model can learn both levels through multi-task SFT. Direct 10,000-word-to-ruleset examples should remain in training and evaluation, because long-context utilization is part of Othie's differentiation. But the auditable atomic-rule representation—not an opaque 150-word paragraph—should remain the system of record. This preserves exact quotations, qualifiers, authority, conflict handling, and safe re-packing at different token budgets.

The first release should be gated by a paired benchmark, not by training loss. The core score should be **supported atomic rules per 150 words**, with hard penalties for unsupported claims, dropped negations, lost numbers, lost exceptions, and unresolved conflicts. This is a better expression of “high-density taste” than ROUGE or preference win rate alone.

## Repository findings

Othie already contains most of the runtime boundary needed for a custom local model:

- [`packages/engine/src/config.ts`](../packages/engine/src/config.ts) defines a compiler model identity and supports Ollama or an OpenAI-compatible endpoint.
- [`packages/engine/src/providers/http.ts`](../packages/engine/src/providers/http.ts) sends system/user messages and a JSON schema to `/api/chat` for Ollama. Ollama officially supports a JSON schema in the `format` field, which matches this implementation.[^5]
- [`packages/engine/src/rules/extractor.ts`](../packages/engine/src/rules/extractor.ts) requires structured atomic rules and rejects rules whose `source_id` is unknown or whose quotation is not an exact substring of the cited chunk.
- [`packages/engine/src/context/compiler.ts`](../packages/engine/src/context/compiler.ts) performs optional cited synthesis over eligible rules and excerpts, with a deterministic fallback.
- [`packages/engine/src/context/packing.ts`](../packages/engine/src/context/packing.ts) applies the final token budget and preserves whole items.
- [`packages/engine/src/engine/ingestion.ts`](../packages/engine/src/engine/ingestion.ts) currently invokes extraction separately for every chunk.
- [`packages/engine/test/model.quality.test.ts`](../packages/engine/test/model.quality.test.ts) is a placeholder. There is no implemented real-model quality gate yet.
- [`packages/engine/src/benchmark.ts`](../packages/engine/src/benchmark.ts) records timing, memory, and fallback frequency, but does not score model output quality.
- [`packages/engine/evaluation/retrieval.jsonl`](../packages/engine/evaluation/retrieval.jsonl) has five useful seed cases covering required terms, unsupported claims, references, adversarial content, and contradictions. It is far too small to select or train a model.
- [`MODELS.md`](../MODELS.md) currently records `qwen3:4b` as a baseline and explicitly warns that the configured revision label must be replaced by an exact deployed artifact identity.
- [`models/manifest.json`](../models/manifest.json) is intentionally empty. The root README states that training code and private datasets belong in a separate model-development repository.

The current Mac benchmark is a lexical-fallback benchmark because Ollama was unavailable when it was recorded. It is not a model baseline. A usable before/after comparison therefore still needs to be created.

### Immediate runtime gaps

Before trusting model comparisons, add the following controls to the engine or to a dedicated evaluation client:

1. Generation parameters: temperature, seed, context length, output-token limit, and stop conditions. Ollama recommends low temperature, including temperature zero, for more deterministic structured output.[^5]
2. Provider telemetry: prompt token count, generated token count, prompt-evaluation time, generation time, load time, and model digest. Ollama's chat response exposes these fields.[^6]
3. Failure taxonomy: timeout, schema violation, invalid source ID, quotation mismatch, empty rule set, truncated output, and fallback.
4. A benchmark mode that waits for ingestion-derived jobs to finish and scores their outputs, instead of measuring only query latency.
5. A way to run a whole-document prompt independent of the product pipeline, so model capability and pipeline capability can be measured separately.

## Model decision

### Primary: Qwen3.5-4B

The official model card describes a 4B post-trained model with a hybrid gated linear-attention/full-attention architecture and a 262,144-token native context window. It is Apache 2.0 licensed.[^1] The model card reports strong long-context and instruction-following results, but those are vendor-reported general benchmarks and must not substitute for Othie's evaluation.

Why it fits Othie:

- The native context ceiling is comfortably above a 10,000-word document. Actual document length must still be measured with the model tokenizer.
- Apache 2.0 is simpler for a commercial redistributed derivative than the custom Llama and Gemma terms.
- Ollama already publishes Q4, Q8, BF16, and MLX variants. The Q8 artifact is small enough to be the high-fidelity local baseline on both machines.[^2]
- Unsloth documents text SFT, RL support, GGUF export, and BF16 LoRA for the family.[^3]
- Its 4B size is suitable for low-latency ingestion and query synthesis, while a larger member of the same family can serve as a teacher.

Risks:

- The architecture and toolchain are newer. Qwen requires current framework versions; Unsloth requires Transformers v5 for Qwen3.5.[^3]
- Unsloth explicitly advises against 4-bit QLoRA for Qwen3.5 because of larger-than-normal quantization differences.[^3]
- A model's supported inference context is not the same as the context that fits during backpropagation. The 16 GB card must be tested at 4K, 8K, 12K, and 16K tokens.
- The model is multimodal. Othie's first trainer must freeze the vision tower and train only the language path; otherwise memory and task complexity are wasted.
- Runtime chat template and EOS handling must exactly match training. Unsloth identifies template/EOS mismatch as a common reason exported GGUFs perform worse.[^3]

### Fallback: Qwen3-4B

Qwen3-4B is also Apache 2.0, has a 32,768-token native context, and is already Othie's configured baseline. Its conventional dense transformer stack is more mature across training and inference tools.[^7] Thirty-two thousand tokens should be sufficient for many 10,000-word English documents, but this must be established using the actual tokenizer and Othie prompt overhead.

Use Qwen3-4B if any of these Qwen3.5 feasibility gates fail:

- BF16 LoRA cannot complete 8K-token training on the 5060 Ti without instability.
- The fused model cannot be converted to a valid GGUF with the correct chat template.
- Ollama structured-output reliability is materially worse after export.
- Qwen3.5's long-context result does not beat Qwen3-4B on the locked Othie evaluation set.

The fallback does not require replacing the dataset or evaluator. Only the model adapter, tokenizer limits, and training configuration should change.

### Why not the original alternatives as the first bet

| Candidate | Strength | Reason not to lead with it |
| --- | --- | --- |
| Llama 3.2 3B Instruct | 128K context, mature ecosystem, explicitly intended for summarization | Custom Llama 3.2 Community License, attribution/naming obligations for redistributed derivatives, and older task quality than the current candidate. The license is commercial, but less operationally simple than Apache 2.0.[^8] |
| Qwen2.5 3B Instruct | Good JSON behavior and 32,768-token full context | The official 3B card carries the `qwen-research` license, unlike the Apache-licensed Qwen2.5 7B and Qwen3/Qwen3.5 candidates.[^9] |
| Qwen2.5 7B Instruct | Apache 2.0 and up to 131,072 tokens with long-context configuration | A 7.61B model raises long-context training pressure on a 16 GB GPU, while the newer 4B models give a better local-development envelope.[^10] |
| Gemma 2 2B | Small and easy to serve | Only an 8,192-token context, which is below the target document length, and custom Gemma terms.[^11] |
| Gemma 3 4B | 128K context and capable summarization | Multimodal overhead and custom Gemma terms; no clear advantage over Qwen3.5-4B for this first commercial model.[^12] |

This is a product and engineering recommendation, not legal advice. Re-review the exact model, tokenizer, code, and quantized-artifact licenses before distribution.

## The task Othie should actually train

“Summarize this document in 150 words” is underspecified and will teach attractive prose more readily than reliable context distillation. Othie's dataset should define three related tasks with one shared ontology.

### Task A: atomic rule extraction

Input: one section, several neighboring sections, or a full document.

Output:

```json
{
  "rules": [
    {
      "text": "Flights over eight hours require written approval for business class.",
      "category": "travel",
      "applicability": "employees booking flights longer than eight hours",
      "source_id": "section-14",
      "quotation": "Business class may be booked for flights exceeding eight hours only with written approval.",
      "priority": 90,
      "exceptions": []
    }
  ]
}
```

This task directly improves the code path Othie already runs. Exact evidence makes most hallucination checks deterministic.

### Task B: document-level consolidation

Input: atomic rules and evidence from all document sections, plus document authority metadata.

Output: deduplicated rules, retained qualifiers, explicit conflicts, supersession relationships, and provenance. This is where the model learns that two similar sentences may have different scopes, and that a later or more authoritative policy cannot be silently blended with an older one.

### Task C: high-density taste ruleset

Input: the consolidated rule graph, and for a subset of examples the raw full document.

Output:

```json
{
  "ruleset": "...no more than 150 words...",
  "covered_rule_ids": ["r1", "r2", "r4"],
  "omitted_rule_ids": ["r3"],
  "omission_reasons": {"r3": "lower authority duplicate"}
}
```

The explicit coverage map makes density measurable. The prose remains compact, while the training and evaluation system knows exactly which facts it preserved.

### Why multi-task training is the safer differentiator

Long context availability does not guarantee uniform use of the input. Controlled research has repeatedly found that relevant information in the middle of long contexts can be used less reliably than information at the beginning or end.[^13] Othie's benchmark must therefore move identical rules among the front, middle, and end of documents.

The multi-task design also allows most SFT batches to be 2K–8K tokens, which is realistic on the 16 GB GPU, while a smaller proportion of 12K–16K direct-document batches trains and tests the end-to-end behavior. If direct long examples do not fit locally, the system can still ship the hierarchical path and reserve one short cloud run for final long-context adaptation.

## Synthetic dataset as the core IP

The most defensible dataset is not a pile of summaries generated by a teacher. It is a **latent rule graph, a family of document renderers, controlled corruptions, human preference judgments, and a locked evaluator**.

### Generate ground truth before prose

For each synthetic company, generate a typed rule graph containing:

- actor, action, object, scope, jurisdiction, department, and authority;
- modal force: must, must not, may, recommended, or informational;
- thresholds, dates, currencies, durations, and units;
- prerequisites and exceptions;
- precedence and supersession links;
- conflicts that must remain unresolved;
- reference-only material that must never become policy;
- adversarial instructions embedded in document text;
- expected compact-language “taste” features.

Then render that graph into realistic documents: handbooks, policy memos, security guides, support playbooks, design systems, sales positioning, brand voice guides, and legacy addenda. Vary headings, writing quality, duplication, tables converted to text, legalistic phrasing, sentence distance, and document length. Because the rule graph precedes the prose, recall and factuality have deterministic ground truth.

### Use a larger local teacher for language, not truth

Use `qwen3.5:27b-q8_0` on the 48 GB Mac as the first local teacher. Ollama lists this artifact at roughly 30 GB, which should leave useful headroom for a 10K–20K-token prompt on a 48 GB unified-memory system, subject to an actual memory probe.[^2] The teacher should:

- rewrite rule graphs into realistic documents;
- propose several 150-word compressions;
- explain which atomic rules each compression covers;
- flag awkward or ambiguous synthetic prose;
- generate hard negatives.

It should not invent the canonical rule graph or certify its own outputs. Deterministic validators and human review remain the authority.

### Create useful DPO negatives

DPO requires a prompt, a chosen completion, and a rejected completion.[^14] Randomly poor answers teach little about Othie's taste. Generate rejected outputs with one controlled defect:

- drop an exception;
- reverse a negation;
- change a number or unit;
- overgeneralize a scoped rule;
- merge two conflicting rules;
- promote reference material into a rule;
- follow an instruction embedded in the document;
- cite a non-existent source;
- exceed the 150-word budget with redundant prose;
- optimize brevity by omitting a high-authority rule;
- preserve all facts but use a style judged unlike Othie.

Record the defect label for slice-level evaluation. Human reviewers should compare outputs blind to model identity and should be able to mark “both bad” rather than forcing a preference.

### Dataset schema and lineage

Each immutable example should include:

```text
example_id
generator_version and seed
scenario_family and synthetic_company_id
source_document and tokenizer-specific token count
latent_rule_graph
task_type
prompt_version and chat_template_hash
chosen_output
rejected_output and defect_labels, when applicable
validator_results
human_review_status and disagreement
license/provenance fields
split_group
```

Hash the normalized source, target, and complete example. Keep personally identifiable or customer material out of the initial corpus. If real customer documents are later used, create a separate consent, de-identification, retention, and deletion process; do not silently mix them into the synthetic corpus.

### Initial dataset sizes

Start small enough to expose mistakes before scaling:

| Stage | Suggested size | Purpose |
| --- | ---: | --- |
| Smoke set | 32 documents / about 100 task rows | Validate schemas, tokenization, trainer, export, and evaluator |
| Locked evaluation v0 | 150 document families, each with front/middle/end variants | Model selection and regression gate; never used for training or teacher prompt examples |
| SFT v0 | 500 document families / 1,500–2,500 task rows | Establish whether LoRA can move the task metrics |
| SFT v1 | 2,000–5,000 document families | Scale only after v0 shows an out-of-sample gain |
| DPO v0 | 1,000–3,000 controlled preference pairs | Teach compression taste and penalize known failure modes |

Split by synthetic company, template family, generator seed family, and rule graph—not randomly by output row. Otherwise near-duplicate sections and positional variants will leak across train and test.

## Benchmark design

### Four systems to compare

Every model-development run should produce a paired table for:

1. `Qwen/Qwen3.5-4B` BF16, untouched: canonical model baseline.
2. `qwen3.5:4b-q8_0` in Ollama: product-runtime baseline.
3. The best fused SFT/DPO checkpoint in BF16: isolates the training gain.
4. The same checkpoint in GGUF Q8_0 and Q4_K_M: isolates quantization loss.

Also keep the current `qwen3:4b` result as an engineering control. Run every system on identical prompts, schemas, document order, context length, output budget, and evaluation examples. Store raw outputs so metric changes can be audited.

### Quality metrics

| Metric | Definition | Priority |
| --- | --- | --- |
| Critical-rule recall | Weighted recall of must/must-not, high-authority, and safety-critical rules | Gate |
| Unsupported rule rate | Generated atomic rules with no supporting ground-truth edge/evidence | Gate |
| Qualifier preservation | Exact preservation of negations, thresholds, dates, units, scopes, prerequisites, and exceptions | Gate |
| Exact quotation validity | Citation quote is an exact substring of the eligible source | Gate |
| Conflict preservation | Conflicting rules remain visible and are not silently reconciled | Gate |
| Reference isolation | Reference-only content is not promoted into policy | Gate |
| Injection resistance | Embedded document instructions do not alter the extraction task or cause exfiltration text | Gate |
| Schema success | Output parses and validates without repair | Gate |
| Word-budget compliance | Ruleset is at or below 150 words | Gate |
| Supported density | Supported, non-duplicate atomic rule weight per 150 words | Optimization target |
| Positional robustness | Worst and average score over front/middle/end rule placement | Optimization target |
| Style preference win rate | Blind human preference against the baseline, with ties | Secondary |

ROUGE/BERTScore may be logged for continuity, but neither should select the release. Many valid high-density rulesets can have low surface overlap, and a fluent output can score well while dropping a negation.

### System metrics

Record separately for ingestion extraction, document consolidation, direct long-document distillation, and query synthesis:

- cold load time;
- prompt prefill tokens per second;
- generation tokens per second;
- time to first generated token;
- end-to-end latency p50 and p95;
- peak GPU VRAM or unified-memory pressure;
- model artifact size;
- schema retry and failure rate;
- fallback frequency;
- energy proxy: wall-clock training/inference time and average board power when available.

Ollama exposes prompt counts and durations in the chat response, so the engine should record these as benchmark data without logging document content.[^6]

### Proposed release gates

Set thresholds before opening the locked test set. A reasonable first target is:

- 100% exact-quotation validity after Othie's existing validator;
- at least 99.5% schema success without repair;
- no more than 0.5% unsupported atomic rules overall and zero on the safety-critical slice;
- at least 95% critical-rule recall;
- at least 98% qualifier preservation;
- at least 99% 150-word compliance;
- no regression larger than two percentage points between BF16 and Q8 on any gate metric;
- a statistically clear paired improvement in supported density over the untouched Q8 baseline;
- no material regression on the five existing retrieval cases and the expanded end-to-end query suite.

Treat these as initial engineering gates, not claims that the product is error-free. Report bootstrap confidence intervals over document families, not rows, because positional variants of the same document are correlated.

## Baseline before training

### Baseline A: current product pipeline

Install Ollama on the Mac, enforce local-only operation, and pull:

```text
nomic-embed-text
qwen3.5:4b-q8_0
```

Use the exact artifact digest reported by Ollama as the `revision`, not `configured`. Keep `thinking` disabled. For benchmarking, raise the synthesis deadline from two seconds to a measured development value such as 30 seconds; the production deadline can be chosen later from real latency data.

Run the current engine on:

- the bundled example documents;
- one synthetic 10,000-word company document;
- the 32-document smoke set;
- extraction with and without embeddings available;
- query synthesis on and off.

This answers: “Can Qwen3.5-4B replace the existing `qwen3:4b` compiler without changing the product?” It does not answer whether the model can distill a whole document.

### Baseline B: direct whole-document harness

In the separate model repository, send the full normalized document to the same Qwen3.5-4B Q8 artifact with the final JSON schema and a measured tokenizer budget. Evaluate raw-document-to-atomic-rules and raw-document-to-150-word-ruleset.

This answers: “Does the untouched candidate possess enough long-context task ability to justify fine-tuning?” If it cannot beat a simple hierarchical baseline, the production system should stay hierarchical even after training.

### Baseline C: prompt-only ceiling

Before generating thousands of training rows, test 5–10 prompt/schema variants on the SFT development set and freeze the best prompt. Structured output should include the schema both in the API `format` field and in concise task instructions, consistent with Ollama's guidance.[^5]

Do not change the prompt after the locked before/after baseline. A better prompt is a product improvement, but mixing it with fine-tuning makes the model gain impossible to attribute.

## Training plan on the RTX 5060 Ti

### Phase 0: one-day feasibility matrix

On Ubuntu, pin a CUDA-enabled Unsloth environment and record the complete environment (`nvidia-smi`, driver, CUDA, Python, PyTorch, Transformers, TRL, Unsloth, Unsloth Zoo, and Git commits). The RTX 5060 Ti is an NVIDIA Blackwell GPU and is listed by Unsloth as supported.[^4]

Run 20 training steps at each sequence length:

| Sequence length | Batch | Gradient accumulation | Result to record |
| ---: | ---: | ---: | --- |
| 4,096 | 1 | 8 | peak VRAM, tokens/s, loss stability |
| 8,192 | 1 | 8 | same |
| 12,288 | 1 | 8 or 16 | same |
| 16,384 | 1 | 16 | same |

Use BF16 LoRA, language layers only, gradient checkpointing, and an 8-bit AdamW optimizer. Begin with LoRA rank 16 and `target_modules="all-linear"`; PEFT documents all-linear targeting as the QLoRA-style way to adapt all transformer linear layers, though Othie will use BF16 base weights for Qwen3.5.[^15] Freeze vision parameters and confirm in logs that they are not trainable.

Go/no-go:

- If 12K–16K is stable, train a mixed-length curriculum locally.
- If 8K is stable but longer is not, perform local SFT on the compositional tasks and a small final long-context pass on a rented 24–48 GB GPU.
- If 8K is unstable, switch the primary experiment to Qwen3-4B QLoRA and keep Qwen3.5 as an inference-only challenger.

Do not force a fragile 16K configuration merely to keep all training local. Reproducible shorter training plus one bounded long-context run is less expensive than debugging silent truncation or unstable gradients.

### Phase 1: supervised fine-tuning

Train the multi-task dataset first. Suggested initial search space:

```text
base: Qwen/Qwen3.5-4B post-trained checkpoint, immutable revision
precision: BF16 base + BF16 LoRA
trainable path: language only; vision frozen
LoRA rank: 16, with one comparison at 32
LoRA alpha: rank or 2 x rank
dropout: 0 or 0.05
batch: 1
gradient accumulation: 8–16
sequence curriculum: mostly 2K–8K, 10–20% longest stable context
epochs: 1–3, selected by locked development metrics
learning-rate sweep: 2e-5, 5e-5, 1e-4
optimizer: 8-bit AdamW
gradient checkpointing: enabled
completion-only loss: enabled
```

These are starting points, not sacred defaults. Select on critical-rule recall and unsupported-rule rate, then supported density. Save adapter checkpoints frequently enough to detect overfitting. Training loss alone is not a model-selection metric.

### Phase 2: DPO only after SFT

DPO is appropriate for Othie's stylistic and omission tradeoffs because it learns from chosen/rejected completions without a separately trained reward model.[^14][^16] It should follow SFT for three reasons:

1. The model first needs a reliable schema and task policy.
2. Preference data is most informative when both candidates are plausible.
3. DPO should refine which supported facts and phrasings Othie prefers, not teach basic extraction from scratch.

Start with the best SFT adapter and a conservative sweep:

```text
preference examples: 1,000–3,000 controlled pairs
beta: 0.05, 0.1, 0.2
learning rate: 5e-7 to 5e-6
epochs: 1, then reconsider
batch: 1 with gradient accumulation
maximum length: explicitly set to the longest stable length
```

Current TRL's DPO configuration defaults to a 1,024-token maximum sequence length, so failing to override it would silently defeat Othie's long-document objective.[^17] Run the DPO feasibility matrix separately because reference-policy scoring increases compute and memory even when PEFT avoids storing a second full trainable model.

Stop DPO if unsupported-rule rate, qualifier preservation, or critical recall regresses. A higher blind style win rate does not compensate for factual loss.

### Phase 3: export and quantization

For every candidate checkpoint:

1. Save the LoRA adapter.
2. Fuse it into the exact base revision.
3. Evaluate fused BF16.
4. Export GGUF Q8_0 and Q4_K_M.
5. Preserve the exact training chat template and EOS tokens.
6. Evaluate each GGUF in Ollama on Mac, Ubuntu, and native Windows.
7. Compare quality against fused BF16 and reject a quantization with material gate regressions.

Unsloth supports direct GGUF export for Qwen3.5, and llama.cpp documents the general convert-then-quantize flow.[^3][^18] Prefer Q8_0 for the first quality release because both machines can carry it easily. Consider Q4_K_M only as a lower-memory distribution tier after its Othie quality delta is measured.

## Product architecture plan

### Minimal integration milestone

No new provider type is needed. A custom Ollama model can continue through the existing `HttpModelProvider`. The minimum product changes are:

- add reproducible generation settings;
- store exact artifact and prompt/chat-template identities;
- record provider timing metadata in benchmark mode;
- implement `model.quality.test.ts` or replace it with a real evaluation command;
- expand `MODELS.md` with the candidate and license review;
- populate `models/manifest.json` only after artifact schema, checksums, download behavior, and rollback are implemented.

This milestone allows Othie to use and benchmark the untouched Qwen3.5 model before any model training.

### Recommended document-distillation milestone

Add a durable document-level derived job after per-chunk extraction:

```text
text -> embeddings -> chunk extraction -> document consolidation -> compact ruleset
```

The job should consume only the active document revision, re-check revision eligibility before provider use and before publication, and write its own model/prompt identity. It should be invalidated when any of these change:

- source revision;
- parser or chunker version;
- extraction model or prompt;
- consolidation model or prompt;
- tokenizer or word-budget rules;
- authority metadata.

Do not replace the existing atomic rules with the 150-word ruleset. Store the compact representation as a derived view linked to the underlying rule IDs. Query-time packing can use it when it fits the request and fall back to atomic rules when exact detail is required.

### Direct long-document mode

Implement direct full-document distillation as an experimental derived operation behind a profile flag. Compare it against hierarchical consolidation on the same evaluation set. Promote it only if it improves supported density without violating recall, factuality, positional, and latency gates.

This avoids making a product architecture bet based only on a model's advertised context length. Research on long-context behavior supports treating effective context use as an empirical property.[^13]

## Separate model-development repository

Create a private sibling repository, for example `othie-models`, rather than mixing training dependencies and private data into this npm monorepo:

```text
othie-models/
  configs/
    sft/
    dpo/
    inference/
  data/
    schemas/
    smoke/
    private/              # gitignored or encrypted storage pointer
  generators/
  validators/
  evaluation/
    locked/
    metrics/
    reports/
  training/
  export/
  model_cards/
  runs/                   # manifests and small metrics, not weights
```

Every run manifest should include:

- base repository and immutable commit;
- model/tokenizer license snapshots;
- dataset manifest hash and split hash;
- generator and validator versions;
- trainer/container and package versions;
- complete hyperparameters and random seeds;
- adapter, fused checkpoint, and GGUF SHA-256 values;
- chat-template hash;
- prompt/schema versions;
- quality and system benchmark report hashes;
- known limitations and rejected slices.

Weights, raw private data, and customer documents should remain outside Git. The product repository should contain only public smoke fixtures, evaluator interfaces, release metadata, checksums, notices, and approved downloadable artifacts.

## Sequenced roadmap

### Milestone 1: baseline and evaluator

Deliverables:

- Qwen3.5-4B Q8 running through the existing Ollama adapter;
- exact model digest and deterministic generation configuration;
- implemented quality harness and 32-document smoke set;
- current pipeline, direct-document, and prompt-only baselines;
- expanded timing telemetry;
- baseline report on the M5 Pro and 5060 Ti.

Exit criterion: raw outputs are preserved, metrics are reproducible, and the same run can compare `qwen3:4b` with `qwen3.5:4b-q8_0`.

### Milestone 2: dataset v0

Deliverables:

- latent rule-graph schema;
- document renderers and controlled corruptions;
- deterministic validators;
- locked evaluation v0 and leakage audit;
- teacher-generation pipeline using the 27B model on the Mac;
- human-review rubric and blind comparison UI or worksheet.

Exit criterion: every training example has provenance, every gold fact maps to source evidence, and evaluation examples are isolated by family.

### Milestone 3: SFT feasibility and v0 adapter

Deliverables:

- 4K/8K/12K/16K memory matrix on Ubuntu;
- Qwen3.5 BF16 LoRA run or documented switch to Qwen3 fallback;
- adapter checkpoints and paired evaluation;
- first GGUF Q8 export.

Exit criterion: out-of-sample critical recall and supported density improve without increasing unsupported claims.

### Milestone 4: DPO refinement

Deliverables:

- controlled preference dataset;
- beta/learning-rate sweep;
- factuality-first early stopping;
- blind style comparison against SFT;
- selected adapter or an explicit decision that SFT is better.

Exit criterion: DPO provides a meaningful density/style gain while all safety gates hold. Shipping SFT without DPO is an acceptable result.

### Milestone 5: product distillation path

Deliverables:

- durable document-consolidation job;
- compact ruleset linked to atomic rule IDs;
- experimental direct long-document mode;
- cache/invalidation and revocation tests;
- Mac, Ubuntu, and Windows acceptance matrix.

Exit criterion: the chosen architecture wins the end-to-end benchmark and preserves Othie's current revision and provenance guarantees.

### Milestone 6: release artifact

Deliverables:

- signed/checksummed Q8 artifact, optionally Q4;
- model card, license notices, prompt/template identity, limitations, and benchmark report;
- installer manifest entry and rollback path;
- regression suite required for future dataset/model changes.

Exit criterion: a clean Othie install can acquire, verify, run, replace, and roll back the model on both supported platforms.

## First ten concrete actions

1. Install/update Ollama on the M5 Pro and verify local-only mode.
2. Pull `qwen3.5:4b-q8_0`, capture its exact digest, and run Othie's existing extraction schema directly against `/api/chat`.
3. Add deterministic generation controls and provider telemetry to the benchmark path.
4. Implement the 32-document smoke evaluator before creating training data.
5. Record three untouched baselines: current chunk pipeline, direct full document, and hierarchical document consolidation.
6. Create the private `othie-models` repository with immutable schemas and run manifests.
7. Build the rule-graph generator, evidence-preserving document renderer, and controlled negative generator.
8. Run the Qwen3.5-4B BF16 LoRA memory matrix on the 5060 Ti under Ubuntu.
9. Train only the smoke adapter and export Q8; prove the complete train-to-Ollama loop before scaling the dataset.
10. Scale SFT only after the smoke adapter moves locked task metrics; add DPO only after SFT has a reliable factual baseline.

## Decision log

| Decision | Recommendation | Revisit when |
| --- | --- | --- |
| Student model | Qwen3.5-4B post-trained | Feasibility gate fails or Qwen3 wins locked eval |
| Baseline runtime | Ollama Q8_0 | A different runtime materially improves schema reliability or cross-platform support |
| Training machine | Ubuntu on RTX 5060 Ti | Long-context pass requires more than 16 GB |
| Teacher | Qwen3.5-27B Q8 on Mac | Quality is insufficient or memory probe fails |
| First method | BF16 LoRA SFT | Never; this is the prerequisite experiment |
| Preference method | DPO after SFT | Skip if it harms factuality or adds no density gain |
| Production representation | Atomic cited rules plus derived 150-word ruleset | Direct mode proves strictly better across gates |
| Distribution quantization | Q8_0 first, Q4_K_M optional | Q4 is indistinguishable on locked task metrics |

## Sources

[^1]: Qwen. “[Qwen3.5-4B Model Card](https://huggingface.co/Qwen/Qwen3.5-4B).” Model architecture, context length, benchmark results, and Apache 2.0 license metadata.
[^2]: Ollama. “[Qwen3.5 Tags](https://ollama.com/library/qwen3.5/tags).” Current Q4, Q8, BF16, MLX, and larger-model artifact sizes and context metadata.
[^3]: Unsloth. “[Qwen3.5 Fine-tuning Guide](https://unsloth.ai/docs/models/qwen3.5/fine-tune).” BF16 LoRA memory estimates, Transformers requirement, QLoRA warning, text/RL support, and GGUF export.
[^4]: Unsloth. “[Fine-tuning LLMs with Blackwell, RTX 50 Series & Unsloth](https://unsloth.ai/docs/blog/fine-tuning-llms-with-blackwell-rtx-50-series-and-unsloth).” RTX 50-series support.
[^5]: Ollama. “[Structured Outputs](https://docs.ollama.com/capabilities/structured-outputs).” JSON-schema `format` behavior and deterministic-output guidance.
[^6]: Ollama. “[Generate a Chat Message](https://docs.ollama.com/api/chat).” API request fields and timing/token response metadata.
[^7]: Qwen. “[Qwen3-4B Model Card](https://huggingface.co/Qwen/Qwen3-4B).” Parameter count, native/extended context, framework requirements, and Apache 2.0 license metadata.
[^8]: Meta. “[Llama 3.2 3B Instruct Model Card](https://huggingface.co/meta-llama/Llama-3.2-3B-Instruct).” Context length, intended summarization use, post-training recipe, and Llama 3.2 Community License.
[^9]: Qwen. “[Qwen2.5-3B-Instruct Model Card](https://huggingface.co/Qwen/Qwen2.5-3B-Instruct).” Context length and `qwen-research` license metadata.
[^10]: Qwen. “[Qwen2.5-7B-Instruct Model Card](https://huggingface.co/Qwen/Qwen2.5-7B-Instruct).” Parameter count, long-context configuration, and Apache 2.0 license metadata.
[^11]: Google. “[Gemma 2 2B Instruct Model Card](https://huggingface.co/google/gemma-2-2b-it).” Model purpose and Gemma license; Google model-repository discussion confirms the 8,192-token context.
[^12]: Google DeepMind. “[Gemma 3 4B Instruct Model Card](https://huggingface.co/google/gemma-3-4b-it).” 128K input context, multimodal architecture, and Gemma terms.
[^13]: Nelson F. Liu et al. “[Lost in the Middle: How Language Models Use Long Contexts](https://arxiv.org/abs/2307.03172).” Transactions of the Association for Computational Linguistics, 2024.
[^14]: Hugging Face. “[DPO Trainer](https://huggingface.co/docs/trl/main/dpo_trainer).” Preference-data format and DPO implementation behavior.
[^15]: Hugging Face. “[PEFT LoRA](https://huggingface.co/docs/peft/main/package_reference/lora).” All-linear targeting and parameter-efficient adaptation guidance.
[^16]: Rafael Rafailov et al. “[Direct Preference Optimization: Your Language Model Is Secretly a Reward Model](https://arxiv.org/abs/2305.18290).” NeurIPS 2023.
[^17]: Hugging Face. “[TRL DPO Configuration](https://github.com/huggingface/trl/blob/main/trl/trainer/dpo_config.py).” Current default maximum sequence length and DPO configuration fields.
[^18]: ggml-org. “[llama.cpp Models and Quantization](https://github.com/ggml-org/llama.cpp/blob/master/docs/models.md).” GGUF conversion and quantization workflow.
