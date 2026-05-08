/**
 * @description Streamable HTTP 传输适配 - 使用 WebStandardStreamableHTTPServerTransport
 * 无状态模式，每次请求独立创建 transport 和 server 实例
 */

import type { SessionUser } from "@/lib/base/types";
import { createMcpServer } from "../server";

/**
 * 处理 Streamable HTTP 请求
 * @param request Web Standard Request（Next.js 传入）
 * @param session 已认证的用户会话
 */
export async function handleStreamableHttpRequest(
  request: Request,
  session: SessionUser,
): Promise<Response> {
  const { WebStandardStreamableHTTPServerTransport } = await import(
    "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js"
  );

  // 每次 GET/POST/DELETE 请求创建独立的 server + transport
  const getSession = () => session;
  const server = createMcpServer(getSession);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  await server.connect(transport);

  try {
    return await transport.handleRequest(request);
  } finally {
    await transport.close().catch(() => {});
  }
}
