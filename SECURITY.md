# Security policy

## Reporting a vulnerability

Please **don't open a public issue**. Use GitHub's private reporting instead:
[Report a vulnerability](https://github.com/angeldelbiondo/claude-chat-bubbles/security/advisories/new).
You'll get a reply within 7 days.

## Scope

Chat Bubbles is a Claude Code mod: it runs inside your Claude Code session with
your permissions. It is designed to only draw, and any change that breaks one of
these promises is a vulnerability:

- No network requests.
- No file reads or writes, no processes.
- No model calls.
- No runtime dependencies.
- Stored data (your theme and options, via `$.store`) stays on your machine and
  is validated before use.

`claude plugin validate ./chat-bubbles` lists every engine API the module calls;
a pull request that adds a call outside `$.ui`, `$.state`, `$.store`,
`$.config.list`, `$.settings.read`, `$.command` or `$.clock` needs a stated reason.

## Supported versions

Only the latest release on `main` gets fixes.
