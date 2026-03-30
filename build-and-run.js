#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * 构建并运行脚本
 * @description 跨平台的构建和启动脚本，支持 Windows/Linux/macOS
 * @example
 *   node build-and-run.js
 *   node build-and-run.js --skip-lint
 *   node build-and-run.js --skip-build
 */

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const yaml = require('yaml');

// 解析命令行参数
const args = process.argv.slice(2);
const skipLint = args.includes('--skip-lint');
const skipBuild = args.includes('--skip-build');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * 读取配置文件获取端口
 * @returns {number} 端口号
 */
function getPort() {
  try {
    const configPath = path.join(__dirname, 'config.yml');
    if (fs.existsSync(configPath)) {
      const fileContent = fs.readFileSync(configPath, 'utf-8');
      const config = yaml.parse(fileContent);
      return config.server?.port ?? 8080;
    }
  } catch {
    // 配置读取失败，使用默认端口
  }
  return 8080;
}

/**
 * 打印 SakuraNav Banner
 */
function printBanner() {
  console.log('\n');
  log('cyan', '  ╔═══════════════════════════════════════════════════════════╗');
  log('cyan', '  ║                                                           ║');
  log('cyan', '  ║   ' + colors.magenta + '███████╗ █████╗ ███████╗ ██████╗██╗   ██╗██████╗ ' + colors.cyan + '    ║');
  log('cyan', '  ║   ' + colors.magenta + '██╔════╝██╔══██╗██╔════╝██╔════╝██║   ██║██╔══██╗' + colors.cyan + '    ║');
  log('cyan', '  ║   ' + colors.magenta + '███████╗███████║███████╗██║     ██║   ██║██████╔╝' + colors.cyan + '    ║');
  log('cyan', '  ║   ' + colors.magenta + '╚════██║██╔══██║╚════██║██║     ██║   ██║██╔══██╗' + colors.cyan + '    ║');
  log('cyan', '  ║   ' + colors.magenta + '███████║██║  ██║███████║╚██████╗╚██████╔╝██║  ██║' + colors.cyan + '    ║');
  log('cyan', '  ║   ' + colors.magenta + '╚══════╝╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═╝' + colors.cyan + '    ║');
  log('cyan', '  ║                                                           ║');
  log('cyan', '  ╚═══════════════════════════════════════════════════════════╝');
  console.log('\n');
  log('blue', '  ┌─────────────────────────────────────────────────────────┐');
  log('blue', '  │' + colors.green + '  ✨ 优雅的导航站管理系统                                    ' + colors.blue + '│');
  log('blue', '  │' + colors.green + '  🚀 快速、简洁、易用                                        ' + colors.blue + '│');
  log('blue', '  └─────────────────────────────────────────────────────────┘');
  console.log('\n');
}

/**
 * 打印服务信息
 */
function printServiceInfo(port) {
  const startTime = new Date();
  console.log(colors.yellow + '  ▶ 服务端口: ' + colors.cyan + `http://localhost:${port}` + colors.reset);
  console.log(colors.yellow + '  ▶ 启动时间: ' + colors.cyan + `${startTime.toLocaleString('zh-CN')}` + colors.reset);
  console.log(colors.yellow + '  ▶ 登录入口: ' + colors.cyan + `http://localhost:${port}/sakura-entry` + colors.reset);
  console.log('\n');
  log('green', '  ═══════════════════════════════════════════════════════════');
  console.log('\n');
}

/**
 * 执行命令（静默模式，只在出错时输出）
 */
function execCommandSilent(command) {
  try {
    execSync(command, { 
      stdio: 'pipe',
      cwd: __dirname,
      shell: true,
    });
    return { success: true, output: '' };
  } catch (error) {
    const output = error.stdout?.toString() || error.stderr?.toString() || error.message;
    return { success: false, output };
  }
}

/**
 * 检查是否是 Next.js 启动信息（需要过滤掉的）
 */
function isNextJsStartupLog(line) {
  // 过滤掉以下类型的日志：
  // - Next.js 版本信息
  // - Local/Network 地址
  // - Ready 信息
  // - DeprecationWarning
  // - 空行
  const patterns = [
    /^\s*▲ Next\.js/,
    /^\s*-\s*(Local|Network):/,
    /^\s*✓ Ready/,
    /^\(node:\d+\)\s*\[DEP\d+\]/,
    /^\s*$/,
  ];
  
  return patterns.some(pattern => pattern.test(line));
}

/**
 * 过滤输出，只保留日志系统的日志
 */
function filterAndPrintOutput(data) {
  const lines = data.toString().split('\n');
  
  for (const line of lines) {
    // 如果不是 Next.js 启动信息，则输出
    if (line && !isNextJsStartupLog(line)) {
      console.log(line);
    }
  }
}

// 主流程
async function main() {
  const port = getPort();
  
  // 1. 打印 Banner 和项目简介
  printBanner();

  // 2. 代码检查
  if (!skipLint) {
    log('yellow', '📋 正在运行代码检查...');
    const result = execCommandSilent('npm run lint');
    if (!result.success) {
      log('red', '❌ 代码检查失败:\n');
      console.log(result.output);
      process.exit(1);
    }
    log('green', '✅ 代码检查通过\n');
  }

  // 3. 检查数据库是否存在
  const dbPath = path.join(__dirname, 'storage', 'sakuranav.sqlite');
  if (!fs.existsSync(dbPath)) {
    log('cyan', '💡 首次运行：数据库将在应用启动时自动创建');
    log('cyan', '   数据库文件位于 storage/ 目录，不会被 git 跟踪\n');
  }

  // 4. 构建
  if (!skipBuild) {
    log('yellow', '🔨 正在构建项目...');
    const result = execCommandSilent('npm run build');
    if (!result.success) {
      log('red', '❌ 构建失败:\n');
      console.log(result.output);
      process.exit(1);
    }
    log('green', '✅ 构建成功\n');
  } else {
    // 检查是否已构建
    const nextDir = path.join(__dirname, '.next');
    if (!fs.existsSync(nextDir)) {
      log('red', '❌ 错误: 项目尚未构建，无法启动服务');
      log('yellow', '💡 请先运行构建命令:');
      log('blue', '   node build-and-run.js');
      process.exit(1);
    }
  }

  // 4. 打印服务信息
  printServiceInfo(port);

  // 5. 启动服务（捕获输出并过滤）
  const serverProcess = spawn('npx next start -p ' + port, [], {
    cwd: __dirname,
    shell: true,
    stdio: ['inherit', 'pipe', 'pipe'],
  });

  // 过滤并输出 stdout
  serverProcess.stdout.on('data', filterAndPrintOutput);
  
  // 过滤并输出 stderr
  serverProcess.stderr.on('data', filterAndPrintOutput);

  serverProcess.on('error', (error) => {
    log('red', '❌ 服务启动失败:');
    console.error(error);
    process.exit(1);
  });

  serverProcess.on('close', (code) => {
    if (code !== 0 && code !== null) {
      log('red', `❌ 服务异常退出，退出码: ${code}`);
      process.exit(code);
    }
  });
}

main();
