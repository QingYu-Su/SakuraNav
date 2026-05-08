# 认证与安全

完整的认证与安全文档请参考[中文版认证与安全](/guide/auth)。

核心要点：

- JWT (jose, HS256) + HTTP-Only Cookie + scrypt 密码哈希
- 支持 OAuth 第三方登录（GitHub/微信/企业微信/飞书/钉钉）
- Token 吊销机制：登出/改密时写入时间戳
- CSRF/SSRF/XSS 防护、速率限制、HTML 输入消毒
