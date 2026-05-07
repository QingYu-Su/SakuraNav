/**
 * 快照 API
 * @description 提供快照的创建、列表、删除和恢复功能
 *
 * POST   /api/snapshots          — 创建快照
 * GET    /api/snapshots          — 获取快照列表
 * DELETE /api/snapshots?id=xxx   — 删除单个快照
 * POST   /api/snapshots/restore  — 恢复快照
 * POST   /api/snapshots/cleanup  — 清理过期快照
 */

import { NextRequest, NextResponse } from "next/server";
import { requireUserSession, getEffectiveOwnerId } from "@/lib/base/auth";
import { createSnapshot, getSnapshotMetas, deleteSnapshot, renameSnapshot, restoreFromSnapshot, cleanupExpiredSnapshots } from "@/lib/services";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("SnapshotsAPI");

/** JSON 响应辅助 */
function jsonOk(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}
function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * GET /api/snapshots
 * 获取当前用户的快照列表
 */
export async function GET() {
  try {
    const session = await requireUserSession();
    const ownerId = getEffectiveOwnerId(session);
    const metas = await getSnapshotMetas(ownerId);
    return jsonOk({ items: metas });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "获取快照列表失败";
    if (msg.includes("未登录") || msg.includes("Unauthorized")) return jsonError("未授权", 401);
    logger.error("获取快照列表失败", e);
    return jsonError(msg, 500);
  }
}

/**
 * POST /api/snapshots
 * 创建快照（label 可选，默认使用当前时间）
 *
 * POST /api/snapshots/restore?id=xxx
 * 恢复快照
 *
 * POST /api/snapshots/cleanup
 * 清理过期快照
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireUserSession();
    const ownerId = getEffectiveOwnerId(session);
    const url = new URL(req.url);

    // 路径分发
    const action = url.searchParams.get("action");

    if (action === "restore") {
      // 恢复快照
      const id = url.searchParams.get("id");
      if (!id) return jsonError("缺少快照 ID");
      const success = await restoreFromSnapshot(id, ownerId);
      if (!success) return jsonError("快照不存在或恢复失败");
      logger.info(`用户 ${session.username} 恢复了快照 ${id}`);
      return jsonOk({ ok: true });
    }

    if (action === "cleanup") {
      // 清理过期快照（仅管理员可调用）
      if (session.role !== "admin") return jsonError("无权限", 403);
      const count = await cleanupExpiredSnapshots();
      return jsonOk({ ok: true, cleaned: count });
    }

    // 创建快照
    let body: { label?: string } = {};
    try {
      body = await req.json();
    } catch { /* 空 body，使用默认 label */ }

    // 自动生成版本号标签：vN
    const label = body.label || await (async () => {
      const existing = await getSnapshotMetas(ownerId);
      // 从现有快照标签中提取最大版本号
      let maxVer = 0;
      for (const s of existing) {
        const m = s.label.match(/^v(\d+)$/);
        if (m) maxVer = Math.max(maxVer, parseInt(m[1], 10));
      }
      return `v${maxVer + 1}`;
    })();

    const meta = await createSnapshot(ownerId, label);
    if (!meta) {
      return jsonOk({ skipped: true });
    }
    return jsonOk({ item: meta });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "操作失败";
    if (msg.includes("未登录") || msg.includes("Unauthorized")) return jsonError("未授权", 401);
    logger.error("快照操作失败", e);
    return jsonError(msg, 500);
  }
}

/**
 * DELETE /api/snapshots?id=xxx
 * 删除单个快照
 *
 * PATCH /api/snapshots?id=xxx
 * 重命名快照
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await requireUserSession();
    const ownerId = getEffectiveOwnerId(session);
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return jsonError("缺少快照 ID");

    const success = await deleteSnapshot(id, ownerId);
    if (!success) return jsonError("快照不存在");
    return jsonOk({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "删除快照失败";
    if (msg.includes("未登录") || msg.includes("Unauthorized")) return jsonError("未授权", 401);
    logger.error("删除快照失败", e);
    return jsonError(msg, 500);
  }
}

/**
 * PATCH /api/snapshots?id=xxx
 * 重命名快照 { label: string }
 */
export async function PATCH(req: NextRequest) {
  try {
    const session = await requireUserSession();
    const ownerId = getEffectiveOwnerId(session);
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return jsonError("缺少快照 ID");

    const body = await req.json() as { label?: string };
    if (!body.label?.trim()) return jsonError("缺少标签名称");

    const success = await renameSnapshot(id, ownerId, body.label.trim());
    if (!success) return jsonError("快照不存在");
    return jsonOk({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "重命名失败";
    if (msg.includes("未登录") || msg.includes("Unauthorized")) return jsonError("未授权", 401);
    logger.error("重命名快照失败", e);
    return jsonError(msg, 500);
  }
}
