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
const figlet = require('figlet');

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
  console.log('');
  const title = figlet.textSync('SakuraNav', { font: 'Slant' });
  title.split('\n').forEach(line => {
    log('magenta', `  ${line}`);
  });
  console.log('');
  log('green', '  ✨ 优雅的个人导航页');
  log('cyan', '  📦 Next.js 16 + React 19 + TypeScript + SQLite');
  log('yellow', '  🎨 响应式设计 | 明暗主题 | 拖拽排序 | 渐进式加载');
  console.log('');
}

/**
 * 打印服务信息
 */
function printServiceInfo(port) {
  const startTime = new Date();
  log('green', '  ✅ 启动成功');
  console.log('');
  console.log(colors.yellow + '  ▶ 服务端口: ' + colors.cyan + `http://localhost:${port}` + colors.reset);
  console.log(colors.yellow + '  ▶ 启动时间: ' + colors.cyan + `${startTime.toLocaleString('zh-CN')}` + colors.reset);
  console.log(colors.yellow + '  ▶ 登录入口: ' + colors.cyan + `http://localhost:${port}/sakura-entry` + colors.reset);
  console.log('');
  log('cyan', '  📋 服务日志输出:');
  console.log('');
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
    log('yellow', '  📋 正在运行代码检查...');
    const result = execCommandSilent('npm run lint');
    if (!result.success) {
      log('red', '  ❌ 代码检查失败:\n');
      console.log(result.output);
      process.exit(1);
    }
    log('green', '  ✅ 代码检查通过\n');
  }

  // 3. 构建
  if (!skipBuild) {
    log('yellow', '  🔨 正在构建项目...');
    const result = execCommandSilent('npm run build');
    if (!result.success) {
      log('red', '  ❌ 构建失败:\n');
      console.log(result.output);
      process.exit(1);
    }
    log('green', '  ✅ 构建成功\n');
  } else {
    // 检查是否已构建
    const nextDir = path.join(__dirname, '.next');
    if (!fs.existsSync(nextDir)) {
      log('red', '  ❌ 错误: 项目尚未构建，无法启动服务');
      log('yellow', '  💡 请先运行构建命令:');
      log('blue', '     node build-and-run.js');
      process.exit(1);
    }
  }

  // 4. 为 standalone 模式准备必要的文件
  const standaloneDir = path.join(__dirname, '.next/standalone');
  const staticSource = path.join(__dirname, '.next/static');
  const staticTarget = path.join(standaloneDir, '.next/static');
  const publicSource = path.join(__dirname, 'public');
  const publicTarget = path.join(standaloneDir, 'public');

  // 检查并复制 .next/static 文件
  if (fs.existsSync(staticSource) && !fs.existsSync(staticTarget)) {
    log('yellow', '  📋 复制静态文件...');
    fs.cpSync(staticSource, staticTarget, { recursive: true });
    log('green', '  ✅ 静态文件复制完成\n');
  }

  // 检查并复制 public 文件
  if (fs.existsSync(publicSource) && !fs.existsSync(publicTarget)) {
    log('yellow', '  📋 复制公共文件...');
    fs.cpSync(publicSource, publicTarget, { recursive: true });
    log('green', '  ✅ 公共文件复制完成\n');
  }

  // 5. 检测启动模式
  // - Docker standalone: server.js 在根目录
  // - Local standalone: server.js 在 .next/standalone/
  const standaloneInRoot = fs.existsSync(path.join(__dirname, 'server.js'));
  const standaloneInNext = fs.existsSync(path.join(__dirname, '.next/standalone/server.js'));

  let startCommand;
  let serverPath;

  if (standaloneInRoot) {
    // Docker 环境：standalone 文件已复制到根目录
    startCommand = 'node server.js';
    serverPath = 'server.js (Docker standalone)';
  } else if (standaloneInNext) {
    // 本地构建：standalone 文件在 .next/standalone/
    startCommand = 'node .next/standalone/server.js';
    serverPath = '.next/standalone/server.js (Local standalone)';
  } else {
    // 没有构建产物，提示用户
    log('red', '  ❌ 错误: 未找到构建产物');
    log('yellow', '  💡 请先运行构建命令:');
    log('blue', '     npm run build');
    log('yellow', '  或者在开发模式下运行:');
    log('blue', '     npm run dev');
    process.exit(1);
  }

  log('cyan', `  🚀 启动模式: ${serverPath}\n`);

  // 6. 打印服务信息
  printServiceInfo(port);

  // 7. 启动服务（捕获输出并过滤）
  // 设置环境变量（跨平台）
  const env = { ...process.env, PORT: String(port) };
  
  const serverProcess = spawn(startCommand, [], {
    cwd: __dirname,
    shell: true,
    stdio: ['inherit', 'pipe', 'pipe'],
    env: env,
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
