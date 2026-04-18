# SakuraNav - AI 项目上下文

## 项目简介

SakuraNav 是一个**个人导航页**项目。

> 本文件不会随代码更新，请阅读以下文档获取最新信息。

## 文档索引

| 文档 | 说明 |
|:-----|:-----|
| [`README.md`](../README.md) | 项目概述、功能特性、部署方式、配置说明 |
| [`docs/DEVELOPMENT.md`](../docs/DEVELOPMENT.md) | 项目架构、目录结构、数据库设计、API 接口、开发指南 |
| [`docs/DOCKER.md`](../docs/DOCKER.md) | Docker 部署详细指南 |
| [`config.example.yml`](../config.example.yml) | 配置文件模板，包含所有可配置项 |

建议按 README → DEVELOPMENT.md 的顺序阅读，即可全面了解项目。

## 目录说明

```
SakuraNav/
├── src/              # 源码目录
├── public/           # 静态资源目录
├── docs/             # 项目文档目录
├── storage/          # 用户数据目录（构建运行后自动创建）
├── .context/         # AI 辅助上下文目录
├── config.example.yml  # 配置文件模板
├── build-and-run.js    # 构建并运行脚本
└── package.json        # 项目配置
```

> `storage/` 目录在首次构建运行后会自动创建，包含数据库、上传文件等用户数据，不应手动修改。
