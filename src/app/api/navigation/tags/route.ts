import { getSession } from "@/lib/auth";
import { getVisibleTags } from "@/lib/db";
import { jsonOk } from "@/lib/utils";

export async function GET() {
  const session = await getSession();
  return jsonOk({
    items: getVisibleTags(Boolean(session?.isAuthenticated)),
  });
}
