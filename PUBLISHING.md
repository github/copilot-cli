# Publishing Guide

This guide covers how to publish the Copilot-Liku CLI to npm.

## Prerequisites

Before publishing, ensure you have:

1. **npm account**: Create one at [npmjs.com](https://www.npmjs.com/signup)
2. **npm login**: Run `npm login` and authenticate
3. **Access rights**: If publishing to an organization, ensure you have publishing rights
4. **Clean repository**: All changes committed, tests passing

## Pre-Publication Checklist

### 1. Version Update

Update the version in `package.json` following [Semantic Versioning](https://semver.org/):

```bash
# For a patch release (bug fixes)
npm version patch

# For a minor release (new features, backwards compatible)
npm version minor

# For a major release (breaking changes)
npm version major
```

This will:
- Update `package.json`
- Create a git tag
- Commit the change

### 2. Update Changelog

Document changes in `changelog.md`:
```markdown
## [1.0.0] - 2024-XX-XX

### Added
- Global npm installation support
- Comprehensive installation guides

### Changed
- Updated package.json with repository metadata

### Fixed
- Made CLI executable on all platforms
```

### 3. Verify Package Contents

Check what will be published:
```bash
npm pack --dry-run
```

Review the output to ensure:
- All necessary source files are included
- Documentation files are included
- Test files and development artifacts are excluded
- `.npmignore` is working correctly

### 4. Test Installation Locally

Test the package locally before publishing:

```bash
# Create a tarball
npm pack

# Install globally from the tarball
npm install -g copilot-liku-cli-0.0.1.tgz

# Test the command
liku --version
liku --help

# Uninstall when done testing
npm uninstall -g copilot-liku-cli
```

### 5. Run Tests

Ensure all tests pass:
```bash
npm test
npm run test:ui
```

## Publishing to npm

### First-Time Publication

For the first publication to npm:

```bash
# Login to npm
npm login

# Publish the package (public)
npm publish --access public

# Or for a scoped package
npm publish --access public
```

### Subsequent Releases

For version updates:

```bash
# 1. Update version
npm version patch  # or minor, or major

# 2. Push tags
git push origin main --tags

# 3. Publish
npm publish
```

## Automated Publishing with GitHub Actions

This repository includes automated publishing via GitHub Actions. Publishing is triggered when you create a GitHub release.

### Setup

The workflow is already configured in `.github/workflows/publish-npm.yml`. To enable it:

1. **Create an npm access token**:
   - Go to https://www.npmjs.com/settings/YOUR-USERNAME/tokens
   - Click "Generate New Token" → "Automation"
   - Copy the token

2. **Add token to GitHub secrets**:
   - Go to your repository settings
   - Navigate to Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: Paste your npm token
   - Click "Add secret"

### Usage

Once set up, publishing is automatic:

1. **Update version**:
   ```bash
   npm version patch  # or minor, or major
   git push origin main --tags
   ```

2. **Create a GitHub release**:
   - Go to https://github.com/TayDa64/copilot-Liku-cli/releases/new
   - Select the tag you created
   - Write release notes
   - Click "Publish release"

3. **Automated workflow runs**:
   - Checks out code
   - Installs dependencies
   - Runs tests
   - Verifies package contents
   - Publishes to npm automatically
   - Comments on release with install instructions

### Workflow Features

- ✅ Automatic version checking (won't republish existing versions)
- ✅ Package verification before publishing
- ✅ Test execution
- ✅ Automatic comment with install instructions
- ✅ Manual dispatch option for testing

For detailed release process, see [RELEASE_PROCESS.md](RELEASE_PROCESS.md).

## Manual Publishing to npm

If you prefer to publish manually instead of using the automated workflow:

### First-Time Publication

For the first publication to npm:

```bash
# Login to npm
npm login

# Publish the package (public)
npm publish --access public
```

### Subsequent Releases

For version updates:

```bash
# 1. Update version
npm version patch  # or minor, or major

# 2. Push tags
git push origin main --tags

# 3. Publish
npm publish
```

## Post-Publication

### 1. Verify Publication

```bash
# Check on npm
npm view copilot-liku-cli

# Test installation
npm install -g copilot-liku-cli
liku --version
```

### 2. Update Documentation

Update installation instructions if needed:
- README.md
- INSTALLATION.md
- QUICKSTART.md

### 3. Announce Release

- Create a GitHub release with release notes
- Update project status documentation
- Share on relevant channels

## Troubleshooting

### Error: Package name already exists

If someone else has registered the name:
1. Choose a different name in `package.json`
2. Or request transfer of the package if it's unused

### Error: Permission denied

Ensure you're logged in:
```bash
npm whoami  # Check who you're logged in as
npm login   # Login if needed
```

### Error: Failed to publish

Check:
- Version isn't already published: `npm view copilot-liku-cli versions`
- You have publish permissions
- Package name is available

### Version Already Published

If you need to fix a published version:
1. **Never unpublish** recent versions (npm policy)
2. Publish a patch version instead: `npm version patch && npm publish`

## Package Maintenance

### Deprecating a Version

If a version has issues:
```bash
npm deprecate copilot-liku-cli@0.0.1 "Critical bug, use 0.0.2 instead"
```

### Unpublishing

**Only for mistakes within 24 hours:**
```bash
npm unpublish copilot-liku-cli@0.0.1
```

⚠️ **Warning:** Unpublishing after 24 hours or if the package is widely used is against npm policy.

## Package Registry Alternatives

### GitHub Package Registry

To publish to GitHub Packages instead:

1. Update `.npmrc`:
```
@TayDa64:registry=https://npm.pkg.github.com
```

2. Update `package.json`:
```json
{
  "name": "@TayDa64/copilot-liku-cli",
  "repository": {
    "type": "git",
    "url": "https://github.com/TayDa64/copilot-Liku-cli.git"
  },
  "publishConfig": {
    "registry": "https://npm.pkg.github.com"
  }
}
```

3. Authenticate with GitHub token:
```bash
npm login --registry=https://npm.pkg.github.com
```

## Beta/Prerelease Versions

For testing before official release:

```bash
# Create a prerelease version
npm version prerelease --preid=beta

# Publish with beta tag
npm publish --tag beta

# Users install with
npm install -g copilot-liku-cli@beta
```

## Best Practices

1. **Use semantic versioning** consistently
2. **Test thoroughly** before publishing
3. **Maintain a changelog** for users
4. **Never publish secrets** or credentials
5. **Use .npmignore** to exclude unnecessary files
6. **Document breaking changes** clearly
7. **Respond to issues** from npm users
8. **Keep dependencies updated** for security

## Resources

- [npm Publishing Guide](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
- [Semantic Versioning](https://semver.org/)
- [npm CLI Documentation](https://docs.npmjs.com/cli/v10)
- [Creating npm Packages](https://docs.npmjs.com/creating-node-js-modules)

## Support

For issues with publishing:
- Check [npm status](https://status.npmjs.org/)
- Review [npm documentation](https://docs.npmjs.com/)
- Contact [npm support](https://www.npmjs.com/support)
