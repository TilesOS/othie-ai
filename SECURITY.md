# Security model

Kith limits accidental cross-profile disclosure with real-path admission, per-bridge credentials, profile allowlists, operation-scoped provider allowlists, HTTPS-only remote providers, redirect rejection, and rules-only export modes. These are not a sandbox against malicious software running as the same OS user.

Local indexing does not guarantee local consumption. An authorized MCP host can transmit returned context to its own model provider. Review every host's data handling.

Secrets stay outside `config.json`. State and credential files rely on per-user OS permissions; use FileVault or BitLocker. Logs must never include prompts or document contents.

Report vulnerabilities privately to the project owner. Do not include real credentials or source documents in reports.
