# Tim A&R Manager 바탕화면 바로가기 설치

$shell = New-Object -ComObject WScript.Shell
$desktop = [System.Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktop "Tim A&R Manager.lnk"

$projectPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$batFile = Join-Path $projectPath "Tim 실행.bat"

$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $batFile
$shortcut.WorkingDirectory = $projectPath
$shortcut.Description = "Tim A&R Scheduling Manager"
$shortcut.Save()

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " 설치 완료!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "바탕화면에 'Tim A&R Manager' 바로가기가" -ForegroundColor White
Write-Host "생성되었습니다." -ForegroundColor White
Write-Host ""
Write-Host "사용 방법:" -ForegroundColor Yellow
Write-Host "  1. 바탕화면의 'Tim A&R Manager' 더블클릭" -ForegroundColor White
Write-Host "  2. 서버 자동 시작 + 브라우저 자동 실행" -ForegroundColor White
Write-Host "  3. http://localhost:3000 에서 Tim 사용" -ForegroundColor White
Write-Host ""
Write-Host "종료 방법:" -ForegroundColor Yellow
Write-Host "  열린 CMD 창에서 아무 키나 누르기" -ForegroundColor White
Write-Host ""
