/**
 * AI 聊天历史数据仓库
 * @description 管理 AI 助手的对话记录和消息的 CRUD 操作
 */

import { getDb } from "@/lib/database";
import { createLogger } from "@/lib/base/logger";
import type { AiConversation, AiChatMessage } from "@/lib/base/types";

const logger = createLogger("AiChatRepository");

// ── 对话 ──

/** 获取用户的所有对话（按更新时间倒序） */
export async function getConversations(ownerId: string): Promise<AiConversation[]> {
  const db = await getDb();
  const rows = await db.query<{
    id: string; owner_id: string; title: string; created_at: string; updated_at: string;
  }>(
    "SELECT id, owner_id, title, created_at, updated_at FROM ai_conversations WHERE owner_id = ? ORDER BY updated_at DESC",
    [ownerId],
  );
  return rows.map((r) => ({
    id: r.id,
    ownerId: r.owner_id,
    title: r.title,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

/** 创建新对话 */
export async function createConversation(ownerId: string, title: string): Promise<AiConversation> {
  const db = await getDb();
  const id = `conv-${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  await db.execute(
    "INSERT INTO ai_conversations (id, owner_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    [id, ownerId, title, now, now],
  );
  logger.info(`对话已创建: ${id}`);
  return { id, ownerId, title, createdAt: now, updatedAt: now };
}

/** 更新对话标题和更新时间 */
export async function updateConversation(ownerId: string, conversationId: string, title: string): Promise<boolean> {
  const db = await getDb();
  const now = new Date().toISOString();
  const result = await db.execute(
    "UPDATE ai_conversations SET title = ?, updated_at = ? WHERE id = ? AND owner_id = ?",
    [title, now, conversationId, ownerId],
  );
  return result.changes > 0;
}

/** 删除对话（级联删除消息） */
export async function deleteConversation(ownerId: string, conversationId: string): Promise<boolean> {
  const db = await getDb();
  const result = await db.execute(
    "DELETE FROM ai_conversations WHERE id = ? AND owner_id = ?",
    [conversationId, ownerId],
  );
  if (result.changes > 0) {
    logger.info(`对话已删除: ${conversationId}`);
    return true;
  }
  return false;
}

// ── 消息 ──

/** 获取对话的所有消息（按创建时间正序） */
export async function getMessages(conversationId: string): Promise<AiChatMessage[]> {
  const db = await getDb();
  const rows = await db.query<{
    id: string; conversation_id: string; role: string; content: string; tool_calls: string | null; created_at: string;
  }>(
    "SELECT id, conversation_id, role, content, tool_calls, created_at FROM ai_messages WHERE conversation_id = ? ORDER BY created_at ASC",
    [conversationId],
  );
  return rows.map((r) => ({
    id: r.id,
    conversationId: r.conversation_id,
    role: r.role as "user" | "assistant" | "system",
    content: r.content,
    toolCalls: r.tool_calls,
    createdAt: r.created_at,
  }));
}

/** 替换对话的所有消息（先删除再插入） */
export async function replaceMessages(
  conversationId: string,
  messages: Array<{ role: "user" | "assistant" | "system"; content: string; toolCalls?: string }>,
): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  // 先删除旧消息
  await db.execute("DELETE FROM ai_messages WHERE conversation_id = ?", [conversationId]);
  // 重新插入
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const id = `msg-${crypto.randomUUID()}`;
    await db.execute(
      "INSERT INTO ai_messages (id, conversation_id, role, content, tool_calls, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      [id, conversationId, msg.role, msg.content, msg.toolCalls ?? null, now],
    );
  }
  // 更新对话的 updated_at
  await db.execute(
    "UPDATE ai_conversations SET updated_at = ? WHERE id = ?",
    [now, conversationId],
  );
}

/** 批量追加消息到对话 */
export async function appendMessages(
  conversationId: string,
  messages: Array<{ role: "user" | "assistant" | "system"; content: string; toolCalls?: string }>,
): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const id = `msg-${crypto.randomUUID()}`;
    await db.execute(
      "INSERT INTO ai_messages (id, conversation_id, role, content, tool_calls, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      [id, conversationId, msg.role, msg.content, msg.toolCalls ?? null, now],
    );
  }
  // 更新对话的 updated_at
  await db.execute(
    "UPDATE ai_conversations SET updated_at = ? WHERE id = ?",
    [now, conversationId],
  );
}
