import { defineConfig } from "vitest/config";
export default defineConfig({test:{include:["test/model.quality.test.ts"],exclude:["dist/**","node_modules/**"],testTimeout:120_000,pool:"forks",maxWorkers:1}});
