Set oWS = WScript.CreateObject("WScript.Shell")
sLinkFile = oWS.SpecialFolders("Desktop") & "\Tim A&R Manager.lnk"
Set oLink = oWS.CreateShortcut(sLinkFile)

' 현재 스크립트의 디렉토리 경로
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)

oLink.TargetPath = scriptDir & "\Tim 실행.bat"
oLink.WorkingDirectory = scriptDir
oLink.Description = "Tim A&R Scheduling Manager - PEERMUSIC 전문 비서"
oLink.WindowStyle = 1
oLink.Save

WScript.Echo "바탕화면 바로가기가 생성되었습니다!"
WScript.Echo "파일 위치: " & sLinkFile
