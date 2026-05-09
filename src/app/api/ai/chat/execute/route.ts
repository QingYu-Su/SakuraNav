/**
 * AI 助手操作执行 API
 * @description 接收已确认的操作计划，创建快照后依次执行写操作
 * 支持流式输出每个操作的执行进度
 */

import { NextRequest } from "next/server";
import { getSession, getEffectiveOwnerId } from "@/lib/base/auth";
import { forceCreateSnapshot } from "@/lib/services";
import { executeOneOp } from "@/lib/ai/assistant-write-ops";
import { jsonError, jsonOk } from "@/lib/utils/utils";
import { createLogger } from "@/lib/base/logger";
import type { WriteOpType } from "@/lib/ai/assistant-plan-tool";

const logger = createLogger("API:AI:ChatExecute");

export async function POST(request: NextRequest) {
  try {
    // 1. 认证检查
    const session = await getSession();
    if (!session?.isAuthenticated) {
      return jsonError("请先登录", 401);
    }

    const body = await request.json() as {
      operations?: Array<{ type: WriteOpType; params: Record<string, unknown>; description?: string }>;
      stream?: boolean;
    };

    const operations = body.operations;
    if (!operations || !Array.isArray(operations) || operations.length === 0) {
      return jsonError("操作列表不能为空", 400);
    }

    const ownerId = getEffectiveOwnerId(session);
    const useStream = body.stream === true;

    // 2. 强制创建操作前快照（无论数据是否变化都创建）
    const snapshot = await forceCreateSnapshot(ownerId, "AI 操作前自动备份");
    logger.info("已强制创建操作前快照", { snapshotId: snapshot.id });

    // 3. 非流式模式：保持兼容
    if (!useStream) {
      const results = [];
      for (const op of operations) {
        const result = await executeOneOp(op.type, op.params, ownerId);
        results.push(result);
      }
      const successCount = results.filter((r) => r.success).length;
      const failCount = results.filter((r) => !r.success).length;
      logger.info("操作执行完成", { total: operations.length, success: successCount, failed: failCount });
      return jsonOk({
        snapshotId: snapshot.id,
        results,
        summary: { total: operations.length, success: successCount, failed: failCount },
      });
    }

    // 4. 流式模式：逐个执行并推送进度
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: Record<string, unknown>) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        // 发送快照 ID
        send({ type: "snapshot", snapshotId: snapshot.id });

        const results = [];
        for (let i = 0; i < operations.length; i++) {
          const op = operations[i];
          // 发送"正在执行"进度
          send({ type: "progress", index: i, description: op.description ?? `${i + 1}/${operations.length}`, success: null });

          const result = await executeOneOp(op.type, op.params, ownerId);
          results.push(result);

          // 发送"执行完成"进度
          send({ type: "progress", index: i, description: result.description, success: result.success });
        }

        const successCount = results.filter((r) => r.success).length;
        const failCount = results.filter((r) => !r.success).length;
        logger.info("操作执行完成", { total: operations.length, success: successCount, failed: failCount });

        // 发送最终结果
        send({
          type: "result",
          data: {
            snapshotId: snapshot.id,
            results,
            summary: { total: operations.length, success: successCount, failed: failCount },
          },
        });

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    logger.error("操作执行失败", error);
    return jsonError("操作执行失败，请稍后重试", 500);
  }
}
