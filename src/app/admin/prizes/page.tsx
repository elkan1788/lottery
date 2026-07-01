import { listPrizes } from "@/lib/lottery/service";

export const dynamic = "force-dynamic";

export default async function AdminPrizesPage() {
  const prizes = await listPrizes();

  return (
    <main className="min-h-screen bg-[#09020d] px-6 py-12 text-white">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-semibold">奖品管理</h1>
        <p className="mt-3 text-sm leading-6 text-white/70">当前已接入真实奖品数据，可用于后台联调与后续表单开发。</p>

        <section className="mt-8 overflow-hidden rounded-lg border border-white/10 bg-white/5">
          <div className="grid grid-cols-[1fr_100px_120px_120px_120px] gap-4 border-b border-white/10 px-5 py-4 text-sm text-white/60">
            <span>奖品</span>
            <span>等级</span>
            <span>权重</span>
            <span>库存</span>
            <span>状态</span>
          </div>
          <div>
            {prizes.map((prize) => (
              <article
                key={prize.id}
                className="grid grid-cols-[1fr_100px_120px_120px_120px] gap-4 border-b border-white/8 px-5 py-4 text-sm last:border-b-0"
              >
                <div>
                  <p className="font-medium text-white">{prize.name}</p>
                  <p className="mt-1 text-xs text-white/45">{prize.imageUrl || "未配置图片"}</p>
                </div>
                <span>{prize.tier} 等奖</span>
                <span>{prize.probabilityWeight}</span>
                <span>{prize.stock}</span>
                <span className={prize.isActive ? "text-emerald-300" : "text-white/45"}>
                  {prize.isActive ? "上架中" : "已下架"}
                </span>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
