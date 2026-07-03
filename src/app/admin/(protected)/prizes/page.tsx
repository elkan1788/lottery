import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PrizeForm } from "@/components/admin/prize-form";
import { getLotteryTableStatus, listPrizes } from "@/lib/lottery/service";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function PrizeEditor({
  editingId,
  prizes,
}: {
  editingId?: number;
  prizes: Awaited<ReturnType<typeof listPrizes>>;
}) {
  const editingPrize = prizes.find((item) => item.id === editingId) || null;

  return (
    <section className="rounded-lg border border-white/10 bg-white/5 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">{editingPrize ? "编辑奖品" : "新增奖品"}</h2>
          <p className="mt-2 text-sm leading-6 text-white/70">
            支持维护本地上传图片、中奖权重、库存和上下架状态。
          </p>
        </div>
      </div>

      <PrizeForm key={editingPrize?.id ?? "new-prize"} editingPrize={editingPrize} />
    </section>
  );
}

export default async function AdminPrizesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const tableStatus = await getLotteryTableStatus();

  if (!tableStatus.prizesTableExists || !tableStatus.winnersTableExists) {
    redirect("/admin/setup");
  }

  const params = await searchParams;
  const status = getSingleParam(params.status) || "all";
  const sort = getSingleParam(params.sort) || "tier-asc";
  const keyword = getSingleParam(params.keyword) || "";
  const editingPrizeId = Number(getSingleParam(params.edit) || "") || undefined;

  const prizes = await listPrizes({
    status: status === "active" || status === "inactive" ? status : "all",
    sort:
      sort === "tier-desc" ||
      sort === "stock-desc" ||
      sort === "stock-asc" ||
      sort === "updated-desc"
        ? sort
        : "tier-asc",
    keyword,
  });

  return (
    <main className="space-y-6 py-2">
      <section className="rounded-lg border border-white/10 bg-white/5 p-6">
        <h1 className="text-3xl font-semibold">奖品管理</h1>
        <p className="mt-3 text-sm leading-6 text-white/70">
          这里可以完成奖品列表查看、新增、编辑，以及图片上传、权重、库存、上下架状态维护。
        </p>

        <form className="mt-6 grid gap-4 md:grid-cols-[1.2fr_180px_180px_auto]">
          <input
            name="keyword"
            defaultValue={keyword}
            placeholder="搜索奖品名称"
            className="rounded-md border border-white/12 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/60"
          />
          <select
            name="status"
            defaultValue={status}
            className="rounded-md border border-white/12 bg-[#14061b] px-4 py-3 text-sm text-white outline-none"
          >
            <option value="all">全部状态</option>
            <option value="active">仅上架</option>
            <option value="inactive">仅下架</option>
          </select>
          <select
            name="sort"
            defaultValue={sort}
            className="rounded-md border border-white/12 bg-[#14061b] px-4 py-3 text-sm text-white outline-none"
          >
            <option value="tier-asc">按等级升序</option>
            <option value="tier-desc">按等级降序</option>
            <option value="stock-desc">按库存降序</option>
            <option value="stock-asc">按库存升序</option>
            <option value="updated-desc">按更新时间</option>
          </select>
          <button
            type="submit"
            className="rounded-md border border-cyan-300/30 bg-cyan-300/8 px-5 py-3 text-sm font-medium text-cyan-100"
          >
            筛选
          </button>
        </form>
      </section>

      <PrizeEditor editingId={editingPrizeId} prizes={prizes} />

      <section className="overflow-hidden rounded-lg border border-white/10 bg-white/5">
        <div className="grid grid-cols-[1.2fr_90px_100px_90px_90px_110px] gap-4 border-b border-white/10 px-5 py-4 text-sm text-white/60">
          <span>奖品</span>
          <span>等级</span>
          <span>权重</span>
          <span>库存</span>
          <span>状态</span>
          <span>操作</span>
        </div>
        <div>
          {prizes.length === 0 ? (
            <div className="px-5 py-10 text-sm text-white/50">当前没有符合筛选条件的奖品。</div>
          ) : (
            prizes.map((prize) => (
              <article
                key={prize.id}
                className="grid grid-cols-[1.2fr_90px_100px_90px_90px_110px] gap-4 border-b border-white/8 px-5 py-4 text-sm last:border-b-0"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {prize.imageUrl ? (
                    <Image
                      src={prize.imageUrl}
                      alt={prize.name}
                      width={56}
                      height={56}
                      className="h-14 w-14 shrink-0 rounded-md border border-white/10 object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-dashed border-white/12 bg-black/20 text-[10px] text-white/40">
                      无图
                    </div>
                  )}

                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">{prize.name}</p>
                    <p className="mt-1 text-xs text-white/45">
                      {prize.imageUrl ? "已上传图片" : "未配置图片"}
                    </p>
                  </div>
                </div>
                <span>{prize.tier} 等奖</span>
                <span>{prize.probabilityWeight}</span>
                <span>{prize.stock}</span>
                <span className={prize.isActive ? "text-emerald-300" : "text-white/45"}>
                  {prize.isActive ? "上架中" : "已下架"}
                </span>
                <Link
                  href={`/admin/prizes?edit=${prize.id}&status=${status}&sort=${sort}&keyword=${encodeURIComponent(keyword)}`}
                  className="text-cyan-200 transition hover:text-cyan-100"
                >
                  编辑
                </Link>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
