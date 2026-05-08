# SakuraNav - AI 初始化指南

> 本文件用于 AI 快速建立项目上下文。按以下步骤执行，无需读取所有文件。

## 步骤 1：了解项目

读取 [`README.md`](../README.md)，获取项目概述、功能特性和部署方式。

## 步骤 2：了解项目架构

读取 [`docs/guide/architecture.md`](../docs/guide/architecture.md) 和 [`docs/guide/directory-structure.md`](../docs/guide/directory-structure.md)，建立对项目整体结构的认知：

- **项目架构**：技术栈、三层架构、核心设计原则
- **目录结构**：完整的目录树及每个文件的职责说明

> 仅读取上述两个页面即可，其余页面在开发时按需查阅。

## 步骤 3：建立开发文档索引

浏览 `docs/guide/` 目录下的所有页面文件名，了解文档的完整章节结构（基础、核心模块、接口与指南），但**不需要仔细阅读各页面的具体内容**，只需记住有哪些章节及其对应主题，以便开发具体功能时能快速定位到对应页面阅读规范。

## 文档站点说明

项目文档使用 VitePress 构建，位于 `docs/` 目录：

- `docs/guide/` — 中文开发文档（11 个子页面）
- `docs/en/guide/` — 英文版开发文档
- `docs/.vitepress/config.mts` — VitePress 配置（导航栏、侧边栏、i18n）
- 本地预览：`npm run docs:dev`
- 构建部署：`npm run docs:build`（CI 自动部署到 GitHub Pages）
