import Link from "next/link";

import { logoutAdminAction } from "@/app/admin/actions";
import { requireAdminSession } from "@/lib/auth/session";

const navItems = [
  { href: "/admin/setup", label: "系统初始化" },
  { href: "/admin/prizes", label: "奖品管理" },
  { href: "/admin/winners", label: "中奖名单" },
];

export default async function AdminProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireAdminSession();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#2b0c43_0%,#120418_40%,#09020d_100%)] text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl gap-8 px-6 py-8">
        <aside className="w-72 shrink-0 rounded-lg border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/80">C9 Lottery Admin</p>
          <h1 className="mt-3 text-2xl font-semibold">后台管理</h1>
          <nav className="mt-8 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-md border border-white/8 px-4 py-3 text-sm text-white/80 transition hover:border-cyan-300/40 hover:bg-cyan-300/8 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <form action={logoutAdminAction} className="mt-8">
            <button
              type="submit"
              className="w-full rounded-md border border-pink-300/30 bg-pink-400/10 px-4 py-3 text-sm font-medium text-pink-100 transition hover:bg-pink-400/18"
            >
              退出登录
            </button>
          </form>
        </aside>

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
