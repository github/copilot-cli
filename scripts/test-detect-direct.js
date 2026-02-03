/**
 * Direct test of UIWatcher.detectElements with verbose logging
 */
const path = require('path');
const fs = require('fs');
const os = require('os');
const { exec } = require('child_process');

async function testDetectElementsDirectly() {
  console.log('=== Direct detectElements Test ===\n');
  
  // Test 1: Just copy the exact script from ui-watcher and run it manually
  const script = `
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

$targetWindow = ""
$maxElements = 200

$root = [System.Windows.Automation.AutomationElement]::RootElement

$condition = [System.Windows.Automation.Condition]::TrueCondition
$elements = $root.FindAll([System.Windows.Automation.TreeScope]::Descendants, $condition)

$results = @()
$count = 0

foreach ($el in $elements) {
    if ($count -ge $maxElements) { break }
    try {
        $rect = $el.Current.BoundingRectangle
        if ($rect.Width -le 0 -or $rect.Height -le 0) { continue }
        if ($rect.X -lt -10000 -or $rect.Y -lt -10000) { continue }
        
        $name = $el.Current.Name
        $ctrlType = $el.Current.ControlType.ProgrammaticName -replace 'ControlType\\.', ''
        $autoId = $el.Current.AutomationId
        $className = $el.Current.ClassName
        $isEnabled = $el.Current.IsEnabled
        
        if ([string]::IsNullOrWhiteSpace($name) -and [string]::IsNullOrWhiteSpace($autoId)) { continue }
        
        $id = "$ctrlType|$name|$autoId|$([int]$rect.X)|$([int]$rect.Y)"
        
        $results += @{
            id = $id
            name = $name
            type = $ctrlType
            automationId = $autoId
            className = $className
            bounds = @{
                x = [int]$rect.X
                y = [int]$rect.Y
                width = [int]$rect.Width
                height = [int]$rect.Height
            }
            center = @{
                x = [int]($rect.X + $rect.Width / 2)
                y = [int]($rect.Y + $rect.Height / 2)
            }
            isEnabled = $isEnabled
        }
        $count++
    } catch {}
}

$results | ConvertTo-Json -Depth 4 -Compress
`;

  const tempFile = path.join(os.tmpdir(), `liku-test-${Date.now()}.ps1`);
  console.log('Temp file:', tempFile);
  
  // Write script
  fs.writeFileSync(tempFile, script, 'utf8');
  console.log('Script written, executing...\n');
  
  return new Promise((resolve) => {
    const start = Date.now();
    exec(`powershell -NoProfile -ExecutionPolicy Bypass -File "${tempFile}"`,
      { encoding: 'utf8', timeout: 15000, maxBuffer: 10 * 1024 * 1024 },
      (error, stdout, stderr) => {
        const elapsed = Date.now() - start;
        console.log(`Execution time: ${elapsed}ms`);
        
        // Cleanup
        try { fs.unlinkSync(tempFile); } catch {}
        
        if (error) {
          console.log('\n❌ ERROR:', error.message);
          if (stderr) console.log('STDERR:', stderr);
          resolve();
          return;
        }
        
        if (stderr) {
          console.log('\nSTDERR:', stderr);
        }
        
        console.log('\nSTDOUT length:', stdout.length);
        console.log('STDOUT preview:', stdout.substring(0, 500));
        
        try {
          let elements = JSON.parse(stdout.trim() || '[]');
          if (!Array.isArray(elements)) elements = elements ? [elements] : [];
          console.log(`\n✅ Parsed ${elements.length} elements!`);
          
          // Show sample
          elements.slice(0, 10).forEach((el, i) => {
            console.log(`  ${i+1}. [${el.type}] "${el.name || el.automationId || '[unnamed]'}" at (${el.center?.x}, ${el.center?.y})`);
          });
        } catch (e) {
          console.log('\n❌ JSON parse error:', e.message);
          console.log('Raw output:', stdout.substring(0, 1000));
        }
        
        resolve();
      }
    );
  });
}

testDetectElementsDirectly().catch(console.error);
