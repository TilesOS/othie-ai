import { EXTRACTION_PROMPT_VERSION } from "../src/rules/extractor.js";
import { rm, symlink, writeFile } from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";
import { validateExtractedRules } from "../src/rules/extractor.js";
import { ManifestStore } from "../src/storage/manifest.js";
import { ContextCompiler } from "../src/context/compiler.js";
import { LanceIndex } from "../src/retrieval/lance-index.js";
import { ProviderRegistry } from "../src/providers/registry.js";
import { countTokens } from "../src/tokenizer.js";
import { packContext } from "../src/context/packing.js";
import { admitPath, isGlobalDocument } from "../src/security/paths.js";
import type { ChunkRecord, RuleRecord } from "../src/types.js";
import { fixture } from "./helpers.js";

const cleanups:string[]=[];afterEach(async()=>{for(const path of cleanups.splice(0))await rm(path,{recursive:true,force:true});});

describe("rules and whole-item budgets",()=>{
  it("labels citations relative to canonical source roots and never falls back to absolute paths",async()=>{
    const f=await fixture();cleanups.push(f.root);const policyPath=`${f.docs}/policy.md`,alias=`${f.root}/source-alias`;
    await writeFile(policyPath,"Support replies must arrive within four hours.");await symlink(f.docs,alias);
    f.config.profiles.company!.sources[0]!.root=alias;f.config.profiles.company!.sources[0]!.global_rule_documents=["policy.md"];
    const admitted=await admitPath(policyPath,f.config.profiles.company!,f.data);expect(admitted?.source.root).toBe(f.docs);expect(isGlobalDocument(admitted!.path,admitted!.source)).toBe(true);
    const rule:RuleRecord={id:"r",profile:"company",documentId:"d",revisionId:"v",sourcePath:policyPath,text:"Support replies must arrive within four hours.",category:"support",applicability:"all tickets",quotation:"within four hours",location:"paragraph 1",authorityPriority:80,global:true,modelIdentity:"test",promptVersion:EXTRACTION_PROMPT_VERSION};
    const result=packContext("company",f.config.profiles.company!,{query:"support"},{rules:[rule],excerpts:[],keywordAvailable:true,vectorAvailable:false},false,{corpus:1,rules:1});
    expect(result.brief.applicable_rules[0]?.citation.source).toBe("s1/policy.md");expect(result.text).not.toContain(f.root);
    const unmapped=packContext("company",f.config.profiles.company!,{query:"support"},{rules:[{...rule,sourcePath:"/outside/private-source.md"}],excerpts:[],keywordAvailable:true,vectorAvailable:false},false,{corpus:1,rules:1});
    expect(unmapped.brief.applicable_rules[0]?.citation.source).toMatch(/^unmapped\/[a-f0-9]{12}$/);expect(unmapped.text).not.toContain("/outside/private-source.md");
  });
  it("accepts only authoritative, exact source quotations",()=>{
    const chunk:ChunkRecord={id:"c1",documentId:"d1",revisionId:"r1",profile:"company",sourcePath:"policy.md",sourceRole:"authoritative",authorityPriority:80,retrievalWeight:1,heading:"Travel",location:"lines 2-3",text:"Flights must be economy, except when a medical accommodation applies.",contentHash:"h",tokenCount:12};
    const proposal={category:"travel",applicability:"flights",source_id:"c1",first_sentence:1,last_sentence:1};
    const valid=validateExtractedRules({rules:[proposal]},[chunk],false,"mock:model:r1");expect(valid).toHaveLength(1);expect(valid[0]?.quotation).toContain("except");expect(valid[0]?.text).toBe(chunk.text);
    expect(validateExtractedRules({rules:[{...proposal,source_id:"made-up"}]},[chunk],false,"mock:model:r1")).toHaveLength(0);
    expect(validateExtractedRules({rules:[{...proposal,last_sentence:2}]},[chunk],false,"mock:model:r1")).toHaveLength(0);
    expect(validateExtractedRules({rules:[{...proposal,source_id:"ref"}]},[{...chunk,id:"ref",sourceRole:"reference",text:"Claim"}],false,"mock:model:r1")).toHaveLength(0);
  });

  it("preserves contradictions and stays within 200/500 tokens without cutting items",async()=>{
    const f=await fixture();cleanups.push(f.root);const store=new ManifestStore(`${f.data}/manifest.sqlite`);const lance=new LanceIndex(f.data);const providers=new ProviderRegistry(f.config);const doc="d",rev="r";store.beginReplacement({documentId:doc,revisionId:rev,path:`${f.docs}/policy.md`,profile:"company",role:"authoritative",authority:90,weight:1,contentHash:"h",parserVersion:"1",chunkerVersion:"1",mtimeMs:1,size:1});store.publishReplacement(doc,rev,"h",[]);
    const base={profile:"company",documentId:doc,revisionId:rev,sourcePath:`${f.docs}/policy.md`,category:"travel",applicability:"international flights",location:"paragraph 1",authorityPriority:90,global:true,modelIdentity:"ollama:qwen3:4b:test",promptVersion:EXTRACTION_PROMPT_VERSION};
    const rules:RuleRecord[]=[{...base,id:"allow",text:"International flights may use business class.",quotation:"Business class is permitted."},{...base,id:"deny",text:"International flights must not use business class.",quotation:"Business class is prohibited."},{...base,id:"xml",category:"security",applicability:"all",text:"Never paste <credentials> & tokens into tickets — café teams included.",quotation:"Never paste <credentials> & tokens into tickets — café teams included."}];store.replaceRules(doc,rev,rules);
    const compiler=new ContextCompiler(f.config,store,lance,providers);const compact=await compiler.get("company",{query:"international flights credentials",max_tokens:200});expect(countTokens(compact.text,"o200k_base")).toBeLessThanOrEqual(200);expect(compact.status.conflicts).toBe(1);expect(compact.text).toContain("business class");expect(compact.status.omittedItems).toBeGreaterThan(0);expect(compact.brief.context_text).toBe(compact.text);expect(compact.brief.status).toEqual(compact.status);expect(compact.brief.applicable_rules.every((rule)=>compact.text.includes(`id="${rule.id}"`))).toBe(true);expect(compact.brief.permitted_excerpts.every((excerpt)=>compact.text.includes(excerpt.text))).toBe(true);expect(compact.brief.conflicts).toHaveLength(compact.status.conflicts);expect(compact.brief.external_facts).toEqual([]);expect(compact.brief.navigation_hints).toEqual([]);expect(compact.brief.verification_checks).toEqual([]);const full=await compiler.get("company",{query:"international flights credentials",max_tokens:500});expect(countTokens(full.text,"o200k_base")).toBeLessThanOrEqual(500);expect(full.text).toContain("&lt;credentials&gt;");expect(full.status.conflicts).toBe(1);expect(full.brief.applicable_rules.map((rule)=>rule.text)).toEqual(expect.arrayContaining(["International flights may use business class.","International flights must not use business class."]));expect(full.brief.applicable_rules.every((rule)=>!rule.citation.source.startsWith(f.docs))).toBe(true);
    f.config.profiles.company!.token_budget.enabled=false;const uncapped=await compiler.get("company",{query:"international flights credentials"});expect(uncapped.text).toContain("&lt;credentials&gt;");expect(uncapped.text).toContain("café");expect(uncapped.status.omittedItems).toBe(0);await lance.close();store.close();
  });

  it("fits verbatim receipt boundaries and replacements at 200 tokens while retaining quoted provenance",async()=>{
    const f=await fixture();cleanups.push(f.root);
    const text="Employees must submit receipts for expenses over $25. For expenses of exactly $25 or less, receipts are optional. If a required receipt is lost, employees must submit a written explanation instead.";
    const rule:RuleRecord={id:"receipts",profile:"company",documentId:"d",revisionId:"v",sourcePath:`${f.docs}/receipts.md`,text,quotation:text,category:"receipts",applicability:"employees",location:"paragraph 1",authorityPriority:80,global:false,modelIdentity:"test",promptVersion:EXTRACTION_PROMPT_VERSION};
    const result=packContext("company",f.config.profiles.company!,{query:"receipts",max_tokens:200},{rules:[rule],excerpts:[],keywordAvailable:true,vectorAvailable:false},false,{corpus:1,rules:1});
    expect(result.brief.applicable_rules).toHaveLength(1);
    expect(result.brief.applicable_rules[0]?.text).toBe(text);
    expect(result.brief.applicable_rules[0]?.citation.quote).toBe(text);
    expect(result.text).toContain('<text verbatim="true">');
    expect(result.status.tokenCount).toBe(countTokens(result.text,"o200k_base"));
    expect(result.status.tokenCount).toBeLessThanOrEqual(200);
    const distinct=packContext("company",f.config.profiles.company!,{query:"receipts",max_tokens:500},{rules:[{...rule,text:"Receipts above $25; a written explanation replaces lost receipts."}],excerpts:[],keywordAvailable:true,vectorAvailable:false},false,{corpus:1,rules:1});
    expect(distinct.text).toContain(`<quote>${text}</quote>`);
  });

  it("normalizes legacy request metadata and represents empty retrieval explicitly",async()=>{
    const f=await fixture();cleanups.push(f.root);const store=new ManifestStore(`${f.data}/manifest.sqlite`);const lance=new LanceIndex(f.data);const providers=new ProviderRegistry(f.config);const compiler=new ContextCompiler(f.config,store,lance,providers);
    const result=await compiler.get("company",{query:"nothing matches"});expect(result.status.mode).toBe("empty");expect(result.brief.schema_version).toBe("1");expect(result.brief.request).toEqual({surface:"unknown",phase:"on_demand"});expect(result.brief.applicable_rules).toEqual([]);expect(result.brief.permitted_excerpts).toEqual([]);expect(result.brief.synthesis).toBeUndefined();expect(result.brief.context_text).toContain("<items></items>");await lance.close();store.close();
  });

  it("fits both opposing verbatim rules at 200 tokens independently of generated label lengths", async () => {
    const f = await fixture(); cleanups.push(f.root);
    const base = { profile: "company", category: "permission", applicability: "employees", location: "lines 1-1",
      authorityPriority: 80, global: false, modelIdentity: "test", promptVersion: EXTRACTION_PROMPT_VERSION };
    const rules: RuleRecord[] = [
      { ...base, id: "allow", documentId: "a", revisionId: "av", sourcePath: `${f.docs}/current-export.md`,
        text: "Employees may export customer records as CSV for the migration project.", quotation: "Employees may export customer records as CSV for the migration project." },
      { ...base, id: "deny", documentId: "b", revisionId: "bv", sourcePath: `${f.docs}/legacy-export.md`,
        text: "Employees must not export customer records as CSV for the migration project.", quotation: "Employees must not export customer records as CSV for the migration project." },
    ];
    const pack = (rules: RuleRecord[]) => packContext("company", f.config.profiles.company!, { query: "CSV migration", max_tokens: 200 },
      { rules, excerpts: [], keywordAvailable: true, vectorAvailable: false }, false, { corpus: 1, rules: 1 });
    const result = pack(rules);
    expect(result.brief.applicable_rules.map((rule) => rule.text)).toEqual(rules.map((rule) => rule.text));
    expect(result.brief.conflicts[0]?.rule_ids).toEqual(["r1", "r2"]);
    expect(result.text).toContain('omitted="false"');
    expect(result.status.omittedItems).toBe(0);
    expect(result.status.tokenCount).toBe(countTokens(result.text, "o200k_base"));
    expect(result.status.tokenCount).toBeLessThanOrEqual(200);
    const long = pack(rules.map((rule) => ({ ...rule, category: "unverified label ".repeat(5), applicability: "unverified scope ".repeat(50) })));
    expect(long.text).toBe(result.text);
    expect(long.brief.applicable_rules[0]?.scope).toContain("unverified scope");
    expect(long.text).not.toContain("unverified");
  });

  it("coalesces and caches synthesis, then invalidates on rule and policy revision",async()=>{
    const f=await fixture();cleanups.push(f.root);const store=new ManifestStore(`${f.data}/manifest.sqlite`);const doc="d",rev="r";store.beginReplacement({documentId:doc,revisionId:rev,path:`${f.docs}/policy.md`,profile:"company",role:"authoritative",authority:90,weight:1,contentHash:"h",parserVersion:"1",chunkerVersion:"1",mtimeMs:1,size:1});store.publishReplacement(doc,rev,"h",[]);const rule:RuleRecord={id:"rule-1",profile:"company",documentId:doc,revisionId:rev,sourcePath:`${f.docs}/policy.md`,text:"Support replies must arrive within four hours.",category:"support",applicability:"all tickets",quotation:"within four hours",location:"paragraph 1",authorityPriority:90,global:true,modelIdentity:"ollama:qwen3:4b:test",promptVersion:EXTRACTION_PROMPT_VERSION};store.replaceRules(doc,rev,[rule]);let generations=0;const fakeProvider={id:"ollama",remote:false,embed:async()=>[Array(768).fill(0.01)],generateJson:async()=>{generations++;await new Promise((resolve)=>setTimeout(resolve,20));return{text:"Reply within four hours.",citation_ids:["rule-1"]};}};const fakeProviders={require:()=>fakeProvider};const fakeLance={keywordIds:async()=>[],vectorIds:async()=>[]};const compiler=new ContextCompiler(f.config,store,fakeLance as never,fakeProviders as never);const [synthesized]=await Promise.all([compiler.get("company",{query:"support",synthesize:true}),compiler.get("company",{query:"support",synthesize:true})]);expect(generations).toBe(1);expect(synthesized.brief.synthesis).toEqual({text:"Reply within four hours.",citations:[{source:"s1/policy.md",at:"paragraph 1"}]});expect(synthesized.text).toContain("<synthesis>");await compiler.get("company",{query:"support",synthesize:true});expect(generations).toBe(1);store.replaceRules(doc,rev,[rule]);await compiler.get("company",{query:"support",synthesize:true});expect(generations).toBe(2);f.config.profiles.company!.permitted_exports="rules_only";await compiler.get("company",{query:"support",synthesize:true});expect(generations).toBe(3);store.close();
  });

  it("never authorizes an unlisted remote provider",async()=>{const f=await fixture();cleanups.push(f.root);f.config.providers.push({id:"remote",kind:"openai_compatible",base_url:"https://api.openai.com",api_key_env:"OPENAI_API_KEY",allowed_redirect_origins:[]});const providers=new ProviderRegistry(f.config);expect(()=>providers.require(f.config.profiles.company!,"embeddings","remote")).toThrow(/not authorized/);});
});
