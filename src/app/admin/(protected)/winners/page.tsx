import Link from "next/link";
import { redirect } from "next/navigation";

import { getLotteryTableStatus, listWinnersPaginated } from "@/lib/lottery/service";
import { formatDateTimeToAppTimezone } from "@/lib/utils/time";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function buildQueryString(params: {
  nickname?: string;
  keyword: string;
  tier?: number;
  limit?: number;
  page?: number;
}) {
  const query = new URLSearchParams();

  if (params.nickname) {
    query.set("nickname", params.nickname);
  }
  if (params.keyword) {
    query.set("keyword", params.keyword);
  }
  if (params.tier) {
    query.set("tier", String(params.tier));
  }
  if (params.limit) {
    query.set("limit", String(params.limit));
  }
  if (params.page) {
    query.set("page", String(params.page));
  }

  return query.toString();
}

export const dynamic = "force-dynamic";

export default async function AdminWinnersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const tableStatus = await getLotteryTableStatus();

  if (!tableStatus.prizesTableExists || !tableStatus.winnersTableExists) {
    redirect("/admin/setup");
  }

  const params = await searchParams;
  const nickname = getSingleParam(params.nickname) || "";
  const keyword = getSingleParam(params.keyword) || "";
  const tierValue = Number(getSingleParam(params.tier) || "");
  const limitValue = Number(getSingleParam(params.limit) || "") || 10;
  const pageValue = Number(getSingleParam(params.page) || "") || 1;
  const normalizedTier = Number.isFinite(tierValue) && tierValue > 0 ? tierValue : undefined;
  const normalizedLimit = [10, 20, 50].includes(limitValue) ? limitValue : 10;

  const winnersResult = await listWinnersPaginated({
    nickname,
    keyword,
    tier: normalizedTier,
    limit: normalizedLimit,
    page: Number.isFinite(pageValue) && pageValue > 0 ? pageValue : 1,
  });
  const { items: winners, page, totalPages, total, pageSize } = winnersResult;
  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <main className="space-y-6 py-2">
      <section className="rounded-lg border border-white/10 bg-white/5 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">中奖名单</h1>
            <p className="mt-3 text-sm leading-6 text-white/70">
              最近中奖记录展示，支持按花名、奖品名称和等级筛选，方便现场核对与后台排查，还支持导出 CSV 做数据统计。
            </p>
          </div>
          <Link
            href={`/api/admin/winners/export?${buildQueryString({
              nickname,
              keyword,
              tier: normalizedTier,
            })}`}
            className="rounded-md border border-emerald-300/30 bg-emerald-300/10 px-4 py-2.5 text-sm font-medium text-emerald-100 transition hover:border-emerald-200/40 hover:bg-emerald-300/15"
          >
            导出 CSV
          </Link>
        </div>

        <form className="mt-6 grid gap-4 md:grid-cols-[1fr_1fr_180px_180px_auto]">
          <input
            name="nickname"
            defaultValue={nickname}
            placeholder="筛选花名"
            className="rounded-md border border-white/12 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/60"
          />
          <input
            name="keyword"
            defaultValue={keyword}
            placeholder="搜索奖品名称"
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
            defaultValue={String([10, 20, 50].includes(limitValue) ? limitValue : 10)}
            className="rounded-md border border-white/12 bg-[#14061b] px-4 py-3 text-sm text-white outline-none"
          >
            <option value="10">最近 10 条</option>
            <option value="20">最近 20 条</option>
            <option value="50">最近 50 条</option>
          </select>
          <button
            type="submit"
            className="rounded-md border border-cyan-300/30 bg-cyan-300/8 px-5 py-3 text-sm font-medium text-cyan-100"
          >
            筛选
          </button>
        </form>
        <p className="mt-4 text-sm text-white/45">共 {total} 条记录，当前每页 {pageSize} 条。</p>
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
        {totalPages > 1 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-5 py-4">
            <div className="text-sm text-white/45">
              第 {page} / {totalPages} 页
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/admin/winners?${buildQueryString({
                  nickname,
                  keyword,
                  tier: normalizedTier,
                  limit: normalizedLimit,
                  page: Math.max(1, page - 1),
                })}`}
                aria-disabled={page <= 1}
                className={`rounded-md border px-3 py-2 text-sm transition ${
                  page <= 1
                    ? "pointer-events-none border-white/10 text-white/25"
                    : "border-white/15 text-white/75 hover:border-cyan-300/40 hover:text-cyan-100"
                }`}
              >
                上一页
              </Link>
              {pageNumbers.map((pageNumber) => (
                <Link
                  key={pageNumber}
                  href={`/admin/winners?${buildQueryString({
                    nickname,
                    keyword,
                    tier: normalizedTier,
                    limit: normalizedLimit,
                    page: pageNumber,
                  })}`}
                  className={`min-w-10 rounded-md border px-3 py-2 text-center text-sm transition ${
                    pageNumber === page
                      ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-100"
                      : "border-white/15 text-white/75 hover:border-cyan-300/40 hover:text-cyan-100"
                  }`}
                >
                  {pageNumber}
                </Link>
              ))}
              <Link
                href={`/admin/winners?${buildQueryString({
                  nickname,
                  keyword,
                  tier: normalizedTier,
                  limit: normalizedLimit,
                  page: Math.min(totalPages, page + 1),
                })}`}
                aria-disabled={page >= totalPages}
                className={`rounded-md border px-3 py-2 text-sm transition ${
                  page >= totalPages
                    ? "pointer-events-none border-white/10 text-white/25"
                    : "border-white/15 text-white/75 hover:border-cyan-300/40 hover:text-cyan-100"
                }`}
              >
                下一页
              </Link>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
