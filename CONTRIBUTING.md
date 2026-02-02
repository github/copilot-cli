# Contributing to Copilot-Liku CLI

Thank you for your interest in contributing to Copilot-Liku CLI! This guide will help you get started with local development.

## Development Setup

### Prerequisites

- **Node.js** v22 or higher
- **npm** v10 or higher
- **Git**
- (On Windows) **PowerShell** v6 or higher

### Initial Setup

1. **Fork and clone the repository:**
```bash
git clone https://github.com/YOUR-USERNAME/copilot-Liku-cli.git
cd copilot-Liku-cli
```

2. **Install dependencies:**
```bash
npm install
```

3. **Link for global usage (recommended for testing):**
```bash
npm link
```

This creates a symlink from your global `node_modules` to your local development directory. Any changes you make will be immediately reflected when you run the `liku` command.

4. **Verify the setup:**
```bash
liku --version
liku --help
```

### Development Workflow

#### Testing Your Changes

After making changes to the CLI code:

1. **Test the CLI commands:**
```bash
liku --help           # Test help output
liku start            # Test starting the app
liku click "Button"   # Test automation commands
```

2. **Run existing tests:**
```bash
npm test              # Run test suite
npm run test:ui       # Run UI automation tests
```

3. **Manual testing:**
```bash
# Start the application
liku start

# Test specific commands
liku screenshot
liku window "VS Code"
```

#### Unlinking When Done

If you need to unlink your development version:
```bash
npm unlink -g copilot-liku-cli
```

Or to install the published version:
```bash
npm unlink -g copilot-liku-cli
npm install -g copilot-liku-cli
```

### Project Structure

```
copilot-Liku-cli/
├── src/
│   ├── cli/              # CLI implementation
│   │   ├── liku.js       # Main CLI entry point
│   │   ├── commands/     # Command implementations
│   │   └── util/         # CLI utilities
│   ├── main/             # Electron main process
│   ├── renderer/         # Electron renderer process
│   └── shared/           # Shared utilities
├── scripts/              # Build and test scripts
├── docs/                 # Additional documentation
└── package.json          # Package configuration with bin entry
```

### Making Changes

#### Adding a New CLI Command

1. Create a new command file in `src/cli/commands/`:
```javascript
// src/cli/commands/mycommand.js
async function run(args, options) {
  // Command implementation
  console.log('Running my command with args:', args);
  return { success: true };
}

module.exports = { run };
```

2. Register the command in `src/cli/liku.js`:
```javascript
const COMMANDS = {
  // ... existing commands
  mycommand: { 
    desc: 'Description of my command', 
    file: 'mycommand',
    args: '[optional-arg]' 
  },
};
```

3. Test your command:
```bash
liku mycommand --help
```

#### Modifying the CLI Parser

The main CLI logic is in `src/cli/liku.js`. Key functions:
- `parseArgs()` - Parses command-line arguments
- `executeCommand()` - Loads and runs command modules
- `showHelp()` - Displays help text

### Code Style

- Follow existing code conventions
- Use meaningful variable names
- Add comments for complex logic
- Keep functions focused and small

### Testing Guidelines

1. **Test your changes locally** before submitting a PR
2. **Ensure existing tests pass**: `npm test`
3. **Add tests for new features** when applicable
4. **Test cross-platform** if possible (Windows, macOS, Linux)

### Submitting Changes

1. **Create a feature branch:**
```bash
git checkout -b feature/my-feature
```

2. **Make your changes and commit:**
```bash
git add .
git commit -m "Add feature: description"
```

3. **Push to your fork:**
```bash
git push origin feature/my-feature
```

4. **Open a Pull Request** on GitHub with:
   - Clear description of changes
   - Reasoning for the changes
   - Any testing performed
   - Screenshots if UI changes

### Troubleshooting

#### `liku` command not found after `npm link`

Make sure npm's global bin directory is in your PATH:
```bash
npm bin -g
```

Add the output directory to your PATH if needed.

#### Changes not reflected when running `liku`

1. Verify you're linked to the local version:
```bash
which liku          # Unix/Mac
where liku          # Windows
```

2. Re-link if needed:
```bash
npm unlink -g copilot-liku-cli
npm link
```

#### Permission errors with `npm link`

On some systems, you may need to configure npm to use a user-local prefix:
```bash
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
```

Then add `~/.npm-global/bin` to your PATH.

### Additional Resources

- [npm link documentation](https://docs.npmjs.com/cli/v10/commands/npm-link)
- [npm bin configuration](https://docs.npmjs.com/cli/v10/configuring-npm/folders#executables)
- [Project Architecture](ARCHITECTURE.md)
- [Testing Guide](TESTING.md)

### Getting Help

- Check existing [GitHub Issues](https://github.com/TayDa64/copilot-Liku-cli/issues)
- Join discussions in the repository
- Review documentation files in the repo

Thank you for contributing! 🎉
