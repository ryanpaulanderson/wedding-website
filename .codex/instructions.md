# Git Workflow

- Start every change from an up-to-date `main` branch. Create a separate branch before editing; do not work directly on `main`.
- Use descriptive branch names in the form `<type>/<short-description>`, such as `feat/rsvp-form`, `fix/mobile-nav`, or `docs/update-readme`.
- Use Conventional Commits for commit messages:
  - Format: `<type>: <imperative description>`
  - Valid types include `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `build`, `ci`, `perf`, and `revert`.
  - Example: `feat: add RSVP form`
- Open pull requests against `main`, and keep the PR focused on the branch's change.
