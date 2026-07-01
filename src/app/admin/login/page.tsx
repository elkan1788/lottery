import { redirect } from "next/navigation";

import { AdminLoginForm } from "@/components/admin/login-form";
import { isAdminAuthenticated } from "@/lib/auth/session";

export default async function AdminLoginPage() {
  if (await isAdminAuthenticated()) {
    redirect("/admin/prizes");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#2d0f45_0%,#16041f_38%,#09020d_100%)] px-6 text-white">
      <div className="w-full max-w-md rounded-lg border border-white/10 bg-white/6 p-8 shadow-[0_0_48px_rgba(255,77,184,0.16)] backdrop-blur">
        <p className="text-sm uppercase tracking-[0.24em] text-cyan-200/80">Admin Access</p>
        <h1 className="mt-3 text-3xl font-semibold">登录后台</h1>

        <AdminLoginForm />
      </div>
    </main>
  );
}
