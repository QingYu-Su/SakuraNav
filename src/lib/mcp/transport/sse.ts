/**
 * @description 旧版 SSE 传输实现（兼容旧版 MCP 客户端）
 *
 * 旧版 SSE 协议流程：
 * 1. 客户端 GET /api/mcp/sse → 服务端返回 SSE 流，发送 `endpoint` 事件
 * 2. 客户端 POST /api/mcp/sse/messages?sessionId=xxx → 发送 JSON-RPC 消息
 *
 * 使用 Web Standard APIs (Request/Response/ReadableStream)，
 * 兼容 Next.js App Router 环境。
 */

import { randomUUID } from "crypto";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import type { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";
import type { SessionUser } from "@/lib/base/types";
import { createMcpServer } from "../server";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("McpSseTransport");

/** 有状态的 SSE session */
interface SseSession {
  sessionId: string;
  transport: LegacySseTransport;
  session: SessionUser;
}

const activeSessions = new Map<string, SseSession>();

/** 清理超时 session（30 分钟无活动） */
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const sessionTimers = new Map<string, ReturnType<typeof setTimeout>>();

function refreshSessionTimer(sessionId: string) {
  const existing = sessionTimers.get(sessionId);
  if (existing) clearTimeout(existing);
  const timer = setTimeout(() => {
    const entry = activeSessions.get(sessionId);
    if (entry) {
      entry.transport.close().catch(() => {});
      activeSessions.delete(sessionId);
      logger.info("SSE session 过期清理", { sessionId });
    }
    sessionTimers.delete(sessionId);
  }, SESSION_TIMEOUT_MS);
  if (timer.unref) timer.unref();
  sessionTimers.set(sessionId, timer);
}

/**
 * 旧版 SSE Transport —— 实现 MCP Transport 接口
 *
 * - start(): 创建 SSE ReadableStream，发送 endpoint 事件
 * - send():  通过 SSE event: message 发送 JSON-RPC 响应
 * - close(): 关闭 SSE 流
 * - handleMessage(): 外部调用，处理 POST 请求中的 JSON-RPC 消息
 */
class LegacySseTransport implements Transport {
  sessionId: string;
  endpointPath: string;

  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;

  private controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  private stream: ReadableStream<Uint8Array> | null = null;
  private encoder = new TextEncoder();
  private _closed = false;

  constructor(sessionId: string, endpointPath: string) {
    this.sessionId = sessionId;
    this.endpointPath = endpointPath;
  }

  async start(): Promise<void> {
    this.stream = new ReadableStream<Uint8Array>({
      start: (controller) => {
        this.controller = controller;
        // 发送 endpoint 事件，告知客户端 POST 消息的 URL
        this.writeEvent("endpoint", `${this.endpointPath}?sessionId=${this.sessionId}`);
      },
    });
  }

  async send(message: JSONRPCMessage): Promise<void> {
    if (this._closed || !this.controller) return;
    this.writeEvent("message", JSON.stringify(message));
  }

  async close(): Promise<void> {
    if (this._closed) return;
    this._closed = true;
    try {
      this.controller?.close();
    } catch {
      // stream already closed
    }
    this.onclose?.();
  }

  /**
   * 外部调用：处理客户端 POST 过来的 JSON-RPC 消息
   */
  async handlePostMessage(body: unknown): Promise<void> {
    if (this.onmessage) {
      this.onmessage(body as JSONRPCMessage);
    }
  }

  /**
   * 获取 SSE Response 对象
   */
  getResponse(): Response {
    return new Response(this.stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Mcp-Session-Id": this.sessionId,
      },
    });
  }

  private writeEvent(event: string, data: string) {
    if (this._closed || !this.controller) return;
    const chunk = this.encoder.encode(`event: ${event}\ndata: ${data}\n\n`);
    try {
      this.controller.enqueue(chunk);
    } catch {
      // stream already closed
    }
  }
}

/**
 * 处理 SSE GET 请求 - 建立旧版 SSE 长连接
 */
export async function handleSseGetRequest(
  request: Request,
  session: SessionUser,
): Promise<Response> {
  const sessionId = randomUUID();
  const endpointPath = "/api/mcp/sse/messages";

  const getSession = () => session;
  const server = createMcpServer(getSession);
  const transport = new LegacySseTransport(sessionId, endpointPath);

  // 连接 McpServer 和 Transport
  await server.connect(transport);

  // 存储到内存
  activeSessions.set(sessionId, { sessionId, transport, session });
  refreshSessionTimer(sessionId);

  // 处理客户端断开
  request.signal.addEventListener("abort", () => {
    activeSessions.delete(sessionId);
    const timer = sessionTimers.get(sessionId);
    if (timer) { clearTimeout(timer); sessionTimers.delete(sessionId); }
    transport.close().catch(() => {});
    logger.info("SSE 连接断开", { sessionId });
  });

  logger.info("SSE session 建立", { sessionId });
  return transport.getResponse();
}

/**
 * 处理 SSE POST 请求 - 客户端通过此端点发送消息
 */
export async function handleSsePostRequest(
  request: Request,
): Promise<Response> {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId");

  if (!sessionId) {
    return Response.json(
      { jsonrpc: "2.0", error: { code: -32600, message: "缺少 sessionId 参数" } },
      { status: 400 },
    );
  }

  const entry = activeSessions.get(sessionId);
  if (!entry) {
    return Response.json(
      { jsonrpc: "2.0", error: { code: -32600, message: "无效或已过期的 session" } },
      { status: 404 },
    );
  }

  // 验证认证
  const { authenticateMcpRequest } = await import("@/lib/mcp/auth");
  const session = await authenticateMcpRequest(request);
  if (!session || session.userId !== entry.session.userId) {
    return Response.json(
      { jsonrpc: "2.0", error: { code: -32001, message: "未授权" } },
      { status: 401 },
    );
  }

  refreshSessionTimer(sessionId);

  try {
    const body = await request.json();
    await entry.transport.handlePostMessage(body);
    return new Response(null, { status: 202 });
  } catch (error) {
    logger.error("SSE POST 消息处理失败", error);
    return Response.json(
      { jsonrpc: "2.0", error: { code: -32700, message: "无效的 JSON 消息" } },
      { status: 400 },
    );
  }
}
