/**
 * AI 聊天历史 API
 * @description GET 获取对话列表 / POST 创建新对话
 */

import { NextRequest } from "next/server";
import { getSession, getEffectiveOwnerId } from "@/lib/base/auth";
import { getConversations, createConversation } from "@/lib/services";
import { jsonError, jsonOk } from "@/lib/utils/utils";

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.isAuthenticated) return jsonError("请先登录", 401);
    const ownerId = getEffectiveOwnerId(session);
    const conversations = await getConversations(ownerId);
    return jsonOk(conversations);
  } catch {
    return jsonError("获取对话列表失败", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.isAuthenticated) return jsonError("请先登录", 401);
    const ownerId = getEffectiveOwnerId(session);
    const body = await request.json() as { title?: string };
    const title = body.title?.trim() || "新对话";
    const conversation = await createConversation(ownerId, title);
    return jsonOk(conversation);
  } catch {
    return jsonError("创建对话失败", 500);
  }
}
