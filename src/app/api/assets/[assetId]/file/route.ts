import fs from "node:fs/promises";
import { NextRequest } from "next/server";
import { getAsset } from "@/lib/db";

type Context = {
  params: Promise<{ assetId: string }>;
};

export const runtime = "nodejs";

export async function GET(_request: NextRequest, context: Context) {
  const { assetId } = await context.params;
  const asset = getAsset(assetId);

  if (!asset) {
    return new Response("Not found", { status: 404 });
  }

  const file = await fs.readFile(asset.file_path);

  return new Response(file, {
    headers: {
      "Content-Type": asset.mime_type,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
