/**
 * 会话状态 API
 */

import { getSession } from "@/lib/base/auth";
import { jsonOk } from "@/lib/utils/utils";

export async function GET() {
  const session = await getSession();
  if (!session?.isAuthenticated) {
    return jsonOk({ isAuthenticated: false, username: null, userId: null, role: null });
  }
  return jsonOk({
    isAuthenticated: true,
    username: session.username,
    userId: session.userId,
    role: session.role,
  });
}
