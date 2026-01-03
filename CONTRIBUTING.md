# Contributing to POUM

## Development Setup

See [README.md](README.md#development-setup) for prerequisites and basic setup.

## Commit Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/) for automatic versioning.

| Prefix | Version Bump | Example |
|--------|--------------|---------|
| `feat:` | Minor (0.1.0 → 0.2.0) | `feat: add game cover support` |
| `fix:` | Patch (0.1.0 → 0.1.1) | `fix: resolve USB detection on Windows` |
| `perf:` | Patch | `perf: optimize ISO splitting speed` |
| `chore:`, `docs:`, `style:`, `refactor:`, `test:` | No bump | `docs: update README` |

## CI/CD Pipeline

### On Pull Request / Push to main
- TypeScript type checking
- Rust check + clippy lints
- No full builds (fast feedback)

### On Merge to main
1. CI checks pass
2. Version bump workflow analyzes commits since last tag
3. Bumps version based on commit prefixes
4. Updates `package.json`, `Cargo.toml`, `tauri.conf.json`
5. Creates git tag (e.g., `v0.2.0`)
6. Triggers release workflow via `workflow_dispatch`

### Release Build
- Triggered automatically by version bump (or manually via Actions UI)
- Builds frontend once, shares across platforms
- Builds Tauri for macOS (ARM + Intel), Windows, Linux
- Creates GitHub Release with all artifacts
- Publishes automatically

## Releasing

### Automatic (Recommended)
Just merge to `main` with conventional commit messages. The pipeline handles everything.

### Manual Release
```bash
# Bump version, commit, tag, and push
bun run release

# Or step by step:
bun run version patch   # or: minor, major, 1.0.0
git add -A && git commit -m "chore: release"
git tag v$(node -p "require('./package.json').version")
git push && git push --tags
```

## Version Sync

Version is stored in 3 files that must stay in sync:
- `package.json`
- `src-tauri/Cargo.toml`
- `src-tauri/tauri.conf.json`

Use `bun run version <patch|minor|major|x.y.z>` to update all at once.

## Pre-push Checklist

```bash
bun run build                           # TypeScript
cd src-tauri && cargo clippy -- -D warnings  # Rust lints
```
