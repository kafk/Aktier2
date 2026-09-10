# Workspace Guidelines for Aktier2

## Direct Execution
- Always proceed with execution immediately without waiting for plan approval or asking trivial confirmation questions.

## Version Bump on Git Commits
- For every new commit/push, automatically increment `APP_VERSION` in [src/components/Header.tsx](file:///src/components/Header.tsx) (e.g. `1.40` -> `1.41` -> `1.42`) so the deployed web UI displays the new version.
