import { NextRequest } from "next/server";
import { setSessionCookie } from "@/lib/auth";
import { serverConfig } from "@/lib/config";
import { jsonError, jsonOk } from "@/lib/utils";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    username?: string;
    password?: string;
  };

  if (
    body.username !== serverConfig.adminUsername ||
    body.password !== serverConfig.adminPassword
  ) {
    return jsonError("账号或密码错误", 401);
  }

  await setSessionCookie(serverConfig.adminUsername);

  return jsonOk({
    ok: true,
    username: serverConfig.adminUsername,
  });
}
