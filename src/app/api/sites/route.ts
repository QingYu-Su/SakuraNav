import { NextRequest } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { createSite, deleteSite, getAllSitesForAdmin, updateSite } from "@/lib/db";
import { siteInputSchema } from "@/lib/schemas";
import { jsonError, jsonOk } from "@/lib/utils";

const siteUpdateSchema = siteInputSchema.extend({
  id: siteInputSchema.shape.name,
});

export async function GET() {
  try {
    await requireAdminSession();
    return jsonOk({ items: getAllSitesForAdmin() });
  } catch {
    return jsonError("未授权", 401);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminSession();
    const parsed = siteInputSchema.safeParse(await request.json());

    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "站点数据不合法");
    }

    const site = createSite({
      ...parsed.data,
      iconUrl: parsed.data.iconUrl || null,
    });

    return jsonOk({ item: site });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "创建失败", 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdminSession();
    const parsed = siteUpdateSchema.safeParse(await request.json());

    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "站点数据不合法");
    }

    const site = updateSite({
      ...parsed.data,
      id: parsed.data.id,
      iconUrl: parsed.data.iconUrl || null,
    });

    return jsonOk({ item: site });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "更新失败", 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdminSession();
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return jsonError("缺少站点 ID");
    }

    deleteSite(id);
    return jsonOk({ ok: true });
  } catch {
    return jsonError("未授权", 401);
  }
}
