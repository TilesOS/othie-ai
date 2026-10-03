#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import { hookMain, hookOptionsFromProcess, runPromptHook, type HookDependencies, type HookOptions } from "@othie/hooks";

export { queryThroughCli, type ContextQuery, type HookOptions } from "@othie/hooks";
export const optionsFromProcess = (): HookOptions => hookOptionsFromProcess("codex", import.meta.url);
export const runHook = (rawInput: string, options: HookOptions, dependencies?: HookDependencies) => runPromptHook("codex", rawInput, options, dependencies);

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) void hookMain("codex", import.meta.url);
