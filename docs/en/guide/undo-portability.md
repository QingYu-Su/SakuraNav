# 撤销与数据可移植性

完整的撤销与数据可移植性文档请参考[中文版撤销与数据可移植性](/guide/undo-portability)。

核心要点：

- 撤销系统基于栈结构，支持 Ctrl+Z 和 Toast 撤销
- 延迟资源删除，编辑模式下暂存待删除资源
- 数据导入/导出使用 `dynamicInsert()` 自动跟随新增字段
- 去重匹配由 `getCardIdentityKey()` 统一驱动
