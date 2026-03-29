import { notFound, redirect } from "next/navigation";
import { LoginScreen } from "@/components/login-screen";
import { getSession } from "@/lib/auth";
import { serverConfig } from "@/lib/server-config";

type Props = {
  params: Promise<{ slug: string[] }>;
};

export default async function HiddenLoginPage({ params }: Props) {
  const { slug } = await params;
  const joinedPath = slug.join("/");

  if (joinedPath !== serverConfig.adminPath) {
    notFound();
  }

  const session = await getSession();

  if (session?.isAuthenticated) {
    redirect("/");
  }

  return <LoginScreen />;
}
