#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const http = require('http');

const PORT = 3000;
const URL = `http://localhost:${PORT}`;

console.log('====================================');
console.log('Tim A&R Scheduling Manager');
console.log('====================================\n');

// 서버가 준비되었는지 확인
function checkServer(callback) {
  http.get(URL, (res) => {
    callback(true);
  }).on('error', () => {
    callback(false);
  });
}

// 서버 준비 대기
function waitForServer(maxAttempts = 30) {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    const check = () => {
      checkServer((isReady) => {
        if (isReady) {
          resolve();
        } else {
          attempts++;
          if (attempts >= maxAttempts) {
            reject(new Error('서버 시작 시간 초과'));
          } else {
            setTimeout(check, 1000);
          }
        }
      });
    };

    check();
  });
}

// 브라우저 열기
function openBrowser() {
  const platform = process.platform;
  let command;

  if (platform === 'win32') {
    command = `start ${URL}`;
  } else if (platform === 'darwin') {
    command = `open ${URL}`;
  } else {
    command = `xdg-open ${URL}`;
  }

  exec(command, (error) => {
    if (error) {
      console.error('브라우저를 열 수 없습니다:', error);
      console.log(`수동으로 브라우저에서 ${URL} 을 열어주세요.`);
    } else {
      console.log('✓ 브라우저가 열렸습니다!');
    }
  });
}

// 메인 실행
async function main() {
  console.log('🚀 서버를 시작하는 중...\n');

  // npm run dev 실행
  const devProcess = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    shell: true
  });

  devProcess.on('error', (error) => {
    console.error('서버 시작 실패:', error);
    process.exit(1);
  });

  // 서버 준비 대기
  try {
    console.log('⏳ 서버 준비 대기 중...');
    await waitForServer();
    console.log('✓ 서버가 준비되었습니다!\n');

    // 브라우저 열기
    setTimeout(() => {
      openBrowser();
      console.log('\n====================================');
      console.log('Tim이 실행되었습니다!');
      console.log(`브라우저: ${URL}`);
      console.log('====================================\n');
      console.log('종료하려면 Ctrl+C를 누르세요.\n');
    }, 500);
  } catch (error) {
    console.log('⚠ 서버 준비에 시간이 걸리고 있습니다...');
    console.log('브라우저를 열어봅니다. 잠시 기다려주세요.\n');
    openBrowser();
  }

  // 종료 시그널 처리
  process.on('SIGINT', () => {
    console.log('\n\n서버를 종료하는 중...');
    devProcess.kill('SIGINT');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    devProcess.kill('SIGTERM');
    process.exit(0);
  });
}

main();
