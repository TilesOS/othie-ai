import * as parser from "@typescript-eslint/parser";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { ParserGlobCase } from "./lint-parser-fixtures";

const source = "const value: number = 1; export { value };";

export async function probeParserGlobCase(item: ParserGlobCase) {
  const directory = await mkdtemp(join(tmpdir(), "othie-parser-glob-"));
  try {
    await mkdir(join(directory, "src"));
    await writeFile(join(directory, "src/included.ts"), source);
    await writeFile(join(directory, "tsconfig.json"), JSON.stringify({
      compilerOptions: { strict: true, target: "es2022" }, include: ["src/**/*.ts"],
    }));
    const filePath = join(directory, item.file);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, source);
    // Project-service settings are cached globally; each case must start fresh.
    parser.clearCaches();
    try {
      const parsed = parser.parseForESLint(source, {
        filePath, tsconfigRootDir: directory,
        projectService: { allowDefaultProject: item.pattern === null ? [] : [item.pattern] },
        warnOnUnsupportedTypeScriptVersion: false,
      });
      const declaration = parsed.ast.body[0];
      if (!parsed.services.program || declaration?.type !== "VariableDeclaration") {
        return { outcome: "missing-program", type: null };
      }
      const checker = parsed.services.program.getTypeChecker();
      const node = parsed.services.esTreeNodeToTSNodeMap.get(declaration.declarations[0]!.id);
      return { outcome: "typed", type: checker.typeToString(checker.getTypeAtLocation(node)) };
    } catch (error) {
      // Publish only fixed classifications: parser errors can contain absolute host paths.
      const message = String(error);
      const outcome = /was included by allowDefaultProject but also was found/.test(message) ? "included-conflict"
        : /allowDefaultProject (?:contains the overly wide|glob .*contains a disallowed)/.test(message) ? "invalid-pattern"
        : /was not found by the project service/.test(message) ? "unmatched" : "unexpected-error";
      return { outcome, type: null };
    }
  } finally {
    parser.clearCaches();
    await rm(directory, { recursive: true, force: true });
  }
}
