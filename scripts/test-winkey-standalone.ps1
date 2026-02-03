# Test Script: Standalone Win+R test WITHOUT Electron running
# This confirms SendInput works when focus is on desktop
# 
# INSTRUCTIONS:
# 1. Close the Electron app (copilot-liku)
# 2. Click on desktop to focus it
# 3. Run this script: powershell -ExecutionPolicy Bypass -File .\test-winkey-standalone.ps1
# 4. The Run dialog should open

Write-Host "This script tests Win+R using SendInput" -ForegroundColor Cyan
Write-Host "IMPORTANT: Click on the desktop to focus it, then come back here." -ForegroundColor Yellow
Write-Host ""
Write-Host "Starting in 3 seconds..." -ForegroundColor Green
Start-Sleep -Seconds 3

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class WinKeyTest {
    [StructLayout(LayoutKind.Sequential)]
    public struct INPUT {
        public uint type;
        public InputUnion U;
    }

    [StructLayout(LayoutKind.Explicit)]
    public struct InputUnion {
        [FieldOffset(0)] public MOUSEINPUT mi;
        [FieldOffset(0)] public KEYBDINPUT ki;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct MOUSEINPUT {
        public int dx, dy;
        public uint mouseData, dwFlags, time;
        public IntPtr dwExtraInfo;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct KEYBDINPUT {
        public ushort wVk;
        public ushort wScan;
        public uint dwFlags;
        public uint time;
        public IntPtr dwExtraInfo;
    }

    public const uint INPUT_KEYBOARD = 1;
    public const uint KEYEVENTF_KEYUP = 0x0002;
    public const ushort VK_LWIN = 0x5B;
    public const ushort VK_R = 0x52;

    [DllImport("user32.dll", SetLastError = true)]
    public static extern uint SendInput(uint nInputs, INPUT[] pInputs, int cbSize);

    public static void KeyDown(ushort vk) {
        INPUT[] inputs = new INPUT[1];
        inputs[0].type = INPUT_KEYBOARD;
        inputs[0].U.ki.wVk = vk;
        inputs[0].U.ki.dwFlags = 0;
        uint result = SendInput(1, inputs, Marshal.SizeOf(typeof(INPUT)));
        Console.WriteLine("KeyDown " + vk.ToString("X2") + " result: " + result);
    }

    public static void KeyUp(ushort vk) {
        INPUT[] inputs = new INPUT[1];
        inputs[0].type = INPUT_KEYBOARD;
        inputs[0].U.ki.wVk = vk;
        inputs[0].U.ki.dwFlags = KEYEVENTF_KEYUP;
        uint result = SendInput(1, inputs, Marshal.SizeOf(typeof(INPUT)));
        Console.WriteLine("KeyUp " + vk.ToString("X2") + " result: " + result);
    }

    public static void PressWinR() {
        Console.WriteLine("Pressing Win+R...");
        KeyDown(VK_LWIN);
        System.Threading.Thread.Sleep(50);
        KeyDown(VK_R);
        System.Threading.Thread.Sleep(50);
        KeyUp(VK_R);
        System.Threading.Thread.Sleep(50);
        KeyUp(VK_LWIN);
        Console.WriteLine("Win+R sent!");
    }
}
"@

# Test: Focus should be on desktop (you clicked it)
Write-Host "Sending Win+R now..." -ForegroundColor Cyan
[WinKeyTest]::PressWinR()

Write-Host ""
Write-Host "Did the Run dialog open? If yes, the issue is focus (Electron stealing input)." -ForegroundColor Yellow
Write-Host "If no, the issue might be UIPI or other system restriction." -ForegroundColor Yellow
