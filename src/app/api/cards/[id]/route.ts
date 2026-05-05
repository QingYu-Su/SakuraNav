/**
 * 单张社交卡片公开 API
 * @description 无需认证，根据 ID 获取单张社交卡片
 */

import { getCardById } from "@/lib/services";
import { jsonOk, jsonError } from "@/lib/utils/utils";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const card = await getCardById(id);
  if (!card) return jsonError("卡片不存在", 404);
  return jsonOk({ item: card });
}
