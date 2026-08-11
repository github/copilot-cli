import { Command } from 'commander';
import chalk from 'chalk';
import { apiRequest } from '../services/api';
import type { ApiResponse, Reward } from '@evodron/shared';

export function registerRewardCommands(program: Command): void {
  const rewards = program
    .command('rewards')
    .description('View your EVODRON credits and reward history');

  rewards
    .command('history')
    .alias('ls')
    .description('Show your reward history')
    .action(async () => {
      const res = await apiRequest<ApiResponse<{ total: number; rewards: Reward[] }>>(
        '/rewards',
        { auth: true },
      );

      if (!res.success) {
        console.error(chalk.red(`❌ ${res.error}`));
        process.exit(1);
      }

      console.log(chalk.bold('\n⚡ EVODRON Credits\n'));
      console.log(`  Total balance : ${chalk.yellow(res.data.total + ' credits')}`);

      if (res.data.rewards.length === 0) {
        console.log(chalk.dim('\n  No rewards yet. Refer friends to earn credits!\n'));
        return;
      }

      console.log(chalk.bold('\n  History:\n'));
      for (const r of res.data.rewards) {
        const date = new Date(r.createdAt).toLocaleDateString();
        console.log(
          `    ${chalk.dim(date)}  ${chalk.green('+' + r.amount + ' ⚡')}  ${chalk.dim(r.source)}`,
        );
      }
      console.log();
    });

  rewards
    .command('rules')
    .description('Show active reward rules')
    .action(async () => {
      const res = await apiRequest<ApiResponse<{ rules: Array<{ name: string; description: string | null; credits: number }> }>>(
        '/rewards/rules',
        { auth: true },
      );

      if (!res.success) {
        console.error(chalk.red(`❌ ${res.error}`));
        process.exit(1);
      }

      console.log(chalk.bold('\n📋 Active Reward Rules\n'));
      for (const rule of res.data.rules) {
        console.log(`  • ${chalk.cyan(rule.name)} — ${chalk.yellow(rule.credits + ' credits')}`);
        if (rule.description) {
          console.log(`    ${chalk.dim(rule.description)}`);
        }
      }
      console.log(chalk.dim('\n  ⚠️  Credits are virtual and have no monetary value.\n'));
    });
}
