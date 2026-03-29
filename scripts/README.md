# 构建脚本说明

## 脚本用途

跨平台的构建和启动脚本，支持 Windows、Linux 和 macOS。

## 使用方法

### 方式 1: 使用 npm script（推荐）

```bash
# 完整流程（代码检查 + 构建 + 启动）
npm run build:start

# 跳过代码检查
npm run build:start:skip-lint

# 跳过构建（仅启动）
npm run build:start:skip-build
```

### 方式 2: 直接运行 Node 脚本

```bash
# 完整流程
node scripts/build-and-run.js

# 跳过代码检查
node scripts/build-and-run.js --skip-lint

# 跳过构建
node scripts/build-and-run.js --skip-build
```

### 方式 3: Linux/macOS 直接执行

```bash
# 首次使用需要添加执行权限
chmod +x scripts/build-and-run.js

# 运行脚本
./scripts/build-and-run.js
```

## 命令行参数

- `--skip-lint`: 跳过代码检查步骤
- `--skip-build`: 跳过构建步骤

## 注意事项

1. `npm run start` 需要先执行过 `npm run build`，否则会失败
2. 如果跳过构建步骤，请确保项目已经构建过
3. 脚本会在项目根目录下执行所有命令
