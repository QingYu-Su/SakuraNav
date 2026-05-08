# 常见问题

| 问题 | 原因 | 解决方案 |
|:-----|:-----|:---------|
| 数据库锁定 | SQLite WAL 模式并发问题 | SQLite 适配器内置 Mutex 互斥锁，确保 async 环境下操作串行执行 |
| 主题闪烁 | 服务端渲染与客户端主题不一致 | 使用 `beforeInteractive` 脚本提前初始化主题 |
| 拖拽卡顿 | 大量元素时性能问题 | 使用虚拟化和延迟更新 |
| AI 功能不可用 | 未配置 AI 模型 | 在「设置 → 站点 → AI 模型」面板中配置 API Key / Base URL / 模型名称 |
| 注册功能不可用 | `registration_enabled` 设置为 false | 在管理设置中开启注册功能 |

---

## 贡献指南

欢迎提交 Issue 和 Pull Request！

---

## 许可证

MIT License
