import { Command } from 'commander';
import chalk from 'chalk';
import { apiRequest } from '../services/api';
import type { ApiResponse, ReferralStats } from '@evodron/shared';

export function registerReferralCommands(program: Command): void {
  const referral = program
    .command('referral')
    .description('Manage your EVODRON referrals');

  // ── evodron referral code ────────────────────────────────────────────────

  referral
    .command('code')
    .description('Show your referral code and link')
    .action(async () => {
      const res = await apiRequest<ApiResponse<{ code: string; link: string }>>(
        '/referrals/code',
        { auth: true },
      );

      if (!res.success) {
        console.error(chalk.red(`❌ ${res.error}`));
        process.exit(1);
      }

      console.log(chalk.bold('\n🔗 Your EVODRON Referral\n'));
      console.log(`  Code : ${chalk.cyan(res.data.code)}`);
      console.log(`  Link : ${chalk.cyan(res.data.link)}`);
      console.log(chalk.dim('\n  Share your link and earn credits when friends become active users!\n'));
    });

  // ── evodron referral stats ────────────────────────────────────────────────

  referral
    .command('stats')
    .description('Show your referral statistics')
    .action(async () => {
      const res = await apiRequest<ApiResponse<ReferralStats>>('/referrals/stats', { auth: true });

      if (!res.success) {
        console.error(chalk.red(`❌ ${res.error}`));
        process.exit(1);
      }

      const d = res.data;

      console.log(chalk.bold('\n📊 Referral Dashboard\n'));
      console.log(`  Code           : ${chalk.cyan(d.code)}`);
      console.log(`  Link           : ${chalk.cyan(d.link)}`);
      console.log(`  Total referrals: ${chalk.white(d.totalReferrals)}`);
      console.log(`  Active         : ${chalk.green(d.activeReferrals)}`);
      console.log(`  Pending        : ${chalk.yellow(d.pendingReferrals)}`);
      console.log(`  Credits earned : ${chalk.yellow(d.totalCreditsEarned + ' ⚡')}`);

      if (d.referrals.length > 0) {
        console.log(chalk.bold('\n  Referred users:\n'));
        for (const r of d.referrals) {
          const status =
            r.status === 'active' || r.status === 'rewarded'
              ? chalk.green(r.status)
              : r.status === 'fraud'
                ? chalk.red(r.status)
                : chalk.yellow(r.status);
          console.log(`    • ${chalk.white(r.refereeUsername)} — ${status}`);
        }
      }
      console.log();
    });
}
