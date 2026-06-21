import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import DashboardSidebar from "@/components/DashboardSidebar";
import DashboardHeader from "@/components/DashboardHeader";
import EmailVerificationBanner from "@/components/EmailVerificationBanner";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const role = (session.user as any).role;
  const name = session.user?.name ?? "User";

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-900">
      <DashboardSidebar userRole={role} userName={name} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <DashboardHeader userRole={role} userName={name} />

        <main id="main-content" className="flex-1 overflow-auto min-w-0">
          <EmailVerificationBanner />
          {children}
        </main>
      </div>
    </div>
  );
}
