# FAQ

| Issue | Cause | Solution |
|:------|:------|:---------|
| Database locked | SQLite WAL mode concurrency issue | SQLite adapter has built-in Mutex lock ensuring serialized execution in async environments |
| Theme flash | Server-rendered theme mismatch with client | Uses `beforeInteractive` script to initialize theme ahead of time |
| Drag lag | Performance issues with many elements | Uses virtualization and deferred updates |
| AI features unavailable | AI model not configured | Configure API Key / Base URL / Model name in Settings → Site → AI Model panel |
| Registration unavailable | `registration_enabled` set to false | Enable registration in admin settings |

---

## Contributing

Issues and Pull Requests are welcome!

---

## License

MIT License
