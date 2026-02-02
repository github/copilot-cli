# Release Process

This document describes the process for creating and publishing a new release of Copilot-Liku CLI.

## Release Checklist

### 1. Pre-Release Preparation

- [ ] All planned features/fixes are merged to `main`
- [ ] All tests are passing
- [ ] Documentation is up to date
- [ ] changelog.md is updated with release notes
- [ ] No known critical bugs

### 2. Version Bump

Update the version in `package.json` using npm:

```bash
# For a patch release (bug fixes): 0.0.1 -> 0.0.2
npm version patch

# For a minor release (new features): 0.0.1 -> 0.1.0
npm version minor

# For a major release (breaking changes): 0.0.1 -> 1.0.0
npm version major
```

This will:
- Update `package.json`
- Create a git commit
- Create a git tag

### 3. Update Changelog

Edit `changelog.md` to document all changes:

```markdown
## [1.0.0] - 2024-XX-XX

### Added
- New CLI commands for automation
- Global npm installation support
- Comprehensive documentation

### Changed
- Improved error handling
- Updated dependencies

### Fixed
- Fixed issue with PATH on Windows
- Resolved CLI startup errors

### Breaking Changes
- Renamed command `foo` to `bar`
```

### 4. Push Changes

```bash
# Push the commit and tag
git push origin main
git push origin --tags
```

### 5. Create GitHub Release

#### Option 1: Via GitHub Web Interface

1. Go to https://github.com/TayDa64/copilot-Liku-cli/releases/new
2. Select the tag you just created (e.g., `v1.0.0`)
3. Set release title: `v1.0.0 - Release Name`
4. Copy release notes from changelog
5. Mark as pre-release if beta/alpha
6. Click "Publish release"

#### Option 2: Via GitHub CLI

```bash
gh release create v1.0.0 \
  --title "v1.0.0 - Release Name" \
  --notes-file RELEASE_NOTES.md
```

### 6. Automated Publishing

Once the release is published on GitHub:

1. The `publish-npm.yml` workflow will automatically trigger
2. It will run tests
3. Verify package contents
4. Publish to npm with `NPM_TOKEN` secret
5. Comment on the release with install instructions

### 7. Verify Publication

After the workflow completes:

```bash
# Check on npm
npm view copilot-liku-cli

# Test installation
npm install -g copilot-liku-cli@latest
liku --version

# Verify it's the correct version
```

### 8. Post-Release

- [ ] Announce release on relevant channels
- [ ] Update project board/issues
- [ ] Monitor for bug reports
- [ ] Respond to user feedback

## Release Types

### Patch Release (0.0.x)

For bug fixes and minor updates:
```bash
npm version patch
git push origin main --tags
```

### Minor Release (0.x.0)

For new features (backwards compatible):
```bash
npm version minor
git push origin main --tags
```

### Major Release (x.0.0)

For breaking changes:
```bash
npm version major
git push origin main --tags
```

### Pre-release (Beta/Alpha)

For testing before official release:
```bash
npm version prerelease --preid=beta
npm publish --tag beta
git push origin main --tags
```

Users can install with:
```bash
npm install -g copilot-liku-cli@beta
```

## Hotfix Process

For urgent fixes to a released version:

1. Create a hotfix branch from the tag:
```bash
git checkout -b hotfix/v1.0.1 v1.0.0
```

2. Make the fix and commit

3. Bump version:
```bash
npm version patch
```

4. Create PR and merge to main

5. Create release as normal

## Rollback

If a release has critical issues:

### Option 1: Deprecate and Release Fix

```bash
# Deprecate the broken version
npm deprecate copilot-liku-cli@1.0.0 "Critical bug, use 1.0.1 instead"

# Release a fix
npm version patch
# ... follow normal release process
```

### Option 2: Unpublish (within 24 hours only)

```bash
# Only use within 24 hours of publish
npm unpublish copilot-liku-cli@1.0.0
```

⚠️ **Warning**: Unpublishing after 24 hours is against npm policy.

## Release Notes Template

Use this template for release notes:

```markdown
# v1.0.0 - Major Feature Release

## 🎉 What's New

- **Feature 1**: Description of new feature
- **Feature 2**: Description of another feature

## 🐛 Bug Fixes

- Fixed issue with X (#123)
- Resolved Y problem (#456)

## 📚 Documentation

- Updated installation guide
- Added examples for new features

## 💥 Breaking Changes

- Changed command `old` to `new` (migration guide: link)
- Removed deprecated feature X

## 🔧 Dependencies

- Updated electron to v35.7.5
- Updated other-package to v2.0.0

## 📦 Installation

```bash
npm install -g copilot-liku-cli
```

## 🙏 Contributors

Thank you to everyone who contributed to this release!

- @contributor1
- @contributor2
```

## Automation Setup

### Required Secrets

Add these to GitHub repository secrets:

1. **NPM_TOKEN**: npm access token for publishing
   - Create at: https://www.npmjs.com/settings/YOUR-USERNAME/tokens
   - Type: Automation token
   - Scope: Read and write

### Workflow Triggers

The publish workflow triggers on:
- **Release published**: Automatic on GitHub release
- **Manual dispatch**: Via Actions tab for testing

## Troubleshooting

### Workflow Fails

Check:
- NPM_TOKEN is set correctly
- Version isn't already published
- Tests are passing
- Package builds successfully

### Version Already Published

If you need to republish:
1. Increment version: `npm version patch`
2. Push and create new release

### Permission Errors

Ensure:
- NPM_TOKEN has publish permissions
- Token hasn't expired
- Package name isn't taken by someone else

## Best Practices

1. **Test before releasing**: Always test on a local or beta channel first
2. **Semantic versioning**: Follow semver strictly
3. **Changelog maintenance**: Keep detailed release notes
4. **Deprecation warnings**: Give users advance notice of breaking changes
5. **Security updates**: Prioritize and release quickly
6. **Communication**: Announce releases to users

## Resources

- [Semantic Versioning](https://semver.org/)
- [GitHub Releases](https://docs.github.com/en/repositories/releasing-projects-on-github)
- [npm Publishing](https://docs.npmjs.com/cli/v10/commands/npm-publish)
- [GitHub Actions](https://docs.github.com/en/actions)
