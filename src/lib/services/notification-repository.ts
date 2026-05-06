/**
 * 通知配置仓库
 * @description 管理用户的通知配置（CRUD），每个用户独立
 */

import { getDb } from "@/lib/database/connection";
import type { NotificationChannel, NotificationChannelType, WebhookMethod, WebhookContentType } from "@/lib/base/types";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("NotificationRepo");

/** 数据库行类型 */
type NotificationChannelRow = {
  id: string;
  owner_id: string;
  name: string;
  type: string;
  url: string;
  method: string;
  content_type: string;
  title_param: string;
  content_param: string;
  enabled: number;
  created_at: string;
  updated_at: string;
};

/** 将数据库行映射为领域对象 */
function mapRow(row: NotificationChannelRow): NotificationChannel {
  return {
    id: row.id,
    owner_id: row.owner_id,
    name: row.name,
    type: row.type as NotificationChannelType,
    url: row.url,
    method: row.method as WebhookMethod,
    contentType: row.content_type as WebhookContentType,
    titleParam: row.title_param,
    contentParam: row.content_param,
    enabled: row.enabled === 1,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/** 获取指定用户的所有通知配置 */
export async function getNotificationChannels(ownerId: string): Promise<NotificationChannel[]> {
  const db = await getDb();
  const rows = await db.query<NotificationChannelRow>(
    "SELECT * FROM notification_channels WHERE owner_id = @ownerId ORDER BY created_at ASC",
    { ownerId },
  );
  return rows.map(mapRow);
}

/** 根据 ID 获取单个通知配置 */
export async function getNotificationChannelById(id: string, ownerId: string): Promise<NotificationChannel | null> {
  const db = await getDb();
  const row = await db.queryOne<NotificationChannelRow>(
    "SELECT * FROM notification_channels WHERE id = @id AND owner_id = @ownerId",
    { id, ownerId },
  );
  return row ? mapRow(row) : null;
}

/** 创建通知配置 */
export async function createNotificationChannel(data: {
  id: string;
  ownerId: string;
  name: string;
  type: NotificationChannelType;
  url: string;
  method: WebhookMethod;
  contentType: WebhookContentType;
  titleParam: string;
  contentParam: string;
}): Promise<NotificationChannel> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.execute(
    `INSERT INTO notification_channels (id, owner_id, name, type, url, method, content_type, title_param, content_param, enabled, created_at, updated_at)
     VALUES (@id, @ownerId, @name, @type, @url, @method, @contentType, @titleParam, @contentParam, 1, @now, @now)`,
    { ...data, now },
  );
  return {
    id: data.id,
    owner_id: data.ownerId,
    name: data.name,
    type: data.type,
    url: data.url,
    method: data.method,
    contentType: data.contentType,
    titleParam: data.titleParam,
    contentParam: data.contentParam,
    enabled: true,
    created_at: now,
    updated_at: now,
  };
}

/** 更新通知配置 */
export async function updateNotificationChannel(
  id: string,
  ownerId: string,
  data: {
    name?: string;
    url?: string;
    method?: WebhookMethod;
    contentType?: WebhookContentType;
    titleParam?: string;
    contentParam?: string;
    enabled?: boolean;
  },
): Promise<NotificationChannel | null> {
  const existing = await getNotificationChannelById(id, ownerId);
  if (!existing) return null;

  const merged = {
    name: data.name ?? existing.name,
    url: data.url ?? existing.url,
    method: data.method ?? existing.method,
    contentType: data.contentType ?? existing.contentType,
    titleParam: data.titleParam ?? existing.titleParam,
    contentParam: data.contentParam ?? existing.contentParam,
    enabled: data.enabled ?? existing.enabled,
  };

  const db = await getDb();
  const now = new Date().toISOString();
  await db.execute(
    `UPDATE notification_channels SET name = @name, url = @url, method = @method, content_type = @contentType, title_param = @titleParam, content_param = @contentParam, enabled = @enabled, updated_at = @now WHERE id = @id AND owner_id = @ownerId`,
    { ...merged, enabled: merged.enabled ? 1 : 0, now, id, ownerId },
  );

  return { ...existing, ...merged, updated_at: now };
}

/** 切换通知配置启用/禁用状态 */
export async function toggleNotificationChannel(id: string, ownerId: string): Promise<NotificationChannel | null> {
  const existing = await getNotificationChannelById(id, ownerId);
  if (!existing) return null;
  return updateNotificationChannel(id, ownerId, { enabled: !existing.enabled });
}

/** 删除通知配置 */
export async function deleteNotificationChannel(id: string, ownerId: string): Promise<boolean> {
  const db = await getDb();
  const result = await db.execute(
    "DELETE FROM notification_channels WHERE id = @id AND owner_id = @ownerId",
    { id, ownerId },
  );
  return result.changes > 0;
}

/** 删除指定用户的所有通知配置（用户数据清理时调用） */
export async function deleteNotificationChannelsByOwner(ownerId: string): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM notification_channels WHERE owner_id = @ownerId", { ownerId });
}

/**
 * 向指定用户的所有已启用通知配置发送通知
 * @param ownerId 用户 ID
 * @param title 通知标题
 * @param content 通知内容
 * @returns 发送成功的通知配置数量
 */
export async function sendNotificationToUser(ownerId: string, title: string, content: string): Promise<number> {
  const channels = await getNotificationChannels(ownerId);
  const enabledChannels = channels.filter((ch) => ch.enabled);
  if (enabledChannels.length === 0) return 0;

  let successCount = 0;
  for (const channel of enabledChannels) {
    try {
      let body: string | URLSearchParams;
      const headers: Record<string, string> = {};

      if (channel.contentType === "application/json") {
        body = JSON.stringify({
          [channel.titleParam]: title,
          [channel.contentParam]: content,
        });
        headers["Content-Type"] = "application/json";
      } else {
        body = new URLSearchParams({
          [channel.titleParam]: title,
          [channel.contentParam]: content,
        }).toString();
        headers["Content-Type"] = "application/x-www-form-urlencoded";
      }

      const fetchOptions: RequestInit = {
        method: channel.method,
        headers,
        signal: AbortSignal.timeout(10000),
      };
      if (channel.method !== "GET") {
        fetchOptions.body = body;
      }

      const response = await fetch(channel.url, fetchOptions);
      if (response.ok) {
        successCount++;
      } else {
        const text = await response.text().catch(() => "");
        logger.warning("离线通知发送失败", { channelId: channel.id, status: response.status, body: text.slice(0, 200) });
      }
    } catch (error) {
      logger.warning("离线通知发送异常", { channelId: channel.id, error: error instanceof Error ? error.message : String(error) });
    }
  }
  return successCount;
}
