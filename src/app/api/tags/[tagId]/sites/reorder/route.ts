import { NextRequest } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { reorderSitesInTag } from "@/lib/db";
import { reorderSchema } from "@/lib/schemas";
import { jsonError, jsonOk } from "@/lib/utils";

type Context = {
  params: Promise<{ tagId: string }>;
};

export async function PUT(request: NextRequest, context: Context) {
  try {
    await requireAdminSession();
    const { tagId } = await context.params;
    const parsed = reorderSchema.safeParse(await request.json());
    if (!parsed.success) {
      return jsonError("排序数据不合法");
    }

    reorderSitesInTag(tagId, parsed.data.ids);
    return jsonOk({ ok: true });
  } catch {
    return jsonError("未授权", 401);
  }
}
