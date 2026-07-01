const quickLinks = [
  {
    title: "前台抽奖页",
    description: "后续承载主视觉、奖品宫格、跑马灯动画与中奖弹窗。",
  },
  {
    title: "后台管理",
    description: "预留奖品维护、中奖名单与登录鉴权相关路由空间。",
  },
  {
    title: "数据库接入",
    description: "已完成 Prisma 与 PostgreSQL 基础接线，下一阶段进入模型设计。",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#34114f_0%,#16051f_35%,#09020d_100%)] px-6 py-16 text-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <section className="space-y-4">
          <span className="inline-flex rounded-full border border-white/15 bg-white/8 px-4 py-1 text-sm text-white/80">
            Stage A / Project Initialization
          </span>
          <div className="space-y-3">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              C9 Lottery
            </h1>
            <p className="max-w-3xl text-base leading-7 text-white/72 sm:text-lg">
              抽奖系统工程骨架已经建立完成，当前页面用于承接后续前台大屏与后台管理模块的开发。
            </p>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {quickLinks.map((item) => (
            <article
              key={item.title}
              className="rounded-lg border border-white/12 bg-white/6 p-5 shadow-[0_0_40px_rgba(255,56,182,0.08)] backdrop-blur"
            >
              <h2 className="text-lg font-medium text-white">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-white/70">{item.description}</p>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
