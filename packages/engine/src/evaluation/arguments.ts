// Acceptance tools must not silently substitute a baseline when a flag is mistyped.
export function evaluationArguments(argv: string[], allowed: readonly string[], label: string): ReadonlyMap<string, string> {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index]!, name = flag.slice(2), value = argv[index + 1];
    if (!flag.startsWith("--") || !allowed.includes(name)) throw new Error(`Unknown ${label} argument: ${flag}`);
    if (values.has(name)) throw new Error(`Duplicate ${label} argument: ${flag}`);
    if (!value || value.startsWith("--")) throw new Error(`${flag} requires a value`);
    values.set(name, value);
  }
  return values;
}
