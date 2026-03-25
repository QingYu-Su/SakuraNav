import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { getPaginatedSites } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const session = await getSession();
  const scopeParam = request.nextUrl.searchParams.get("scope");
  const scope = scopeParam === "tag" ? "tag" : "all";
  const tagId = request.nextUrl.searchParams.get("tagId");
  const query = request.nextUrl.searchParams.get("q");
  const cursor = request.nextUrl.searchParams.get("cursor");

  if (scope === "tag" && !tagId) {
    return jsonError("缺少标签 ID", 400);
  }

  return jsonOk(
    getPaginatedSites({
      isAuthenticated: Boolean(session?.isAuthenticated),
      scope,
      tagId,
      query,
      cursor,
    }),
  );
}
