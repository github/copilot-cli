# 📊 İSCAN İÇİN TERMINAL AKIŞ GÖRÜNTÜSİ

function Show-CommandFlow {
    param(
        [string]$Command,
        [string]$Description,
        [string]$Expected
    )
    
    Write-Host "`n🔄 " -NoNewline -ForegroundColor Cyan
    Write-Host "İŞLEM BAŞLIYOR: " -NoNewline -ForegroundColor Yellow
    Write-Host $Description -ForegroundColor White
    
    Write-Host "💻 " -NoNewline -ForegroundColor Green
    Write-Host "KOMUT: " -NoNewline -ForegroundColor Gray
    Write-Host $Command -ForegroundColor Yellow
    
    Write-Host "🎯 " -NoNewline -ForegroundColor Blue
    Write-Host "BEKLENİYOR: " -NoNewline -ForegroundColor Gray
    Write-Host $Expected -ForegroundColor Cyan
    
    Write-Host "⏳ Çalıştırılıyor..." -ForegroundColor Magenta
    Write-Host "─" * 80 -ForegroundColor DarkGray
}

function Show-CommandResult {
    param(
        [string]$Status,
        [string]$Result
    )
    
    if ($Status -eq "Success") {
        Write-Host "✅ " -NoNewline -ForegroundColor Green
        Write-Host "BAŞARILI: " -NoNewline -ForegroundColor Green
    } else {
        Write-Host "❌ " -NoNewline -ForegroundColor Red
        Write-Host "HATA: " -NoNewline -ForegroundColor Red
    }
    
    Write-Host $Result -ForegroundColor White
    Write-Host "═" * 80 -ForegroundColor DarkGray
    Write-Host ""
}

# KULLANIM ÖRNEĞİ:
Show-CommandFlow -Command "docker --version" -Description "Docker sürümünü kontrol et" -Expected "Docker version 28.5.1"