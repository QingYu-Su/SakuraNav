<p align="center">
  <img src="public/browser-tab-logo.png" alt="SakuraNav Logo" width="120">
</p>

<h1 align="center">SakuraNav</h1>

<p align="center">
  <strong>优雅的个人导航页</strong>
</p>

<p align="center">
  基于 Next.js + TypeScript + SQLite 的全栈导航页项目,支持公开浏览与登录管理两种模式
</p>

<p align="center">
  <a href="#功能特性">功能特性</a> •
  <a href="#技术栈">技术栈</a> •
  <a href="#快速开始">快速开始</a> •
  <a href="#参数配置">参数配置</a> •
  <a href="docs/DEVELOPMENT.md">开发文档</a> •
  <a href="docs/README_EN.md">English</a>
</p>

---

## 目录

- [功能特性](#功能特性)
- [技术栈](#技术栈)
- [环境要求](#环境要求)
- [快速开始](#快速开始)
- [参数配置](#参数配置)

## 功能特性

### 🎨 界面体验

- **响应式设计** - 完美适配桌面端和移动端
- **明暗主题** - 支持明亮 / 暗黑主题切换
- **主题定制** - 明暗主题分别配置壁纸、字体、透明度、文字颜色
- **渐进式加载** - 默认"全部网站"模式和标签视图下均支持渐进式加载

### 🔐 登录管理

- **隐藏登录路由** - 自定义登录入口路径,游客无法发现
- **单用户登录** - 支持 30 天免登录
- **权限控制** - 登录后可见隐藏标签与隐藏站点

### 🏷️ 标签管理

- **标签分类** - 网站按标签分类展示
- **拖拽排序** - 登录后支持拖拽调整标签顺序
- **隐藏标签** - 可设置隐藏标签,仅登录后可见

### 🌐 网站管理

- **网站增删改** - 登录后可管理网站信息
- **拖拽排序** - 登录后在单个标签下拖拽网站顺序
- **批量管理** - 支持网站与多个标签关联

### 🔍 搜索功能

- **多引擎支持** - Google / Baidu / 站内搜索切换
- **站内搜索** - 在当前视图范围内搜索站点名、描述、标签

### 📤 数据管理

- **壁纸上传** - 本地上传壁纸
- **配置导入导出** - 支持配置数据的导入和导出

## 技术栈

| 类别 | 技术选型 |
|------|---------|
| 前端框架 | Next.js 16、React 19、TypeScript |
| 后端架构 | Next.js App Router Route Handlers |
| 数据库 | SQLite + better-sqlite3 |
| 拖拽功能 | @dnd-kit |
| 登录态管理 | jose + HttpOnly Cookie |
| 样式方案 | Tailwind CSS 4 |
| 配置文件 | YAML |

## 环境要求

- Node.js `>= 20`
- npm `>= 10`

> 当前项目在 Node `v25.8.1`、npm `11.11.0` 环境下完成构建验证

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置文件

复制配置文件模板:

```bash
cp config.example.yml config.yml
```

修改 `config.yml` 中的管理员账号和密码:

```yaml
admin:
  username: admin
  password: your-strong-password-here
```

### 3. 启动项目

**开发环境:**

```bash
npm run dev
```

访问地址: http://localhost:3000

**生产环境(推荐):**

```bash
npm run build:start
```

该命令会自动完成:
- 代码检查(ESLint)
- 项目构建
- 服务启动

**可选参数:**

```bash
# 跳过代码检查
npm run build:start:skip-lint

# 跳过构建(使用已有构建产物)
npm run build:start:skip-build

# 静默模式启动
npm run start:silent
```

### 4. 登录管理

默认登录地址: `http://localhost:3000/sakura-entry`

登录成功后可使用:
- 编辑按钮
- 退出登录按钮
- 隐藏标签和站点可见
- 标签拖拽排序
- 网站拖拽排序

## 参数配置

### 配置文件说明

配置文件位于项目根目录的 `config.yml`,首次使用需要从 `config.example.yml` 复制:

```bash
cp config.example.yml config.yml
```

### 配置项详解

```yaml
# 服务器配置
server:
  # 服务端口(默认 8080)
  port: 8080

# 管理员账号配置
admin:
  # 管理员用户名
  username: admin
  # 管理员密码(请修改为强密码)
  password: your-strong-password-here
```

### 配置建议

**生产环境部署前务必修改:**

1. `admin.password` - 设置强密码
2. `server.port` - 根据需要修改端口

### 首次运行

首次运行时会自动完成以下初始化:

- 创建 SQLite 数据库文件: `storage/sakuranav.sqlite`
- 创建上传目录: `storage/uploads`
- 写入示例标签、示例网站和默认主题配置

无需手动建表或执行 migration。

## 📄 许可证

本项目基于 [MIT License](LICENSE) 开源协议发布。