# 数据库与服务层

完整的数据库与服务层文档请参考[中文版数据库与服务层](/guide/database)。

核心要点：

- `DatabaseAdapter` 接口支持 SQLite/MySQL/PostgreSQL
- Repository 模式（SiteRepository/TagRepository/AppearanceRepository 等）
- SQL 方言自动转换（`sql-dialect.ts`）
- 服务层（ConfigService/DataPortabilityService/SearchService 等）
