import { NextRequest } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { createTag, deleteTag, getVisibleTags, updateTag } from "@/lib/db";
import { tagInputSchema } from "@/lib/schemas";
import { jsonError, jsonOk } from "@/lib/utils";

const tagUpdateSchema = tagInputSchema.extend({
  id: tagInputSchema.shape.name,
});

export async function GET() {
  try {
    await requireAdminSession();
    return jsonOk({ items: getVisibleTags(true) });
  } catch {
    return jsonError("未授权", 401);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminSession();
    const parsed = tagInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "标签数据不合法");
    }

    return jsonOk({ item: createTag(parsed.data) });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "创建失败", 500);
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdminSession();
    const parsed = tagUpdateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "标签数据不合法");
    }

    return jsonOk({ item: updateTag(parsed.data) });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "更新失败", 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdminSession();
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return jsonError("缺少标签 ID");
    }

    deleteTag(id);
    return jsonOk({ ok: true });
  } catch {
    return jsonError("未授权", 401);
  }
}
