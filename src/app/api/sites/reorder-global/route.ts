import { NextRequest } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { reorderSitesGlobal } from "@/lib/db";
import { reorderSchema } from "@/lib/schemas";
import { jsonError, jsonOk } from "@/lib/utils";

export async function PUT(request: NextRequest) {
  try {
    await requireAdminSession();
    const parsed = reorderSchema.safeParse(await request.json());
    if (!parsed.success) {
      return jsonError("排序数据不合法");
    }

    reorderSitesGlobal(parsed.data.ids);
    return jsonOk({ ok: true });
  } catch {
    return jsonError("未授权", 401);
  }
}
