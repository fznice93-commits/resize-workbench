# Internal Preview Codex Rules

Before doing anything, read `INSTALL_WITH_CODEX.md` completely.

- Work only inside this extracted directory. Do not search or read other projects, Keychain entries, personal images, or browser data.
- Run `VERIFY_PACKAGE.command` first. It is the offline identity, architecture, and Node preflight.
- If Node.js 22.13+ is missing, explain the requirement and obtain the user's approval before installing it. Never bypass the version gate.
- Obtain explicit user approval before any network access or `npm ci`. Dependencies are lockfile-only: never run `npm update`, `npm audit fix`, or `npm audit fix --force`, and never edit `package-lock.json`.
- Installation validation is Fake-only. Do not start a service, open a paid confirmation, access HiModels, or read a production Key.
- After installation, guide the user through Production Preview first. Only open Key Setup when the user asks. The user must type their own Key into the local page; never request, read, paste, echo, record, or transmit it.
- A real generation must be confirmed and clicked by the user personally. Never click or automate the paid confirmation.
- Share only redacted diagnostics. Never return images, Keys, Authorization values, Prompt bodies, or private machine paths.

