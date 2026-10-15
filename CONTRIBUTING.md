# Contributing to ishraqa

Thanks for helping. This is a small, dependency-free Node.js CLI, and we'd like to keep it that way.

## Setup

```sh
git clone <this repo>
cd ishraqa-cli
node bin/ishraqa.js today      # public content, no account needed
npm test                       # node:test, no network
```

Node.js 18.17+ is the floor. CI runs Node 18, 20 and 22 on Linux, macOS and Windows.

## Layout

| Path | What it does |
| --- | --- |
| `bin/ishraqa.js` | Entry point |
| `src/cli.js` | Argument parsing and commands |
| `src/api.js` | HTTP calls (data and sign-in) |
| `src/session.js` | Session file (0600) and automatic token refresh |
| `src/access.js` | Who counts as a developer, club picking |
| `src/data.js` | The reads and writes each command needs |
| `src/quote.js` | Picks the daily quote exactly as the app does |
| `src/render.js` | Pure formatters (data in, text out) |
| `src/ui.js` | Colour, display width, wrapping, boxes, RTL alignment |
| `src/i18n.js` | English and Arabic strings, language detection |

## Ground rules

- **No new runtime dependencies** without a good reason in the PR.
- **Only the public client key and the user's own session.** Never add a privileged key, never send data anywhere other than Ishraqa.
- **Every string in both languages.** `test/validate.test.js` checks that `en` and `ar` define the same keys. Arabic copy uses natural Modern Standard Arabic.
- **Keep formatters pure** and test them: `render.js` and `ui.js` must not touch the network or the file system.
- **Tests never sign in, never send email codes and never post.** Anything that needs an account is tested with fixtures.
- Respect `NO_COLOR`, non-TTY output and `--json`.

## Pull requests

1. Open an issue first for anything larger than a fix.
2. Keep PRs focused. Run `npm test` before pushing.
3. Describe what changed and paste the terminal output for UI changes (both `--en` and `--ar` if text moved).

## Server changes

The CLI only uses existing server functions. If a feature needs a new one, open an issue that explains why. Maintainers decide and make server changes; a PR never changes the server by itself.

## Contact

hello@ishraqa.app
