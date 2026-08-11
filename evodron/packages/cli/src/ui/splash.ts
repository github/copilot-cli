import chalk from 'chalk';

const LOGO = `
  ███████╗██╗   ██╗ ██████╗ ██████╗ ██████╗  ██████╗ ███╗   ██╗
  ██╔════╝██║   ██║██╔═══██╗██╔══██╗██╔══██╗██╔═══██╗████╗  ██║
  █████╗  ██║   ██║██║   ██║██║  ██║██████╔╝██║   ██║██╔██╗ ██║
  ██╔══╝  ╚██╗ ██╔╝██║   ██║██║  ██║██╔══██╗██║   ██║██║╚██╗██║
  ███████╗ ╚████╔╝ ╚██████╔╝██████╔╝██║  ██║╚██████╔╝██║ ╚████║
  ╚══════╝  ╚═══╝   ╚═════╝ ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝
`;

export function splash(): void {
  if (process.env['EVODRON_NO_SPLASH'] === '1') return;
  process.stdout.write(chalk.cyan(LOGO));
  process.stdout.write(chalk.dim('  AI-powered developer platform  ') + chalk.yellow('v0.1.0') + '\n');
  process.stdout.write(chalk.dim('  ─────────────────────────────────────────────────────────────\n'));
  process.stdout.write(
    chalk.dim(
      '  AI features powered by GitHub Copilot CLI (third-party, © GitHub, Inc.)\n',
    ),
  );
  process.stdout.write(chalk.dim('  EVODRON is not affiliated with GitHub or Microsoft.\n'));
  process.stdout.write(chalk.dim('  ─────────────────────────────────────────────────────────────\n\n'));
}
