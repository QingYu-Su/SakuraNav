/**
 * MCP Streamable HTTP 端点
 * @description 处理所有 Streamable HTTP 传输的请求（GET/POST/DELETE）
 * 无状态模式，每次请求独立处理
 */

import { authenticateMcpRequest } from "@/lib/mcp/auth";
import { handleStreamableHttpRequest } from "@/lib/mcp/transport/streamable-http";
import { isRateLimited, getClientIp } from "@/lib/utils/rate-limit";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("API:Mcp");

export async function POST(request: Request) {
  const ip = getClientIp(request);
  if (isRateLimited(ip, "mcp")) {
    return Response.json({ error: "请求过于频繁，请稍后重试" }, { status: 429 });
  }

  try {
    const session = await authenticateMcpRequest(request);
    if (!session) {
      return Response.json({ error: "未授权：请提供有效的 API Token" }, { status: 401 });
    }

    return await handleStreamableHttpRequest(request, session);
  } catch (error) {
    logger.error("MCP 请求处理失败", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "内部错误" },
      { status: 500 },
    );
  }
}

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

    return await handleStreamableHttpRequest(request, session);
  } catch (error) {
    logger.error("MCP GET 请求处理失败", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "内部错误" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const ip = getClientIp(request);
  if (isRateLimited(ip, "mcp")) {
    return Response.json({ error: "请求过于频繁，请稍后重试" }, { status: 429 });
  }

  try {
    const session = await authenticateMcpRequest(request);
    if (!session) {
      return Response.json({ error: "未授权：请提供有效的 API Token" }, { status: 401 });
    }

    return await handleStreamableHttpRequest(request, session);
  } catch (error) {
    logger.error("MCP DELETE 请求处理失败", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "内部错误" },
      { status: 500 },
    );
  }
}
