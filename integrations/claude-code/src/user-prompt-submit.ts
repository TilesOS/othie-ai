#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import { hookMain, hookOptionsFromProcess, runPromptHook, type HookDependencies, type HookOptions } from "@othie/hooks";

export { queryThroughCli, type ContextQuery, type HookOptions } from "@othie/hooks";
export const optionsFromProcess = (): HookOptions => hookOptionsFromProcess("claude-code", import.meta.url);
export const runHook = (rawInput: string, options: HookOptions, dependencies?: HookDependencies) => runPromptHook("claude-code", rawInput, options, dependencies);

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) void hookMain("claude-code", import.meta.url);
