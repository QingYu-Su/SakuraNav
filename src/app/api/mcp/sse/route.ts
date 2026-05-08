/**
 * MCP SSE 端点 - 建立 SSE 长连接
 * @description 处理 GET 请求以建立 SSE 连接
 */

import { authenticateMcpRequest } from "@/lib/mcp/auth";
import { handleSseGetRequest } from "@/lib/mcp/transport/sse";
import { isRateLimited, getClientIp } from "@/lib/utils/rate-limit";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("API:McpSse");

export async function GET(request: Request) {
  const ip = getClientIp(request);
  if (isRateLimited(ip, "mcp")) {
    return Response.json({ error: "请求过于频繁，请稍后重试" }, { status: 429 });
  }

  try {
    const session = await authenticateMcpRequest(request);
    if (!session) {
      return Response.json({ error: "未授权：请提供有效的 API Token" }, { status: 401 });
    }

    return await handleSseGetRequest(request, session);
  } catch (error) {
    logger.error("MCP SSE 连接失败", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "内部错误" },
      { status: 500 },
    );
  }
}
