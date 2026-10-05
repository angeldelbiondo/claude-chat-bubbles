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
- Your prompts and slash commands are read only by the `session.append` hook, to
  see whether each carries an image or file. Only the row id and a yes/no are
  kept (in session memory and in the plugin store, at most 2000 entries); no text
  is kept. Nothing leaves the process.

`claude plugin validate ./chat-bubbles` lists every engine API the module calls;
a pull request that adds a call outside `$.ui`, `$.state`, `$.store`,
`$.config.list`, `$.settings.read`, `$.command`, `$.clock` or the
`session.append` hook for prompts and commands needs a stated reason.

## Supported versions

Only the latest release on `main` gets fixes.
