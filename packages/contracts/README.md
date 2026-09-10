# Shared contracts

Reserved npm workspace: `@othie/contracts`. No runtime API or exports exist yet.
When the desktop or website needs an actual shared contract, place browser-safe types
and validation schemas here, declare an explicit workspace dependency, and add build checks.
Do not import engine filesystem, database, credentials, or provider code into the website.
Existing engine types remain in the engine until there is a second consumer.
