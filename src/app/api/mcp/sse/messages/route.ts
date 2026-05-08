/**
 * MCP SSE 消息端点 - 接收 SSE 客户端的 POST 消息
 * @description 处理 POST 请求以接收 SSE 客户端发送的 JSON-RPC 消息
 */

import { handleSsePostRequest } from "@/lib/mcp/transport/sse";
import { isRateLimited, getClientIp } from "@/lib/utils/rate-limit";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("API:McpSseMessages");

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (isRateLimited(ip, "mcp")) {
    return Response.json({ error: "请求过于频繁，请稍后重试" }, { status: 429 });
  }

  try {
    return await handleSsePostRequest(request);
  } catch (error) {
    logger.error("MCP SSE 消息处理失败", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "内部错误" },
      { status: 500 },
    );
  }
}
