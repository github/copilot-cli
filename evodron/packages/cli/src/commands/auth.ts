import { Command } from 'commander';
import chalk from 'chalk';
import * as readline from 'readline';
import { apiRequest } from '../services/api';
import { loadConfig, saveConfig, clearConfig } from '../services/config';
import type { ApiResponse, AuthTokens } from '@evodron/shared';

export function registerAuthCommands(program: Command): void {
  const auth = program.command('auth').description('Manage your EVODRON account');

  // ── evodron auth register ────────────────────────────────────────────────

  auth
    .command('register')
    .description('Create a new EVODRON account')
    .option('--ref <code>', 'Referral code from a friend')
    .action(async (opts: { ref?: string }) => {
      console.log(chalk.bold('\n✨ Create your EVODRON account\n'));

      const email = await prompt('Email: ');
      const username = await prompt('Username: ');
      const password = await promptPassword('Password (min 8 chars): ');

      const body: Record<string, string> = { email, username, password };
      if (opts.ref) body['referralCode'] = opts.ref;

      const res = await apiRequest<ApiResponse<AuthTokens & { username: string; userId: string; referralCode: string }>>(
        '/auth/register',
        { method: 'POST', body: JSON.stringify(body) },
      );

      if (!res.success) {
        console.error(chalk.red(`\n❌ Registration failed: ${res.error}`));
        process.exit(1);
      }

      saveConfig({
        accessToken: res.data.accessToken,
        refreshToken: res.data.refreshToken,
        userId: res.data.userId,
        username: res.data.username,
      });

      console.log(chalk.green(`\n✅ Welcome to EVODRON, ${res.data.username}!`));
      if (opts.ref) {
        console.log(chalk.yellow('🎁 You received onboarding credits for joining via referral!'));
      }
      console.log(chalk.dim(`\nYour referral code: ${chalk.bold(res.data.referralCode)}`));
    });

  // ── evodron auth login ───────────────────────────────────────────────────

  auth
    .command('login')
    .description('Log in to your EVODRON account')
    .action(async () => {
      console.log(chalk.bold('\n🔑 Log in to EVODRON\n'));
      const email = await prompt('Email: ');
      const password = await promptPassword('Password: ');

      const res = await apiRequest<ApiResponse<AuthTokens & { username: string; userId: string }>>(
        '/auth/login',
        { method: 'POST', body: JSON.stringify({ email, password }) },
      );

      if (!res.success) {
        console.error(chalk.red(`\n❌ Login failed: ${res.error}`));
        process.exit(1);
      }

      saveConfig({
        accessToken: res.data.accessToken,
        refreshToken: res.data.refreshToken,
        userId: res.data.userId,
        username: res.data.username,
      });

      console.log(chalk.green(`\n✅ Logged in as ${res.data.username}`));
    });

  // ── evodron auth logout ──────────────────────────────────────────────────

  auth
    .command('logout')
    .description('Log out of EVODRON')
    .action(async () => {
      const config = loadConfig();
      if (config.refreshToken) {
        await apiRequest('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken: config.refreshToken }),
        }).catch(() => {
          // best effort
        });
      }
      clearConfig();
      console.log(chalk.green('\n✅ Logged out'));
    });

  // ── evodron auth status ──────────────────────────────────────────────────

  auth
    .command('status')
    .description('Show current login status')
    .action(() => {
      const config = loadConfig();
      if (config.username && config.accessToken) {
        console.log(chalk.green(`\n✅ Logged in as ${chalk.bold(config.username)}`));
      } else {
        console.log(chalk.yellow('\n⚠️  Not logged in. Run: evodron auth login'));
      }
    });
}

// ─── Prompt helpers ───────────────────────────────────────────────────────────

function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function promptPassword(question: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(question);
    let password = '';
    process.stdin.setRawMode?.(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    const onData = (ch: string) => {
      if (ch === '\r' || ch === '\n') {
        process.stdin.setRawMode?.(false);
        process.stdin.pause();
        process.stdin.removeListener('data', onData);
        process.stdout.write('\n');
        resolve(password);
      } else if (ch === '\u0003') {
        process.exit();
      } else if (ch === '\u007f') {
        password = password.slice(0, -1);
      } else {
        password += ch;
      }
    };

    process.stdin.on('data', onData);
  });
}
