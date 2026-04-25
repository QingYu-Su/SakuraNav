/**
 * AI 文本处理工具
 * @description 从 AI 模型返回的原始文本中提取结构化 JSON 数据
 * 兼容各种供应商的返回格式（纯 JSON、Markdown 代码块、带前导/尾部文字等）
 */

/**
 * 从 AI 返回的原始文本中提取 JSON 对象
 *
 * 支持的格式：
 * 1. 纯 JSON：`{"key": "value"}`
 * 2. Markdown 代码块：```json\n{...}\n```
 * 3. 带前导文字：`好的，以下是分析结果：\n{"key": "value"}`
 * 4. 带尾部文字：`{"key": "value"}\n以上是分析结果`
 * 5. 代码块 + 前导/尾部文字的组合
 *
 * @param text AI 模型返回的原始文本
 * @returns 解析后的 JSON 对象，解析失败时抛出 Error
 */
export function extractAiJson<T>(text: string): T {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("AI 返回内容为空");
  }

  // 策略 1：尝试直接解析（纯 JSON 响应）
  if (trimmed.startsWith("{")) {
    try {
      return JSON.parse(trimmed) as T;
    } catch {
      // 可能尾部有多余文字，尝试截取
    }
  }

  // 策略 2：提取 Markdown 代码块中的内容
  const mdMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (mdMatch) {
    const inner = mdMatch[1]!.trim();
    try {
      return JSON.parse(inner) as T;
    } catch {
      // 代码块内容也不是合法 JSON，继续尝试
    }
  }

  // 策略 3：在文本中查找第一个完整的 JSON 对象 `{...}`
  // 找到第一个 `{`，然后匹配到对应的 `}`
  const firstBrace = trimmed.indexOf("{");
  if (firstBrace >= 0) {
    // 从第一个 `{` 开始，通过括号匹配找到完整的 JSON
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let i = firstBrace; i < trimmed.length; i++) {
      const ch = trimmed[i];
      if (escape) { escape = false; continue; }
      if (ch === "\\") { if (inString) escape = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === "{") depth++;
      else if (ch === "}") depth--;
      if (depth === 0) {
        const candidate = trimmed.slice(firstBrace, i + 1);
        try {
          return JSON.parse(candidate) as T;
        } catch {
          break; // 找到了 `}` 但解析失败，不再继续
        }
      }
    }
  }

  throw new Error("无法从 AI 返回内容中提取有效 JSON");
}
