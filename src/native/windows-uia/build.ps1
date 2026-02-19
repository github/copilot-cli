$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$projectRoot = Resolve-Path "$scriptDir\..\..\.."
$csproj = "$projectRoot\src\native\windows-uia-dotnet\WindowsUIA.csproj"
$binDir = "$projectRoot\bin"

if (-not (Get-Command dotnet -ErrorAction SilentlyContinue)) {
    Write-Error "dotnet SDK not found. Install .NET SDK 9+ and re-run this script."
    exit 1
}

if (-not (Test-Path $binDir)) {
    New-Item -ItemType Directory -Path $binDir | Out-Null
}

Write-Host "Publishing $csproj to $binDir..."
dotnet publish $csproj -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -o $binDir

if ($LASTEXITCODE -eq 0) {
    Write-Host "Build successful: $binDir\WindowsUIA.exe"
} else {
    Write-Error "Build failed with exit code $LASTEXITCODE"
}
