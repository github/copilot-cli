#!/usr/bin/env node
import 'dotenv/config';
import { program } from 'commander';
import { splash } from '../ui/splash';
import { registerAuthCommands } from '../commands/auth';
import { registerReferralCommands } from '../commands/referral';
import { registerRewardCommands } from '../commands/rewards';
import { registerStatsCommands } from '../commands/stats';
import { registerRunCommand } from '../commands/run';

splash();

program
  .name('evodron')
  .description('EVODRON — AI-powered developer platform\n\nNote: AI coding features are powered by the GitHub Copilot CLI (third-party component, not affiliated with EVODRON).')
  .version('0.1.0');

registerAuthCommands(program);
registerReferralCommands(program);
registerRewardCommands(program);
registerStatsCommands(program);
registerRunCommand(program);

program.parseAsync(process.argv).catch((err: unknown) => {
  console.error('Error:', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
