import { getSession } from "@/lib/auth";
import { jsonOk } from "@/lib/utils";

export async function GET() {
  const session = await getSession();
  return jsonOk({
    isAuthenticated: Boolean(session?.isAuthenticated),
    username: session?.username ?? null,
  });
}
