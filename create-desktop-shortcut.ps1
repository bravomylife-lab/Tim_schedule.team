# Tim A&R Manager 바탕화면 바로가기 생성 스크립트

$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [System.Environment]::GetFolderPath('Desktop')
$ShortcutPath = Join-Path $DesktopPath "Tim A&R Manager.lnk"
$TargetPath = Join-Path $PSScriptRoot "Tim 실행.bat"
$IconPath = Join-Path $PSScriptRoot "tim-icon.ico"

# 바로가기 생성
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = "`"$TargetPath`""
$Shortcut.WorkingDirectory = "$PSScriptRoot"
$Shortcut.Description = "Tim A&R Scheduling Manager - PEERMUSIC 전문 비서"

# 아이콘이 있으면 설정 (없으면 기본 아이콘 사용)
if (Test-Path $IconPath) {
    $Shortcut.IconLocation = $IconPath
}

$Shortcut.Save()

Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "바탕화면 바로가기 생성 완료!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "바탕화면의 'Tim A&R Manager' 아이콘을" -ForegroundColor White
Write-Host "더블클릭하면 자동으로 서버가 시작되고" -ForegroundColor White
Write-Host "브라우저가 열립니다." -ForegroundColor White
Write-Host ""
Write-Host "위치: $ShortcutPath" -ForegroundColor Gray
Write-Host ""
Write-Host "3초 후 자동으로 닫힙니다..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
