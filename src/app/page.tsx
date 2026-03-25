import { SakuraNavApp } from "@/components/sakura-nav-app";
import { getSession } from "@/lib/auth";
import { getAppearances, getVisibleTags } from "@/lib/db";

export default async function HomePage() {
  const session = await getSession();
  const isAuthenticated = Boolean(session?.isAuthenticated);

  return (
    <SakuraNavApp
      initialSession={session}
      initialTags={getVisibleTags(isAuthenticated)}
      initialAppearances={getAppearances()}
    />
  );
}
