Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName System.Windows.Forms

# Find the Pick Model button
$root = [System.Windows.Automation.AutomationElement]::RootElement
$condition = [System.Windows.Automation.Condition]::TrueCondition
$elements = $root.FindAll([System.Windows.Automation.TreeScope]::Descendants, $condition)

$found = $null
foreach ($el in $elements) {
    try {
        $name = $el.Current.Name
        $ctrlType = $el.Current.ControlType.ProgrammaticName
        # Must be a Button and start with "Pick Model"
        if ($ctrlType -like "*Button*" -and $name -like "Pick Model*") {
            $rect = $el.Current.BoundingRectangle
            # Must have positive coordinates (visible on screen)
            if ($rect.Width -gt 0 -and $rect.Height -gt 0 -and $rect.Y -gt 0) {
                $found = $el
                break
            }
        }
    } catch {}
}

if ($found) {
    Write-Host "Found: $($found.Current.Name)"
    $rect = $found.Current.BoundingRectangle
    $x = [int]($rect.X + $rect.Width / 2)
    $y = [int]($rect.Y + $rect.Height / 2)
    Write-Host "Clicking at ($x, $y)"
    
    # Focus the element first
    $found.SetFocus()
    Start-Sleep -Milliseconds 200
    
    # Move cursor and click
    [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point($x, $y)
    Start-Sleep -Milliseconds 100
    
    # Simulate click using SendInput
    Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public class MouseClick {
    [StructLayout(LayoutKind.Sequential)]
    public struct INPUT { public uint type; public MOUSEINPUT mi; }
    
    [StructLayout(LayoutKind.Sequential)]
    public struct MOUSEINPUT {
        public int dx, dy; public uint mouseData, dwFlags, time; public IntPtr dwExtraInfo;
    }
    
    [DllImport("user32.dll")] public static extern uint SendInput(uint n, INPUT[] inputs, int size);
    
    public static void Click() {
        var down = new INPUT { type = 0, mi = new MOUSEINPUT { dwFlags = 2 } };
        var up = new INPUT { type = 0, mi = new MOUSEINPUT { dwFlags = 4 } };
        SendInput(1, new[] { down }, Marshal.SizeOf(typeof(INPUT)));
        System.Threading.Thread.Sleep(50);
        SendInput(1, new[] { up }, Marshal.SizeOf(typeof(INPUT)));
    }
}
'@
    [MouseClick]::Click()
    Write-Host "Click sent!"
} else {
    Write-Host "Button not found"
}
