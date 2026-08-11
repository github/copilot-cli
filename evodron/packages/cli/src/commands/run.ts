import { Command } from 'commander';
import chalk from 'chalk';
import { spawn } from 'child_process';
import { loadConfig } from '../services/config';
import { apiRequest } from '../services/api';
import type { ApiResponse } from '@evodron/shared';

/**
 * `evodron run` — delegates to the GitHub Copilot CLI binary.
 *
 * The GitHub Copilot CLI is a third-party component, © GitHub, Inc.
 * EVODRON is not affiliated with GitHub or Microsoft.
 *
 * If `ghcs` (GitHub Copilot CLI) is not installed, the command prints
 * installation instructions and exits.
 */
export function registerRunCommand(program: Command): void {
  program
    .command('run [args...]')
    .description(
      'Run the GitHub Copilot CLI AI assistant (third-party component)\n' +
        '  All arguments are passed directly to the GitHub Copilot CLI.\n' +
        '  Example: evodron run -- "explain this code"',
    )
    .allowUnknownOption()
    .action(async (_args: string[], _opts: unknown, cmd: Command) => {
      const config = loadConfig();
      if (!config.accessToken) {
        console.error(chalk.yellow('\n⚠️  Please log in first: evodron auth login\n'));
        process.exit(1);
      }

      // Record session start
      let sessionId: string | undefined;
      try {
        if (config.accessToken) {
          const startRes = await apiRequest<ApiResponse<{ sessionId: string }>>('/sessions/start', {
            method: 'POST',
            auth: true,
            body: JSON.stringify({ clientVersion: '0.1.0' }),
          });
          if (startRes.success) {
            sessionId = startRes.data.sessionId;
          }
        }
      } catch {
        // Non-fatal: continue even if session tracking fails
      }

      const rawArgs = process.argv.slice(process.argv.indexOf('run') + 1).filter((a) => a !== '--');
      const copilotBin = findCopilotCli();

      if (!copilotBin) {
        console.error(chalk.red('\n❌ GitHub Copilot CLI not found.\n'));
        console.log(
          chalk.dim(
            '  Install it with:\n' +
              '    curl -fsSL https://gh.io/copilot-install | bash\n\n' +
              '  GitHub Copilot CLI is a third-party product by GitHub, Inc.\n' +
              '  EVODRON is not affiliated with GitHub or Microsoft.\n',
          ),
        );
        await endSession(sessionId, 0);
        process.exit(1);
      }

      console.log(chalk.dim(`\n  Launching GitHub Copilot CLI [third-party]...\n`));

      const child = spawn(copilotBin, rawArgs, {
        stdio: 'inherit',
        env: process.env,
      });

      let commandsCount = 0;

      child.on('close', async (code) => {
        commandsCount++;
        await endSession(sessionId, commandsCount);
        process.exit(code ?? 0);
      });

      child.on('error', async (err) => {
        console.error(chalk.red(`\n❌ Failed to launch Copilot CLI: ${err.message}\n`));
        await endSession(sessionId, commandsCount);
        process.exit(1);
      });
    });
}

function findCopilotCli(): string | null {
  const { execSync } = require('child_process') as typeof import('child_process');

  for (const bin of ['ghcs', 'gh']) {
    try {
      execSync(`which ${bin}`, { stdio: 'ignore' });
      return bin;
    } catch {
      // not found
    }
  }
  return null;
}

async function endSession(sessionId: string | undefined, commandsCount: number): Promise<void> {
  if (!sessionId) return;
  try {
    await apiRequest('/sessions/end', {
      method: 'POST',
      auth: true,
      body: JSON.stringify({ sessionId, commandsCount }),
    });
  } catch {
    // Non-fatal
  }
}
