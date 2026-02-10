// Desktop shortcut creator for Tim A&R Manager
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const projectDir = __dirname;
const launchBat = path.join(projectDir, 'launch.bat');
const iconFile = path.join(projectDir, 'tim-icon.ico');

// Find desktop path using PowerShell (most reliable)
function getDesktopPath() {
  return execSync(
    'powershell -Command "[System.Environment]::GetFolderPath(\'Desktop\')"'
  ).toString().trim();
}

const desktop = getDesktopPath();
const shortcutPath = path.join(desktop, 'Tim A&R Manager.lnk');

console.log('Creating desktop shortcut...');
console.log('Desktop:', desktop);
console.log('Target:', launchBat);
console.log('Icon:', iconFile);

// Use inline PowerShell with properly escaped paths (no temp file = no encoding issues)
const escapePath = (p) => p.replace(/\\/g, '\\\\').replace(/'/g, "''");

const cmd = [
  'powershell', '-ExecutionPolicy', 'Bypass', '-Command',
  `$ws = New-Object -ComObject WScript.Shell;` +
  `$s = $ws.CreateShortcut([System.Environment]::GetFolderPath('Desktop') + '\\Tim A&R Manager.lnk');` +
  `$s.TargetPath = '${launchBat}';` +
  `$s.WorkingDirectory = '${projectDir}';` +
  `$s.Description = 'Tim A&R Scheduling Manager';` +
  `$s.IconLocation = '${iconFile},0';` +
  `$s.Save();` +
  `Write-Host 'OK'`
].join(' ');

try {
  const result = execSync(cmd, { encoding: 'utf8' });
  console.log('PowerShell result:', result.trim());

  if (fs.existsSync(shortcutPath)) {
    console.log('\nShortcut created successfully!');
    console.log('Location:', shortcutPath);
  } else {
    console.log('\nShortcut may be at a different desktop path.');
    console.log('Checking OneDrive desktop...');

    const oneDriveDesktop = path.join(process.env.USERPROFILE, 'OneDrive');
    const dirs = fs.readdirSync(oneDriveDesktop);
    for (const d of dirs) {
      const fullPath = path.join(oneDriveDesktop, d, 'Tim A&R Manager.lnk');
      if (fs.existsSync(fullPath)) {
        console.log('Found at:', fullPath);
        break;
      }
    }
  }
} catch (err) {
  console.error('PowerShell failed, trying VBScript fallback...');

  // VBScript fallback
  const vbsContent =
    'Set oWS = WScript.CreateObject("WScript.Shell")\r\n' +
    'sDesktop = oWS.SpecialFolders("Desktop")\r\n' +
    'Set oLink = oWS.CreateShortcut(sDesktop & "\\Tim A&R Manager.lnk")\r\n' +
    'oLink.TargetPath = "' + launchBat + '"\r\n' +
    'oLink.WorkingDirectory = "' + projectDir + '"\r\n' +
    'oLink.Description = "Tim A&R Scheduling Manager"\r\n' +
    'oLink.IconLocation = "' + iconFile + ',0"\r\n' +
    'oLink.Save\r\n' +
    'WScript.Echo "OK"\r\n';

  const vbsFile = path.join(projectDir, '_tmp.vbs');
  fs.writeFileSync(vbsFile, vbsContent, 'ascii');

  try {
    const vbsResult = execSync(`cscript //Nologo "${vbsFile}"`, { encoding: 'utf8' });
    console.log('VBScript result:', vbsResult.trim());
    console.log('Shortcut created via VBScript!');
  } catch (vbsErr) {
    console.error('VBScript also failed:', vbsErr.message);
    console.log('\nPlease create shortcut manually:');
    console.log('1. Right-click launch.bat');
    console.log('2. Send to > Desktop (create shortcut)');
  } finally {
    try { fs.unlinkSync(vbsFile); } catch(e) {}
  }
}
