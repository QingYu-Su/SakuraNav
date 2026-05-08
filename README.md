<p align="center">
  <img src="public/browser-tab-logo.png" alt="SakuraNav Logo" width="96">
</p>

<h1 align="center">🌸 SakuraNav</h1>

<p align="center">
  <strong>优雅的个人导航页</strong> — 一站式管理你的网络书签
</p>

<p align="center">
  基于 Next.js + TypeScript 的全栈导航页，支持公开浏览与登录管理
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/SQLite/MySQL/PostgreSQL-003B57?logo=sqlite" alt="Multi-DB">
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss" alt="Tailwind CSS">
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License">
</p>

<p align="center">
  <a href="https://sakura.suqingyu.com/">🚀 在线体验</a> ·
  <a href="https://qingyu-su.github.io/SakuraNav/">📖 文档站点</a> ·
  <a href="https://qingyu-su.github.io/SakuraNav/changelog.html">📋 更新日志</a> ·
  <a href="README_EN.md">🌐 English</a>
</p>

---

## ✨ 核心特性

- 🎨 **精致界面** — 明暗主题切换、樱花/星空动态背景、响应式设计、壁纸与毛玻璃独立定制、标签切换动画
- 🤖 **AI 驱动** — 智能网站分析、关键词推荐、浏览器书签智能导入、网站关联推荐
- 📝 **笔记卡片** — Markdown 编辑预览、图片/文件上传、`sakura-site://` 引用同步网站 Todo
- 🏷️ **灵活管理** — 拖拽排序、多标签关联、在线检测、备忘便签、备选 URL、右键菜单
- 📱 **社交卡片** — 12 种社交平台卡片，独立详情页展示账号与二维码
- 👥 **多用户** — 独立数据空间、OAuth 登录（GitHub/微信/飞书/钉钉）、引导页注册、版本快照与恢复
- 💾 **多数据库** — SQLite / MySQL / PostgreSQL 一键切换；ZIP 导入导出、浏览器书签导入
- 🔔 **离线通知** — Webhook 通知渠道，站点离线自动推送通知
- 🔐 **安全加固** — CSRF/SSRF/XSS 防护、速率限制、JWT + HttpOnly Cookie、Token 吊销

---

## 🛠 技术栈

| 类别 | 技术选型 |
|:-----|:---------|
| 前端框架 | Next.js 16 · React 19 · TypeScript |
| 后端架构 | Next.js App Router Route Handlers |
| 数据库 | SQLite / MySQL / PostgreSQL（DatabaseAdapter 统一 API） |
| 拖拽功能 | @dnd-kit |
| 认证管理 | jose + HttpOnly Cookie + OAuth 2.0 |
| 样式方案 | Tailwind CSS 4 |
| AI 能力 | Vercel AI SDK + 多供应商 OpenAI-compatible API |
| 性能优化 | React Compiler |
| 参数校验 | Zod |
| 配置文件 | YAML |

---

## 📋 环境要求

| 依赖 | 最低版本 |
|:-----|:---------|
| Node.js | `>= 20` |
| npm | `>= 10` |

---

## 🚀 快速开始

### 方式一：源码部署

```bash
# 1. 安装依赖
npm install

# 2. 复制配置文件
cp config.example.yml config.yml

# 3. 构建并启动
node build-and-run.js
```

该命令会自动完成代码检查 (ESLint)、项目构建和服务启动。

> 管理员账户通过首次访问时的引导页创建，无需在配置文件中设置。

### 方式二：Docker Compose

```yaml
services:
  sakuranav:
    image: sqingyu/sakuranav:latest
    container_name: sakuranav
    restart: unless-stopped
    ports:
      - "8080:8080"
    volumes:
      - ./data:/app/data
    environment:
      - NODE_ENV=production
      - TZ=Asia/Shanghai
```

```bash
docker compose up -d
```

首次运行会自动创建 `./data` 目录及默认配置文件，访问 http://localhost:8080 进入引导页。

> 📖 更多部署方式（源码构建 Docker 镜像等）请参考 [Docker 部署文档](https://qingyu-su.github.io/SakuraNav/docker.html)

---

## ⚙️ 参数配置

配置文件位于项目根目录的 `config.yml`，首次使用需要从模板复制：

```bash
cp config.example.yml config.yml
```

### 配置项详解

```yaml
server:
  port: 8080                    # 服务端口（默认 8080）

database:
  type: sqlite                  # 数据库类型：sqlite / mysql / postgresql
```

> 💡 **管理员账户**：首次访问时通过引导页创建，无需在配置文件中设置。
>
> 💡 **AI 模型配置**：在管理面板「设置 → 站点 → AI 模型」中在线配置，无需修改配置文件。

### 首次运行

首次运行时会自动完成以下初始化：

- 📦 创建数据库文件（SQLite 默认路径: `storage/database/sakuranav.sqlite`）
- 📁 创建上传目录: `storage/uploads`
- 🔄 自动执行数据库表结构迁移
- 🔐 首次访问时进入管理员初始化引导页

无需手动建表或执行 migration。

---

## 🤖 AI 辅助开发

项目提供了 `.context/` 目录，用于 AI 辅助开发时快速了解项目上下文：

| 文件 | 用途 |
|:-----|:-----|
| [`init.md`](.context/init.md) | 项目上下文入口，AI 新对话时首先读取此文件 |
| [`develop.md`](.context/develop.md) | 开发规范，AI 编码时必须遵守的约束 |
| [`check.md`](.context/check.md) | 提交前检查清单，代码修改完毕后执行评分 |
| [`update.md`](.context/update.md) | 版本发布流程，更新 CHANGELOG 和 README |

---

## 📄 许可证

本项目基于 [MIT License](LICENSE) 开源协议发布。

---

## 👥 贡献者

感谢所有为本项目做出贡献的开发者！

<table>
  <tr>
    <td align="center"><a href="https://github.com/QingYu-Su"><img src="https://avatars.githubusercontent.com/u/79574594?v=4&s=64" width="64" style="border-radius:50%;"><br><b>苏青羽</b></a></td>
  </tr>
</table>
