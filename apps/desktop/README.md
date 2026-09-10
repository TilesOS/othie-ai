# Othie desktop

Reserved npm workspace: `@othie/desktop`. This will own onboarding, permissions,
model downloads, host integration setup, ongoing settings, and installer/update packaging.

`packaging/` contains the existing manual macOS LaunchAgent and Windows scheduled-task
templates. These are not complete signed installers or an implemented desktop app.
The desktop app should package a compatible engine from `packages/engine` and use its
public interfaces; indexing and retrieval logic stay in the engine.
