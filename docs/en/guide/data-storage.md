# 数据存储

完整的数据存储文档请参考[中文版数据存储](/guide/data-storage)。

核心要点：

- 支持 SQLite / MySQL / PostgreSQL 三种数据库
- 通过 `DatabaseAdapter` 接口统一 API
- `url_online_cache` 表提供 20 小时在线状态缓存
- 虚拟标签（`__social_cards__` / `__note_cards__`）由 API 动态注入
