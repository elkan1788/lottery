import { SetupTabs } from "@/components/admin/setup-tabs";
import {
  getLotteryTableStatus,
  getWinnerTierStats,
  listPrizes,
} from "@/lib/lottery/service";

export const dynamic = "force-dynamic";

export default async function AdminSetupPage() {
  const [tableStatus, prizes, winnerStats] = await Promise.all([
    getLotteryTableStatus(),
    listPrizes({
      sort: "tier-asc",
      status: "all",
    }),
    getWinnerTierStats(),
  ]);

  const winnerTotal = winnerStats.reduce((sum, item) => sum + item.count, 0);

  return (
    <main className="space-y-6 py-2">
      <section className="rounded-lg border border-white/10 bg-white/5 p-6">
        <h1 className="text-3xl font-semibold">系统初始化</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/70">
          这里集中处理 lottery 表创建与校验、奖品库存初始化，以及中奖名单统计与清空操作。
        </p>
      </section>

      <SetupTabs
        tableStatus={tableStatus}
        prizes={prizes}
        winnerStats={winnerStats}
        winnerTotal={winnerTotal}
      />
    </main>
  );
}
