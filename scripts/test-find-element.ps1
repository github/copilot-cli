Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

$searchText = "Pick Model"

$root = [System.Windows.Automation.AutomationElement]::RootElement
$condition = [System.Windows.Automation.Condition]::TrueCondition
$elements = $root.FindAll([System.Windows.Automation.TreeScope]::Descendants, $condition)

Write-Host "Total elements found: $($elements.Count)"

$count = 0
foreach ($el in $elements) {
    try {
        $name = $el.Current.Name
        if ($name -like "*$searchText*") {
            $count++
            $rect = $el.Current.BoundingRectangle
            $ctrlType = $el.Current.ControlType.ProgrammaticName
            Write-Host "[$count] $name"
            Write-Host "    Type: $ctrlType"
            Write-Host "    Bounds: ($([int]$rect.X), $([int]$rect.Y)) $([int]$rect.Width)x$([int]$rect.Height)"
        }
    } catch {}
}

Write-Host "`nMatching elements: $count"
