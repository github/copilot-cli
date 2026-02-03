/**
 * Debug script to test PowerShell UI Automation element detection directly
 */
const { exec, execSync } = require('child_process');

async function testUIAutomation() {
  console.log('=== Testing PowerShell UI Automation ===\n');
  
  // First, test if PowerShell and UIAutomation work at all
  console.log('1. Testing basic PowerShell execution...');
  try {
    const basicResult = execSync('powershell -NoProfile -Command "echo hello"', { encoding: 'utf8' });
    console.log('   Basic PowerShell: OK -', basicResult.trim());
  } catch (e) {
    console.log('   FAILED:', e.message);
    return;
  }
  
  // Test Add-Type for UIAutomation
  console.log('\n2. Testing UIAutomation assembly load...');
  try {
    const result = execSync(`powershell -NoProfile -Command "Add-Type -AssemblyName UIAutomationClient; Write-Output 'UIAutomation loaded'"`, { encoding: 'utf8' });
    console.log('   UIAutomation load:', result.trim());
  } catch (e) {
    console.log('   FAILED:', e.message);
    return;
  }
  
  // Test getting root element
  console.log('\n3. Testing root element access...');
  try {
    const result = execSync(`powershell -NoProfile -Command "Add-Type -AssemblyName UIAutomationClient; $root = [System.Windows.Automation.AutomationElement]::RootElement; Write-Output ('Root element: ' + $root.Current.Name)"`, { encoding: 'utf8', timeout: 5000 });
    console.log('   Root element:', result.trim());
  } catch (e) {
    console.log('   FAILED:', e.message);
    return;
  }
  
  // Test simple element count (top-level windows only)
  console.log('\n4. Testing top-level window enumeration...');
  try {
    const script = `
      Add-Type -AssemblyName UIAutomationClient
      $root = [System.Windows.Automation.AutomationElement]::RootElement
      $condition = [System.Windows.Automation.Condition]::TrueCondition
      $children = $root.FindAll([System.Windows.Automation.TreeScope]::Children, $condition)
      Write-Output "Found $($children.Count) top-level windows"
      foreach ($child in $children | Select-Object -First 5) {
        try { Write-Output "  - $($child.Current.Name)" } catch {}
      }
    `;
    const result = execSync(`powershell -NoProfile -Command "${script.replace(/\n/g, ';')}"`, { encoding: 'utf8', timeout: 10000 });
    console.log('   ' + result.trim().replace(/\n/g, '\n   '));
  } catch (e) {
    console.log('   FAILED:', e.message);
  }
  
  // Test the actual detectElements script from ui-watcher.js
  console.log('\n5. Testing full element detection (simplified)...');
  const fullScript = `
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

$maxElements = 50
$root = [System.Windows.Automation.AutomationElement]::RootElement
$condition = [System.Windows.Automation.Condition]::TrueCondition
$elements = $root.FindAll([System.Windows.Automation.TreeScope]::Descendants, $condition)

Write-Output "Raw element count: $($elements.Count)"

$results = @()
$count = 0
$skippedNoBounds = 0
$skippedNoName = 0

foreach ($el in $elements) {
    if ($count -ge $maxElements) { break }
    try {
        $rect = $el.Current.BoundingRectangle
        if ($rect.Width -le 0 -or $rect.Height -le 0) { $skippedNoBounds++; continue }
        if ($rect.X -lt -10000 -or $rect.Y -lt -10000) { $skippedNoBounds++; continue }
        
        $name = $el.Current.Name
        $ctrlType = $el.Current.ControlType.ProgrammaticName -replace 'ControlType\\.', ''
        $autoId = $el.Current.AutomationId
        
        if ([string]::IsNullOrWhiteSpace($name) -and [string]::IsNullOrWhiteSpace($autoId)) { $skippedNoName++; continue }
        
        $results += @{
            name = $name
            type = $ctrlType
            x = [int]$rect.X
            y = [int]$rect.Y
        }
        $count++
    } catch {}
}

Write-Output "Collected: $count elements"
Write-Output "Skipped (no bounds): $skippedNoBounds"
Write-Output "Skipped (no name/id): $skippedNoName"
Write-Output ""
Write-Output "Sample elements:"
$results | Select-Object -First 10 | ForEach-Object { Write-Output "  - [$($_.type)] $($_.name) at ($($_.x), $($_.y))" }
`;

  try {
    console.log('   (This may take a few seconds...)\n');
    const result = execSync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${fullScript.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`, 
      { encoding: 'utf8', timeout: 30000, maxBuffer: 50 * 1024 * 1024 });
    console.log('   ' + result.trim().replace(/\n/g, '\n   '));
  } catch (e) {
    console.log('   FAILED:', e.message);
    if (e.stderr) console.log('   STDERR:', e.stderr);
    if (e.stdout) console.log('   STDOUT:', e.stdout);
  }
  
  // Test 6: Try using a file-based approach instead of inline script
  console.log('\n6. Testing with script file approach...');
  const fs = require('fs');
  const path = require('path');
  const tempScript = path.join(__dirname, 'temp-detect.ps1');
  
  const psScript = `
Add-Type -AssemblyName UIAutomationClient
$root = [System.Windows.Automation.AutomationElement]::RootElement
$condition = [System.Windows.Automation.Condition]::TrueCondition
$elements = $root.FindAll([System.Windows.Automation.TreeScope]::Children, $condition)

$results = @()
foreach ($el in $elements) {
    try {
        $rect = $el.Current.BoundingRectangle
        if ($rect.Width -gt 0 -and $rect.Height -gt 0) {
            $results += @{
                name = $el.Current.Name
                type = $el.Current.ControlType.ProgrammaticName -replace 'ControlType\\.', ''
                x = [int]$rect.X
                y = [int]$rect.Y
                width = [int]$rect.Width
                height = [int]$rect.Height
            }
        }
    } catch {}
}
$results | ConvertTo-Json -Compress
`;
  
  try {
    fs.writeFileSync(tempScript, psScript, 'utf8');
    const result = execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${tempScript}"`, 
      { encoding: 'utf8', timeout: 10000 });
    const json = JSON.parse(result.trim() || '[]');
    const elements = Array.isArray(json) ? json : [json];
    console.log(`   Found ${elements.length} top-level windows via file script`);
    elements.slice(0, 5).forEach(el => {
      console.log(`     - [${el.type}] "${el.name}" at (${el.x}, ${el.y})`);
    });
    fs.unlinkSync(tempScript);
  } catch (e) {
    console.log('   FAILED:', e.message);
    try { fs.unlinkSync(tempScript); } catch {}
  }
  
  console.log('\n=== Test Complete ===');
}

testUIAutomation().catch(console.error);
