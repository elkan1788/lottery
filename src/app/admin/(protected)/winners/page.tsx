import { listWinners } from "@/lib/lottery/service";
import { formatDateTimeToAppTimezone } from "@/lib/utils/time";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export const dynamic = "force-dynamic";

export default async function AdminWinnersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const keyword = getSingleParam(params.keyword) || "";
  const tierValue = Number(getSingleParam(params.tier) || "");
  const limitValue = Number(getSingleParam(params.limit) || "") || 50;

  const winners = await listWinners({
    keyword,
    tier: Number.isFinite(tierValue) && tierValue > 0 ? tierValue : undefined,
    limit: [20, 50, 100].includes(limitValue) ? limitValue : 50,
  });

  return (
    <main className="space-y-6 py-2">
      <section className="rounded-lg border border-white/10 bg-white/5 p-6">
        <h1 className="text-3xl font-semibold">中奖名单</h1>
        <p className="mt-3 text-sm leading-6 text-white/70">
          最近中奖记录按东八区展示，支持按花名、奖品名称和等级筛选，方便现场核对与后台排查。
        </p>

        <form className="mt-6 grid gap-4 md:grid-cols-[1.2fr_180px_180px_auto]">
          <input
            name="keyword"
            defaultValue={keyword}
            placeholder="搜索花名或奖品名称"
            className="rounded-md border border-white/12 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/60"
          />
          <input
            name="tier"
            type="number"
            min="1"
            defaultValue={Number.isFinite(tierValue) && tierValue > 0 ? tierValue : ""}
            placeholder="筛选等级"
            className="rounded-md border border-white/12 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/60"
          />
          <select
            name="limit"
            defaultValue={String([20, 50, 100].includes(limitValue) ? limitValue : 50)}
            className="rounded-md border border-white/12 bg-[#14061b] px-4 py-3 text-sm text-white outline-none"
          >
            <option value="20">最近 20 条</option>
            <option value="50">最近 50 条</option>
            <option value="100">最近 100 条</option>
          </select>
          <button
            type="submit"
            className="rounded-md border border-cyan-300/30 bg-cyan-300/8 px-5 py-3 text-sm font-medium text-cyan-100"
          >
            筛选
          </button>
        </form>
      </section>

      <section className="overflow-hidden rounded-lg border border-white/10 bg-white/5">
        <div className="grid grid-cols-[140px_1fr_100px_180px] gap-4 border-b border-white/10 px-5 py-4 text-sm text-white/60">
          <span>花名</span>
          <span>奖品名称</span>
          <span>等级</span>
          <span>中奖时间</span>
        </div>
        <div>
          {winners.length === 0 ? (
            <div className="px-5 py-10 text-sm text-white/50">当前没有符合筛选条件的中奖记录。</div>
          ) : (
            winners.map((winner) => (
              <article
                key={winner.id}
                className="grid grid-cols-[140px_1fr_100px_180px] gap-4 border-b border-white/8 px-5 py-4 text-sm last:border-b-0"
              >
                <span className="truncate font-medium text-white">{winner.nickname}</span>
                <span className="truncate">{winner.prizeName}</span>
                <span>{winner.tier} 等奖</span>
                <span>{formatDateTimeToAppTimezone(winner.wonAt)}</span>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
