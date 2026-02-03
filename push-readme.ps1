$env:GIT_PAGER = ''
Set-Location C:\dev\copilot-Liku-cli
git add README.md
git commit -m "docs: Comprehensive README update for Liku Edition"
git push origin main --force-with-lease
Remove-Item $MyInvocation.MyCommand.Path -Force
