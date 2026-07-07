import { HomeCmsClient } from "@/components/home-cms-client";

export const dynamic = "force-dynamic";
export const runtime = "edge";

export default function HomePage() {
  return (
    <>
      <link rel="stylesheet" href="/legacy-static/styles.css" />
      <HomeCmsClient />
    </>
  );
}
