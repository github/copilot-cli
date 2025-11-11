# İscan'ın Sistem Monitörü - Performance & Health Check
# Bu script sistem durumunu izler ve sorunları erken tespit eder

Write-Host "🔍 İscan'ın Sistem Durumu Kontrolü" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# CPU ve Memory kullanımı
$cpu = Get-WmiObject win32_processor | Measure-Object -property LoadPercentage -Average
$memory = Get-WmiObject -Class win32_operatingsystem
$memUsage = [math]::Round((($memory.TotalVisibleMemorySize - $memory.FreePhysicalMemory) / $memory.TotalVisibleMemorySize) * 100, 2)

Write-Host "`n💻 Sistem Performansı:" -ForegroundColor Yellow
Write-Host "CPU Kullanımı: $($cpu.Average)%" -ForegroundColor $(if($cpu.Average -gt 80){"Red"}else{"Green"})
Write-Host "RAM Kullanımı: $memUsage%" -ForegroundColor $(if($memUsage -gt 85){"Red"}else{"Green"})

# Disk durumu
$disks = Get-WmiObject -Class Win32_LogicalDisk | Where-Object {$_.DriveType -eq 3}
Write-Host "`n💾 Disk Durumu:" -ForegroundColor Yellow
foreach ($disk in $disks) {
    $freeSpace = [math]::Round($disk.FreeSpace / 1GB, 2)
    $totalSize = [math]::Round($disk.Size / 1GB, 2)
    $usage = [math]::Round((($disk.Size - $disk.FreeSpace) / $disk.Size) * 100, 2)
    $color = if($usage -gt 90){"Red"}elseif($usage -gt 80){"Yellow"}else{"Green"}
    Write-Host "Drive $($disk.DeviceID) - $freeSpace GB free / $totalSize GB total ($usage% used)" -ForegroundColor $color
}

# Development araçları kontrolü
Write-Host "`n🛠️  Development Tools:" -ForegroundColor Yellow
$tools = @(
    @{Name="Python"; Command="python --version"},
    @{Name="Node.js"; Command="node --version"},
    @{Name="Git"; Command="git --version"},
    @{Name="Azure CLI"; Command="az --version | Select-String 'azure-cli'"},
    @{Name="Docker"; Command="docker --version"},
    @{Name="VS Code"; Command="code --version | Select-Object -First 1"}
)

foreach ($tool in $tools) {
    try {
        $result = Invoke-Expression $tool.Command -ErrorAction Stop
        Write-Host "✅ $($tool.Name): Ready" -ForegroundColor Green
    } catch {
        Write-Host "❌ $($tool.Name): Not available" -ForegroundColor Red
    }
}

# Network bağlantısı
Write-Host "`n🌐 Network Durumu:" -ForegroundColor Yellow
try {
    $ping = Test-NetConnection google.com -Port 80 -InformationLevel Quiet
    if ($ping) {
        Write-Host "✅ Internet bağlantısı: OK" -ForegroundColor Green
    } else {
        Write-Host "❌ Internet bağlantısı: Problem var" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Network testi başarısız" -ForegroundColor Red
}

# GitHub ve Azure login durumu
Write-Host "`n🔐 Authentication Durumu:" -ForegroundColor Yellow
try {
    $gitUser = git config --global user.name
    if ($gitUser) {
        Write-Host "✅ Git kullanıcısı: $gitUser" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Git kullanıcısı ayarlanmamış" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Git config okunamadı" -ForegroundColor Red
}

# Sistem uyarıları
Write-Host "`n⚠️  Öneriler:" -ForegroundColor Magenta
if ($cpu.Average -gt 80) {
    Write-Host "• CPU kullanımı yüksek - arka plan uygulamalarını kontrol et" -ForegroundColor Red
}
if ($memUsage -gt 85) {
    Write-Host "• RAM kullanımı yüksek - bazı uygulamaları kapat" -ForegroundColor Red
}
foreach ($disk in $disks) {
    $usage = [math]::Round((($disk.Size - $disk.FreeSpace) / $disk.Size) * 100, 2)
    if ($usage -gt 90) {
        Write-Host "• Disk $($disk.DeviceID) dolmak üzere - dosyaları temizle" -ForegroundColor Red
    }
}

Write-Host "`n✨ Sistem kontrol tamamlandı!" -ForegroundColor Cyan
Write-Host "Bu scripti istediğin zaman çalıştırabilirsin: ./system_monitor.ps1" -ForegroundColor Gray