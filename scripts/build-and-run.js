#!/usr/bin/env node

/**
 * 构建并运行脚本
 * @description 跨平台的构建和启动脚本，支持 Windows/Linux/macOS
 * @example
 *   node scripts/build-and-run.js
 *   node scripts/build-and-run.js --skip-lint
 *   node scripts/build-and-run.js --skip-build
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// 解析命令行参数
const args = process.argv.slice(2);
const skipLint = args.includes('--skip-lint');
const skipBuild = args.includes('--skip-build');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function execCommand(command, options = {}) {
  try {
    execSync(command, { 
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '..'),
      shell: true,
      ...options 
    });
    return true;
  } catch (error) {
    console.error('\n');
    log('red', `❌ 命令执行失败: ${command}`);
    if (error.message) {
      console.error(`   错误信息: ${error.message}`);
    }
    if (error.status) {
      console.error(`   退出码: ${error.status}`);
    }
    return false;
  }
}

// 主流程
function main() {
  log('blue', '🚀 开始构建流程...\n');

  // 步骤 1: 代码检查
  if (!skipLint) {
    log('yellow', '📋 步骤 1/2: 运行代码检查...');
    if (!execCommand('npm run lint')) {
      log('yellow', '⚠️  代码检查存在问题，但将继续执行...\n');
    } else {
      log('green', '✅ 代码检查通过\n');
    }
  } else {
    log('yellow', '⏭️  跳过代码检查\n');
  }

  // 步骤 2: 构建
  if (!skipBuild) {
    log('yellow', '🔨 步骤 2/2: 构建项目...');
    if (!execCommand('npm run build')) {
      log('red', '❌ 构建失败');
      process.exit(1);
    }
    log('green', '✅ 构建成功\n');
  } else {
    log('yellow', '⏭️  跳过构建\n');
    
    // 检查是否已构建
    const nextDir = path.resolve(__dirname, '..', '.next');
    if (!fs.existsSync(nextDir)) {
      log('red', '❌ 错误: 项目尚未构建，无法启动服务');
      log('yellow', '💡 请先运行构建命令:');
      log('blue', '   npm run build:start');
      log('blue', '   或者');
      log('blue', '   npm run build');
      process.exit(1);
    }
  }

  // 步骤 3: 启动服务
  log('green', '🎉 所有步骤完成！正在启动服务...\n');
  const success = execCommand('npm run start');
  if (!success) {
    log('red', '❌ 服务启动失败');
    process.exit(1);
  }
}

main();
