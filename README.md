# SakuraNav

SakuraNav 是一个基于 `Next.js + TypeScript + SQLite` 的全栈导航页项目，支持公开浏览与登录管理两种模式。

它目前已经实现：

- 响应式导航页，适配桌面端和移动端
- 明亮 / 暗黑主题切换
- 明暗主题分别配置壁纸、字体、透明度、文字颜色
- 隐藏登录路由
- 单用户登录，支持 30 天免登录
- 游客不可见的隐藏标签与隐藏站点
- 标签拖拽排序
- 登录后在单个标签下拖拽网站顺序
- 默认“全部网站”模式的渐进式加载
- 标签视图下的渐进式加载
- Google / Baidu / 站内搜索切换
- 壁纸本地上传

## 技术栈

- 前端：`Next.js 16`、`React 19`、`TypeScript`
- 后端：`Next.js App Router Route Handlers`
- 数据库：`SQLite` + `better-sqlite3`
- 拖拽：`@dnd-kit`
- 登录态：`jose` + `HttpOnly Cookie`
- 样式：`Tailwind CSS 4`

## 环境要求

- Node.js `>= 20`
- npm `>= 10`

当前项目是在 Node `v25.8.1`、npm `11.11.0` 环境下完成构建验证的。

## 初始化

在项目根目录执行：

```bash
npm install
```

首次运行时会自动完成以下初始化：

- 创建 SQLite 数据库文件：`storage/sakuranav.sqlite`
- 创建上传目录：`storage/uploads`
- 写入一份示例标签、示例网站和默认主题配置

不需要手动建表，也不需要额外执行 migration。

## 开发运行

启动开发环境：

```bash
npm run dev
```

默认访问地址：

- 首页：[http://localhost:3000](http://localhost:3000)

## 生产构建与运行

构建：

```bash
npm run build
```

启动生产服务：

```bash
npm run start
```

代码检查：

```bash
npm run lint
```

## 登录与默认配置

当前默认配置位于 [src/lib/config.ts](/C:/Users/suqin/Desktop/SakuraNav/src/lib/config.ts)。

默认值如下：

```ts
adminUsername: "admin"
adminPassword: "sakura123456"
adminPath: "sakura-entry"
rememberDays: 30
```

对应的隐藏登录地址为：

- `http://localhost:3000/sakura-entry`

登录成功后会返回首页，并开启：

- 编辑按钮
- 退出登录按钮
- 隐藏标签可见
- 隐藏站点可见
- 标签拖拽排序
- 标签内网站拖拽排序

游客模式下：

- 看不到隐藏标签
- 看不到关联隐藏标签的网站
- 没有编辑权限

## 配置说明

主要配置文件是 [src/lib/config.ts](/C:/Users/suqin/Desktop/SakuraNav/src/lib/config.ts)。

你可以修改：

- `adminUsername`：登录用户名
- `adminPassword`：登录密码
- `adminPath`：隐藏登录路径
- `sessionSecret`：会话签名密钥
- `rememberDays`：免登录天数
- `pageSize`：每页渐进式加载的网站数量
- `defaultSearchEngine`：默认搜索引擎

建议在正式部署前至少修改：

- `adminPassword`
- `adminPath`
- `sessionSecret`

## 数据与存储

SQLite 数据库：

- `storage/sakuranav.sqlite`

上传壁纸目录：

- `storage/uploads`

当前数据库包含这些核心数据结构：

- `tags`：标签，支持隐藏属性和排序
- `sites`：网站基础信息和全局排序
- `site_tags`：网站与标签的关联关系，以及标签内排序
- `theme_appearances`：明暗主题外观配置
- `assets`：上传资源元数据

## 页面与功能说明

### 1. 导航页

- 顶部左侧 Logo 点击后，会切回“全部网站”模式
- 顶部右侧可切换明暗主题
- 登录后右上角会出现编辑和退出按钮

### 2. 标签栏

- 默认展开
- 支持收起
- 点击标签后展示该标签下的网站
- 登录后支持拖拽调整标签顺序
- 可设置隐藏标签，仅登录后可见

### 3. 搜索框

支持三种模式：

- `Google`
- `Baidu`
- `站内搜索`

其中：

- Google / Baidu 会跳转外部搜索页面
- 站内搜索会在当前视图范围内搜索站点名、描述、标签

### 4. 网站列表

- 默认进入时显示“全部网站”
- 采用渐进式加载，用户向下滚动时继续加载更多
- 点击标签后进入标签视图，也采用渐进式加载
- 登录后在某个标签视图下可以拖拽网站顺序

### 5. 管理抽屉

登录后右侧抽屉支持：

- 网站新增、编辑、删除
- 标签新增、编辑、删除
- 标签隐藏开关
- 明暗主题外观配置
- 壁纸上传

## 目录结构

```text
src/
  app/
    page.tsx                    # 首页
    [...slug]/page.tsx          # 隐藏登录路由
    api/                        # 后端接口
  components/
    sakura-nav-app.tsx          # 导航页主界面
    login-screen.tsx            # 登录页
  lib/
    auth.ts                     # 登录态与 Cookie
    config.ts                   # 项目配置
    db.ts                       # SQLite 与数据访问
    schemas.ts                  # 接口入参校验
    types.ts                    # 共享类型
storage/
  uploads/                      # 上传壁纸目录
  sakuranav.sqlite              # SQLite 数据库（运行后生成）
```

## 已验证内容

我已经验证过：

- `npm run build` 通过
- `npm run lint` 通过

说明：

- `lint` 目前是通过的，但会保留少量 `<img>` 相关 warning 提示时机，属于 Next.js 的图片优化建议，不影响运行

## 后续建议

如果你接下来要继续增强这个项目，比较值得优先做的是：

1. 把账号密码与 `sessionSecret` 改成环境变量
2. 给网站图标和壁纸接入更完整的图片优化方案
3. 增加站点拖拽的“全部网站”排序管理界面
4. 给 SQLite 数据增加导入 / 导出能力
5. 增加 README 中未覆盖的部署文档，例如 PM2、Docker 或 Windows 服务部署
