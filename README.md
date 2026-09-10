# Othie AI

**Othie** is the product; **Othie AI** is the company and website brand.
This repository contains the product's npm workspaces, with one Git history and one root lockfile.

```text
apps/
  website/             Marketing, pricing, and downloads (ready for implementation)
  desktop/             Future setup/settings app
    packaging/         Existing macOS and Windows startup templates
packages/
  engine/              Local indexing, retrieval, CLI, and MCP bridge
  contracts/           Reserved for shared browser-safe types and schemas
models/
  manifest.json        Reserved model catalog; no downloadable artifacts yet
docs/                  Product plans and verification
```

The engine is implemented. The website, desktop app, and shared contracts are scaffolds.
The desktop packaging folder currently contains startup templates, not finished installers.
Model training code and datasets belong in a separate model-development repository when needed;
model weights are distributed as release artifacts, not committed here.

## Development

Use Node.js 24. Run these commands from the repository root:

```sh
npm install
npm run build
npm run typecheck
npm test
npm run test:mcp
```

Dependencies belong in the workspace that uses them, e.g. `npm install <dependency> --workspace=@othie/website`.
Commit only the root `package-lock.json`; do not create nested repositories or lockfiles.
Workspaces can build and release independently. Root build/typecheck/test scripts run whichever workspaces implement those scripts.

## Engine setup

```sh
npm run engine -- init --config config.json
npm run dev:engine -- --config config.json
```

`init` references the bundled sample documents with absolute paths and keeps state relative to your config.
It refuses to overwrite an existing config. Edit its sources to select your own documents.
Keyword retrieval works without Ollama; see the [engine guide](packages/engine/README.md) for models, credentials, host setup, and privacy boundaries.
Use `npm run engine -- <command>` for the compiled CLI and `npm run benchmark -- --config config.json` for benchmarking.
The root commands preserve the root working directory so configuration and state paths stay predictable.

## Existing setups after this move

The compiled CLI is now `packages/engine/dist/src/cli.js` and the MCP bridge is
`packages/engine/dist/src/mcp/bridge.js`. Stop existing engine/bridge processes, rebuild,
and regenerate host configuration with `npm run engine -- host-config ...`.
Update any LaunchAgent or scheduled-task paths too. This reorganization does not edit installed host settings.
If an existing config points at the old sample `./examples/` directory, change it to
`./packages/engine/examples/`. Personal source directories need no change.
Existing local state, credentials, and environment files stay where they are.

## Website handoff

Build in `apps/website` using the [website build brief](docs/website-build-plan.md).
Keep the engine and desktop implementation separate. Configure the website deployment for
`apps/website` while using the repository's shared npm lockfile and workspace installation.

See also [verification](docs/verification.md), [model notes](MODELS.md), and [security](SECURITY.md).
