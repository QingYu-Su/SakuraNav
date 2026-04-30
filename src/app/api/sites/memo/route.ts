/**
 * 网站备忘便签更新 API
 * @description PATCH /api/sites/memo — 仅更新 notes 和/或 todos 字段
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUserSession } from "@/lib/base/auth";
import { getSiteById, updateSiteMemo } from "@/lib/services/site-repository";
import { jsonError, jsonOk } from "@/lib/utils/utils";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("API:SitesMemo");

const memoUpdateSchema = z.object({
  id: z.string().min(1),
  notes: z.string().max(5000).optional(),
  notesAiEnabled: z.boolean().optional(),
  todos: z.array(z.object({
    id: z.string().min(1),
    text: z.string().max(500),
    completed: z.boolean(),
  })).optional(),
  todosAiEnabled: z.boolean().optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const _session = await requireUserSession();
    const body = await request.json();
    const parsed = memoUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("参数校验失败", 400);
    }

    const { id, notes, notesAiEnabled, todos, todosAiEnabled } = parsed.data;

    // 确认站点存在
    const existing = getSiteById(id);
    if (!existing) {
      return jsonError("网站不存在", 404);
    }

    updateSiteMemo(id, { notes, notesAiEnabled, todos, todosAiEnabled });
    logger.info(`站点 ${id} 备忘便签已更新`);

    return jsonOk({ success: true });
  } catch (error) {
    logger.error("更新备忘便签失败", error);
    return jsonError("更新失败", 500);
  }
}
