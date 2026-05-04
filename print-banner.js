#!/usr/bin/env node

/**
 * 统一启动 Banner 输出脚本
 * @description 供 build-and-run.js 和 docker-entrypoint.sh 共用，确保样式完全一致
 * @example
 *   # 仅输出 Banner（ASCII Art + 项目描述）
 *   node print-banner.js --section banner
 *
 *   # 仅输出启动信息（启动状态 + 服务信息 + 日志头）
 *   node print-banner.js --section startup --port 8080
 *
 *   # 输出全部（Banner + 启动信息，Docker 场景）
 *   node print-banner.js --port 8080
 */

// ANSI 颜色
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

// 解析命令行参数
function getArg(name) {
  const args = process.argv.slice(2);
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : null;
}

const section = getArg('section') || 'all';
const port = getArg('port') || '8080';

/**
 * 输出 ASCII Art Banner
 * 由 figlet Slant 字体生成: figlet.textSync('SakuraNav', { font: 'Slant' })
 * 如需重新生成，执行: node -e "console.log(require('figlet').textSync('SakuraNav', { font: 'Slant' }))"
 */
function printBanner() {
  const bannerLines = [
    '   _____       __                    _   __',
    '   / ___/____ _/ /____  ___________ _/ | / /___ __   __',
    '   \\__ \\/ __ `/ //_/ / / / ___/ __ `/  |/ / __ `/ | / /',
    '  ___/ / /_/ / ,< / /_/ / /  / /_/ / /|  / /_/ /| |/ /',
    ' /____/\\__,_/_/|_|\\__,_/_/   \\__,_/_/ |_/\\__,_/ |___/',
    '',
  ];

  console.log('');
  for (const line of bannerLines) {
    console.log(`${colors.magenta}  ${line}${colors.reset}`);
  }
  console.log('');
  console.log(`${colors.green}  ✨ 优雅的个人导航页 — 一站式管理你的网络书签${colors.reset}`);
  console.log(`${colors.cyan}  📦 Next.js 16 + React 19 + TypeScript + SQLite${colors.reset}`);
  console.log(`${colors.yellow}  🎨 明暗主题 | 拖拽排序 | 多用户 | AI 助手 | OAuth 登录${colors.reset}`);
  console.log('');
}

/**
 * 输出启动信息（启动状态 + 服务配置 + 日志头）
 */
function printStartupInfo() {
  console.log(`${colors.yellow}  🚀 正在启动项目...${colors.reset}`);
  console.log(`${colors.green}  ✅ 启动成功${colors.reset}`);
  console.log('');
  console.log(`${colors.yellow}  ▶ 服务端口: ${colors.cyan}http://localhost:${port}${colors.reset}`);
  console.log(`${colors.yellow}  ▶ 启动时间: ${colors.cyan}${new Date().toLocaleString('zh-CN')}${colors.reset}`);
  console.log('');
  console.log(`${colors.cyan}  📋 服务日志输出:${colors.reset}`);
  console.log('');
}

// 根据 section 参数输出对应内容
if (section === 'banner') {
  printBanner();
} else if (section === 'startup') {
  printStartupInfo();
} else {
  printBanner();
  printStartupInfo();
}
