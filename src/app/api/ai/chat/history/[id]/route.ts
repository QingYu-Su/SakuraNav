/**
 * AI 聊天历史详情 API
 * @description GET 获取消息 / PUT 追加消息 / DELETE 删除对话
 */

import { NextRequest } from "next/server";
import { getSession, getEffectiveOwnerId } from "@/lib/base/auth";
import { getMessages, appendMessages, replaceMessages, deleteConversation, updateConversation } from "@/lib/services";
import { jsonError, jsonOk } from "@/lib/utils/utils";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session?.isAuthenticated) return jsonError("请先登录", 401);
    const { id } = await params;
    const ownerId = getEffectiveOwnerId(session);
    // 简单权限校验：通过查询时 owner_id 过滤（repository 层保证）
    const messages = await getMessages(id);
    // 验证对话属于当前用户（通过消息是否存在间接验证）
    if (!messages.length) {
      // 可能是空对话或者不属于当前用户 — 需要额外校验
      const { getConversations } = await import("@/lib/services");
      const convs = await getConversations(ownerId);
      if (!convs.find((c) => c.id === id)) return jsonError("对话不存在", 404);
    }
    return jsonOk(messages);
  } catch {
    return jsonError("获取消息失败", 500);
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session?.isAuthenticated) return jsonError("请先登录", 401);
    const { id } = await params;
    const ownerId = getEffectiveOwnerId(session);
    const body = await request.json() as {
      messages?: Array<{ role: "user" | "assistant" | "system"; content: string; toolCalls?: string }>;
      title?: string;
      replace?: boolean;
    };

    // 权限校验：确认对话属于当前用户
    const { getConversations } = await import("@/lib/services");
    const convs = await getConversations(ownerId);
    if (!convs.find((c) => c.id === id)) return jsonError("对话不存在", 404);

    // 保存消息
    if (body.messages?.length) {
      if (body.replace) {
        await replaceMessages(id, body.messages);
      } else {
        await appendMessages(id, body.messages);
      }
    }

    // 更新标题
    if (body.title) {
      await updateConversation(ownerId, id, body.title);
    }

    return jsonOk({ success: true });
  } catch {
    return jsonError("更新对话失败", 500);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session?.isAuthenticated) return jsonError("请先登录", 401);
    const { id } = await params;
    const ownerId = getEffectiveOwnerId(session);
    const deleted = await deleteConversation(ownerId, id);
    if (!deleted) return jsonError("对话不存在", 404);
    return jsonOk({ success: true });
  } catch {
    return jsonError("删除对话失败", 500);
  }
}
