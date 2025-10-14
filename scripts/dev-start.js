#!/usr/bin/env node

/**
 * 智能开发服务器启动脚本
 * 功能：
 * 1. 自动清理缓存
 * 2. 检测端口占用
 * 3. 自动切换可用端口
 * 4. 优雅的错误处理
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');

// 配置
const CONFIG = {
  preferredPorts: [3001, 3002, 3003, 3004, 3005, 3000],
  cacheDirectories: ['.next', '.next-dev'],
  maxRetries: 3,
  retryDelay: 2000, // 2秒
};

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logInfo(message) {
  log(`ℹ ${message}`, colors.cyan);
}

function logSuccess(message) {
  log(`✓ ${message}`, colors.green);
}

function logWarning(message) {
  log(`⚠ ${message}`, colors.yellow);
}

function logError(message) {
  log(`✗ ${message}`, colors.red);
}

/**
 * 检查端口是否被占用
 */
function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(true); // 端口被占用
      } else {
        resolve(false);
      }
    });
    
    server.once('listening', () => {
      server.close();
      resolve(false); // 端口可用
    });
    
    server.listen(port);
  });
}

/**
 * 查找可用端口
 */
async function findAvailablePort() {
  logInfo('正在查找可用端口...');
  
  for (const port of CONFIG.preferredPorts) {
    const inUse = await isPortInUse(port);
    if (!inUse) {
      logSuccess(`找到可用端口: ${port}`);
      return port;
    } else {
      logWarning(`端口 ${port} 已被占用`);
    }
  }
  
  // 如果所有预定义端口都被占用，随机选择一个
  const randomPort = Math.floor(Math.random() * (9000 - 8000) + 8000);
  logInfo(`使用随机端口: ${randomPort}`);
  return randomPort;
}

/**
 * 清理缓存目录
 */
async function cleanCache() {
  logInfo('正在清理缓存目录...');
  
  let cleaned = false;
  
  for (const dir of CONFIG.cacheDirectories) {
    const dirPath = path.join(process.cwd(), dir);
    
    if (fs.existsSync(dirPath)) {
      try {
        // Windows 下使用 rmdir /s /q
        if (process.platform === 'win32') {
          require('child_process').execSync(`rmdir /s /q "${dirPath}"`, {
            stdio: 'ignore',
          });
        } else {
          fs.rmSync(dirPath, { recursive: true, force: true });
        }
        logSuccess(`已清理: ${dir}`);
        cleaned = true;
      } catch (error) {
        // 静默失败，不影响启动
        logWarning(`无法清理 ${dir}: ${error.message}`);
      }
    }
  }
  
  if (!cleaned) {
    logInfo('没有需要清理的缓存');
  }
  
  // 等待文件系统释放
  await new Promise(resolve => setTimeout(resolve, 500));
}

/**
 * 终止占用端口的进程
 */
async function killProcessOnPort(port) {
  if (process.platform === 'win32') {
    try {
      // 在 Windows 上查找并终止占用端口的进程
      const { execSync } = require('child_process');
      execSync(`FOR /F "tokens=5" %P IN ('netstat -ano ^| findstr :${port}') DO TaskKill /F /PID %P`, {
        stdio: 'ignore',
      });
      logSuccess(`已终止占用端口 ${port} 的进程`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      // 可能没有进程占用端口
    }
  }
}

/**
 * 启动开发服务器
 */
async function startDevServer(port, retryCount = 0) {
  return new Promise((resolve, reject) => {
    logInfo(`正在启动开发服务器 (端口 ${port})...`);
    
    const env = { ...process.env };
    if (port !== 3000) {
      env.PORT = port.toString();
    }
    
    const devProcess = spawn('npx', ['next', 'dev', '-p', port.toString()], {
      env,
      stdio: 'inherit',
      shell: true,
    });
    
    let started = false;
    
    // 监听启动成功
    setTimeout(() => {
      if (!started) {
        started = true;
        logSuccess(`开发服务器已启动！`);
        log(`\n${colors.bright}${colors.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
        log(`${colors.cyan}  本地访问: ${colors.bright}http://localhost:${port}${colors.reset}`);
        log(`${colors.cyan}  网络访问: ${colors.bright}http://<your-ip>:${port}${colors.reset}`);
        log(`${colors.bright}${colors.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
        log(`${colors.yellow}按 Ctrl+C 停止服务器${colors.reset}\n`);
        resolve(devProcess);
      }
    }, 3000);
    
    devProcess.on('error', async (error) => {
      logError(`启动失败: ${error.message}`);
      
      if (retryCount < CONFIG.maxRetries) {
        logWarning(`将在 ${CONFIG.retryDelay / 1000} 秒后重试 (${retryCount + 1}/${CONFIG.maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, CONFIG.retryDelay));
        
        // 清理并重试
        await cleanCache();
        const newPort = await findAvailablePort();
        return startDevServer(newPort, retryCount + 1);
      } else {
        reject(error);
      }
    });
    
    devProcess.on('exit', (code) => {
      if (code !== 0 && code !== null && !started) {
        logError(`进程异常退出 (代码: ${code})`);
        reject(new Error(`Exit code: ${code}`));
      }
    });
    
    // 处理 Ctrl+C
    process.on('SIGINT', () => {
      log('\n正在停止服务器...', colors.yellow);
      devProcess.kill('SIGINT');
      setTimeout(() => {
        process.exit(0);
      }, 1000);
    });
  });
}

/**
 * 主函数
 */
async function main() {
  log('\n' + '='.repeat(50), colors.bright);
  log('  Excel Review App - 智能启动脚本  ', colors.cyan + colors.bright);
  log('='.repeat(50) + '\n', colors.bright);
  
  try {
    // 1. 清理缓存
    await cleanCache();
    
    // 2. 查找可用端口
    let port = await findAvailablePort();
    
    // 3. 如果首选端口被占用，询问是否终止占用进程
    if (port !== CONFIG.preferredPorts[0]) {
      const preferredPort = CONFIG.preferredPorts[0];
      logWarning(`首选端口 ${preferredPort} 被占用`);
      
      if (process.platform === 'win32') {
        logInfo(`尝试释放端口 ${preferredPort}...`);
        await killProcessOnPort(preferredPort);
        
        // 再次检查
        const isStillInUse = await isPortInUse(preferredPort);
        if (!isStillInUse) {
          port = preferredPort;
          logSuccess(`成功释放端口 ${preferredPort}`);
        }
      }
    }
    
    // 4. 启动开发服务器
    await startDevServer(port);
    
  } catch (error) {
    logError(`启动失败: ${error.message}`);
    log('\n请尝试以下操作:', colors.yellow);
    log('  1. 手动终止占用端口的进程', colors.yellow);
    log('  2. 删除 .next 和 .next-dev 目录', colors.yellow);
    log('  3. 运行: npm run build 然后 npm run dev', colors.yellow);
    process.exit(1);
  }
}

// 运行
main().catch((error) => {
  logError(`未知错误: ${error.message}`);
  process.exit(1);
});
