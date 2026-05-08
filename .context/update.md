# SakuraNav - AI 版本发布流程

> 本文件定义了 AI 在执行版本发布时的工作流程。

## 发布步骤

按顺序执行以下操作：

### 1. 收集变更

对比最新 `git commit` 与上一个版本标签之间的所有差异，梳理出完整的变更清单。

### 2. 更新 CHANGELOG

将变更清单分类整理为 `Features` 和 `Bug Fixes`，按以下格式**同时更新** `docs/changelog.md`（中文）和 `docs/en/changelog.md`（英文）的顶部：

> ⚠️ **必须同步更新中英文两个版本**，内容保持一致，仅语言不同。不得只更新其中一个而遗漏另一个。

```markdown
## vX.Y.Z (YYYY-MM-DD)

### Features
- xxx

### Bug Fixes
- xxx
```

### 3. 更新内置版本号

将 `package.json` 中的 `version` 字段更新为目标版本号（与 Git Tag 一致）。

### 4. 更新 README

根据本次版本变更内容，同步更新项目根目录下的中英文 README：

- **README.md** — 中文版
- **README_EN.md** — 英文版

> ⚠️ **两个 README 必须完全同步**，内容保持一致，仅语言不同。不得只更新其中一个而遗漏另一个。

### 5. 更新 Docker 部署文档

如本次版本涉及部署方式、配置项或环境变量变更，需同步更新：

- `docs/docker.md`（中文）和 `docs/en/docker.md`（英文）

### 6. 提交变更

将 CHANGELOG、README 和 package.json 的更新提交到 Git。提交信息必须遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
chore(release): vX.Y.Z
```

示例：`chore(release): v1.7.0`

> 提交范围固定为 `release`，类型固定为 `chore`，不使用其他前缀。

### 7. 打版本标签

使用开发者提供的版本号创建 Git Tag。标签命名格式为 `vX.Y.Z`，标签注解（annotated tag）内容应包含版本摘要：

```bash
git tag -a vX.Y.Z -m "Release vX.Y.Z"
```

### 8. 推送发布

推送代码和标签到远程 GitHub，完成新版本发布：

```bash
git push && git push --tags
```

---

## 注意事项

- 版本号由开发者在对话中提供，AI 不要自行决定版本号
- CHANGELOG 描述应面向用户，语言简洁明了，避免出现技术细节和代码片段
- **所有中英文文档必须同步** — 更新 `docs/changelog.md` 时必须同步更新 `docs/en/changelog.md`；更新 `docs/docker.md` 时必须同步更新 `docs/en/docker.md`；更新 `README.md` 时必须同步更新 `README_EN.md`。内容保持一致，仅语言不同，不得只更新其中一个
- README 更新仅限与本次版本变更相关的内容，不要做无关修改
- **清理过时文档内容** — 更新文档时，如果发现已有内容描述的功能/特性已被替换或删除（如废弃的配置项、已移除的 API、旧版目录结构等），应直接安全删除，避免文档臃肿。确保文档始终与项目实际状态保持一致
