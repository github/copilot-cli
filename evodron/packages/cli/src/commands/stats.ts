import { Command } from 'commander';
import chalk from 'chalk';
import { apiRequest } from '../services/api';
import type { ApiResponse, UserStats } from '@evodron/shared';

export function registerStatsCommands(program: Command): void {
  program
    .command('stats')
    .description('Show your EVODRON usage statistics')
    .action(async () => {
      const res = await apiRequest<ApiResponse<UserStats>>('/stats', { auth: true });

      if (!res.success) {
        console.error(chalk.red(`❌ ${res.error}`));
        process.exit(1);
      }

      const d = res.data;

      const levelColor =
        d.level === 'gold'
          ? chalk.yellow
          : d.level === 'silver'
            ? chalk.gray
            : chalk.rgb(205, 127, 50); // bronze

      console.log(chalk.bold('\n📈 Your EVODRON Stats\n'));
      console.log(`  Level          : ${levelColor(d.level.toUpperCase() + ' ★')}`);
      console.log(`  Total sessions : ${chalk.white(d.totalSessions)}`);
      console.log(`  Total commands : ${chalk.white(d.totalCommands)}`);
      console.log(`  Credits        : ${chalk.yellow(d.totalCredits + ' ⚡')}`);
      console.log(`  Member since   : ${chalk.dim(new Date(d.joinedAt).toLocaleDateString())}`);
      console.log();
    });
}
