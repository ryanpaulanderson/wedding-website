import type { Metadata } from "next";
import { connection } from "next/server";
import { AdminDashboard } from "./_components/AdminDashboard";
import { AdminLogin } from "./_components/AdminLogin";
import { getAdminDashboardSnapshot } from "@/features/admin/dashboard-data";
import { getAdminAccessConfiguration, hasAdminSession } from "@/lib/admin-access";

export const metadata: Metadata = {
  title: "Admin portal",
  description: "Private wedding website administration.",
  robots: {
    follow: false,
    index: false,
    nocache: true,
  },
};

type AdminPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  await connection();

  const configuration = getAdminAccessConfiguration();

  if (!configuration) {
    return <AdminLogin hasPasswordError={false} isUnavailable />;
  }

  if (!(await hasAdminSession(configuration))) {
    const parameters = await searchParams;

    return (
      <AdminLogin
        hasPasswordError={firstValue(parameters.error) === "invalid"}
        isUnavailable={false}
      />
    );
  }

  const snapshot = await getAdminDashboardSnapshot();

  return <AdminDashboard snapshot={snapshot} />;
}
