<p align="center">
  <img src="public/browser-tab-logo.png" alt="SakuraNav Logo" width="96">
</p>

<h1 align="center">🌸 SakuraNav</h1>

<p align="center">
  <strong>优雅的个人导航页</strong> — 一站式管理你的网络书签
</p>

<p align="center">
  基于 Next.js + TypeScript + SQLite 的全栈导航页，支持公开浏览与登录管理
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/SQLite-better--sqlite3-003B57?logo=sqlite" alt="SQLite">
  <img src="https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss" alt="Tailwind CSS">
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License">
</p>

<p align="center">
  <a href="docs/DEVELOPMENT.md">开发文档</a> ·
  <a href="docs/README_EN.md">English</a> ·
  <a href="docs/CHANGELOG.md">更新日志</a>
</p>

---

## ✨ 功能特性

<details>
<summary><strong>🎨 界面体验</strong></summary>

- **响应式设计** — 完美适配桌面端和移动端
- **明暗主题** — 支持明亮 / 暗黑主题切换，支持跟随系统
- **主题定制** — 明暗主题分别配置壁纸、字体、透明度、文字颜色
- **动态背景** — 明亮模式飘落樱花花瓣，暗黑模式闪烁星星
- **毛玻璃卡片** — 桌面端和移动端可独立开关卡片毛玻璃效果，无需壁纸也可启用
- **桌面/移动壁纸分离** — 桌面端和移动端可分别设置不同壁纸
- **三种字体预设** — Space Grotesk（科技感）、Noto Serif SC（杂志感）、Noto Sans SC（日常）
- **Logo / Favicon 自定义** — 支持上传自定义 Logo 和 Favicon
- **站点名称自定义** — 支持自定义导航站名称，实时更新浏览器标签标题
- **渐进式加载** — 无限滚动分页加载
- **标签切换动画** — 类 pjax 过渡效果，卡片依次入场

</details>

<details>
<summary><strong>🔐 登录管理</strong></summary>

- **隐藏登录路由** — 自定义登录入口路径，游客无法发现
- **单用户登录** — 支持 30 天免登录
- **管理员二次确认** — 执行敏感操作时需输入密码确认
- **权限控制** — 登录后可见隐藏标签与隐藏站点
- **编辑器控制台** — 独立的 `/editor` 管理后台，支持批量管理

</details>

<details>
<summary><strong>🏷️ 标签管理</strong></summary>

- **标签分类** — 网站按标签分类展示，支持 Logo 和描述设置
- **拖拽排序** — 登录后支持拖拽调整标签顺序
- **隐藏标签** — 可设置隐藏标签，仅登录后可见
- **标签 Logo** — 支持为每个标签设置独立 Logo 和背景色

</details>

<details>
<summary><strong>🌐 网站管理</strong></summary>

- **网站增删改** — 登录后可管理网站信息
- **拖拽排序** — 登录后在单个标签下拖拽网站顺序
- **网站置顶** — 支持网站置顶显示
- **批量管理** — 支持网站与多个标签关联
- **文字图标** — 自动取网站名首字生成图标，支持自定义背景色
- **官方图标** — 动态加载网站 Favicon，加载失败自动降级
- **图标背景色** — 支持为网站图标设置自定义背景色
- **网站在线检测** — 批量检测网站在线状态，支持单站点跳过检测
- **AI 智能分析** — AI 自动识别标题、描述、推荐标签，勾选后自动创建并关联
- **图片裁剪** — 上传壁纸、Logo、Favicon 时支持裁剪，精确控制显示区域
- **悬浮弹窗** — 鼠标悬浮网站卡片可查看描述和标签信息

</details>

<details>
<summary><strong>📱 社交卡片</strong></summary>

- **六种卡片类型** — 支持 QQ、微信、邮箱、B站、GitHub、博客
- **详情页展示** — QQ 和微信卡片支持独立详情页，展示账号和二维码
- **自定义提示文字** — 每张卡片可设置自定义提示文字
- **拖拽排序** — 社交卡片与网站卡片统一拖拽排序

</details>

<details>
<summary><strong>🔍 搜索功能</strong></summary>

- **自定义搜索引擎** — 增删改搜索引擎，可配置名称、搜索地址、图标和卡片颜色
- **多引擎切换** — 多搜索引擎快速切换，Tab 键提示
- **站内搜索** — 在当前视图范围内搜索站点名、描述、标签
- **搜索建议** — 浮动搜索弹窗，支持实时搜索建议与键盘导航
- **AI 智能推荐** — 输入关键词获取相关网站推荐

</details>

<details>
<summary><strong>💾 数据管理</strong></summary>

- **壁纸上传** — 本地上传壁纸或通过 URL 下载
- **配置导入导出** — 支持配置数据的导入和导出（ZIP 格式）
- **配置重置** — 支持一键重置到默认配置

</details>

---

## 🛠 技术栈

| 类别 | 技术选型 |
|:-----|:---------|
| 前端框架 | Next.js 16 · React 19 · TypeScript |
| 后端架构 | Next.js App Router Route Handlers |
| 数据库 | SQLite + better-sqlite3（WAL 模式） |
| 拖拽功能 | @dnd-kit |
| 认证管理 | jose + HttpOnly Cookie |
| 样式方案 | Tailwind CSS 4 |
| AI 能力 | Vercel AI SDK + OpenAI-compatible API |
| 性能优化 | React Compiler |
| 参数校验 | Zod |
| 配置文件 | YAML |

---

## 📋 环境要求

| 依赖 | 最低版本 |
|:-----|:---------|
| Node.js | `>= 20` |
| npm | `>= 10` |

> 💡 当前项目在 Node `v25.8.1`、npm `11.11.0` 环境下完成构建验证

---

## 🚀 快速开始

### 方式一：源码部署

#### 1. 安装依赖

```bash
npm install
```

#### 2. 配置文件

复制配置文件模板：

```bash
cp config.example.yml config.yml
```

修改 `config.yml` 中的管理员账号和密码：

```yaml
admin:
  username: "admin"
  password: "sakura"
```

#### 3. 构建并启动

```bash
node build-and-run.js
```

该命令会自动完成：
- ✅ 代码检查 (ESLint)
- ✅ 项目构建
- ✅ 服务启动

<details>
<summary>可选参数</summary>

```bash
# 跳过代码检查
node build-and-run.js --skip-lint

# 跳过构建（使用已有构建产物）
node build-and-run.js --skip-build
```

</details>

---

### 方式二：Docker 源码构建

#### 1. 克隆项目

```bash
git clone https://github.com/QingYu-Su/SakuraNav.git
cd SakuraNav
```

#### 2. 构建镜像

```bash
docker build -t sakuranav:latest .
```

#### 3. 启动容器

```bash
docker run -d \
  --name sakuranav \
  --restart unless-stopped \
  -p 8080:8080 \
  -v ./data:/app/data \
  -e NODE_ENV=production \
  -e TZ=Asia/Shanghai \
  sakuranav:latest
```

首次运行会自动创建 `./data` 目录及默认配置文件。

#### 4. 修改管理员密码

```bash
vim ./data/config.yml
docker restart sakuranav
```

#### 5. 访问应用

- 🌐 访问地址: http://localhost:8080
- 🔐 登录地址: http://localhost:8080/login （默认，可在配置文件中自定义）

---

### 方式三：Docker Compose

#### 1. 创建 `docker-compose.yml`

```yaml
services:
  sakuranav:
    image: sqingyu/sakuranav:latest
    container_name: sakuranav
    restart: unless-stopped
    ports:
      - "8080:8080"
    volumes:
      - ./data:/app/data   # 数据目录，首次运行自动创建
    environment:
      - NODE_ENV=production
      - TZ=Asia/Shanghai
```

#### 2. 启动服务

```bash
docker compose up -d
```

首次运行会自动创建 `./data` 目录及默认配置文件。

#### 3. 修改管理员密码

```bash
vim ./data/config.yml
docker compose restart
```

#### 4. 访问应用

- 🌐 访问地址: http://localhost:8080
- 🔐 登录地址: http://localhost:8080/login （默认，可在配置文件中自定义）

> 📖 详细配置说明和常见问题请参考 [Docker 部署文档](docs/DOCKER.md)

---

### 登录管理

| 部署方式 | 登录地址 |
|:---------|:---------|
| 源码部署 | `http://localhost:8080/login` |
| Docker 部署 | `http://localhost:8080/login` |

登录成功后可使用：

| 功能 | 说明 |
|:-----|:-----|
| 编辑按钮 | 进入 `/editor` 管理后台 |
| 退出登录 | 退出当前会话 |
| 隐藏标签/站点 | 登录后可见 |
| 拖拽排序 | 标签与网站排序 |
| AI 功能 | 智能分析和推荐 |

---

## ⚙️ 参数配置

配置文件位于项目根目录的 `config.yml`，首次使用需要从模板复制：

```bash
cp config.example.yml config.yml
```

### 配置项详解

```yaml
# 服务器配置
server:
  port: 8080                    # 服务端口（默认 8080）

# 管理员账号配置
admin:
  username: "admin"             # 管理员用户名
  password: "sakura"            # 管理员密码（⚠️ 建议修改为强密码）
  path: "login"                 # 登录入口路径（访问路径为 /login）

# AI 分析配置（可选，不配置则不影响构建，但 AI 功能不可用）
# 支持所有 OpenAI-compatible 提供商（OpenAI、DeepSeek、Moonshot、GLM 等）
model:
  apiKey: "sk-xxxxxxxxxxxxxxxx"
  baseUrl: "https://api.deepseek.com/v1"
  model: "deepseek-chat"
```

> ⚠️ **生产环境部署前务必修改：**
> 1. `admin.password` — 设置强密码
> 2. `admin.path` — 自定义登录入口路径，提高安全性
> 3. `server.port` — 根据需要修改端口
> 4. `model` — 配置 AI 模型以启用智能分析和推荐功能（可选）

### 首次运行

首次运行时会自动完成以下初始化：

- 📦 创建 SQLite 数据库文件: `storage/database/sakuranav.sqlite`
- 📁 创建上传目录: `storage/uploads`
- 🏷️ 写入示例标签、示例网站和默认主题配置
- 🔄 自动执行数据库表结构迁移

无需手动建表或执行 migration。

---

## ❓ 常见问题

### 是否支持多用户？

不支持，后续也暂无计划支持。

SakuraNav 的定位是**个人导航站**，主要面向个人博主做站点宣传，同时兼顾个人私密收藏需求——这也是"隐藏标签"功能的由来。这与其他支持多用户、私有书签的导航站产品在使用场景上有本质区别。

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
