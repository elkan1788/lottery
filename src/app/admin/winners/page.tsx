import { listWinners } from "@/lib/lottery/service";
import { formatDateTimeToAppTimezone } from "@/lib/utils/time";

export const dynamic = "force-dynamic";

export default async function AdminWinnersPage() {
  const winners = await listWinners(50);

  return (
    <main className="min-h-screen bg-[#09020d] px-6 py-12 text-white">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-semibold">中奖名单</h1>
        <p className="mt-3 text-sm leading-6 text-white/70">当前按东八区格式展示最近中奖记录，方便前后台联调。</p>

        <section className="mt-8 overflow-hidden rounded-lg border border-white/10 bg-white/5">
          <div className="grid grid-cols-[140px_1fr_120px_180px] gap-4 border-b border-white/10 px-5 py-4 text-sm text-white/60">
            <span>花名</span>
            <span>奖品名称</span>
            <span>等级</span>
            <span>中奖时间</span>
          </div>
          <div>
            {winners.map((winner) => (
              <article
                key={winner.id}
                className="grid grid-cols-[140px_1fr_120px_180px] gap-4 border-b border-white/8 px-5 py-4 text-sm last:border-b-0"
              >
                <span className="font-medium text-white">{winner.nickname}</span>
                <span>{winner.prizeName}</span>
                <span>{winner.tier} 等奖</span>
                <span>{formatDateTimeToAppTimezone(winner.wonAt)}</span>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
