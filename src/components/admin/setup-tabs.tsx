"use client";

import Image from "next/image";
import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  clearWinnersAction,
  createLotteryTablesAction,
  initializePrizeStocksAction,
} from "@/app/admin/actions";
import type { LotteryTableStatus, PrizeListItem, WinnerTierStat } from "@/lib/lottery/types";

type ActionFeedback =
  | {
      status: "idle" | "success" | "error";
      message?: string;
    }
  | undefined;

const initialFeedback: ActionFeedback = {
  status: "idle",
};

type SetupTabsProps = {
  tableStatus: LotteryTableStatus;
  prizes: PrizeListItem[];
  winnerStats: WinnerTierStat[];
  winnerTotal: number;
};

type TabKey = "tables" | "stocks" | "winners";

export function SetupTabs({
  tableStatus,
  prizes,
  winnerStats,
  winnerTotal,
}: SetupTabsProps) {
  const [tab, setTab] = useState<TabKey>("tables");
  const [isWinnerConfirmOpen, setIsWinnerConfirmOpen] = useState(false);
  const [stockState, stockAction] = useActionState(initializePrizeStocksAction, initialFeedback);
  const [winnerState, winnerAction] = useActionState(clearWinnersAction, initialFeedback);

  useEffect(() => {
    if (winnerState?.status === "success") {
      setIsWinnerConfirmOpen(false);
    }
  }, [winnerState]);

  const tierRows = useMemo(() => {
    const grouped = new Map<number, PrizeListItem[]>();

    for (const prize of prizes) {
      const rows = grouped.get(prize.tier) || [];
      rows.push(prize);
      grouped.set(prize.tier, rows);
    }

    return Array.from(grouped.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([tier, items]) => ({
        tier,
        items,
      }));
  }, [prizes]);

  const maxWinnerCount = winnerStats.reduce((max, item) => Math.max(max, item.count), 0);

  return (
    <div className="space-y-6">
      <div className="inline-flex rounded-lg border border-white/10 bg-white/5 p-1">
        {[
          { key: "tables", label: "表创建与验证" },
          { key: "stocks", label: "奖品库存初始化" },
          { key: "winners", label: "清空中奖名单" },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key as TabKey)}
            className={`rounded-md px-4 py-2 text-sm transition ${
              tab === item.key
                ? "bg-cyan-300/15 text-cyan-100"
                : "text-white/65 hover:text-white"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "tables" ? (
        <section className="rounded-lg border border-white/10 bg-white/5 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Lottery 表初始化</h2>
              <p className="mt-2 text-sm leading-6 text-white/70">
                支持一键创建 `lottery_prizes` 和 `lottery_winner` 两张表，并即时校验当前存在状态。
              </p>
            </div>
            <form action={createLotteryTablesAction}>
              <SubmitButton
                idleText="一键创建"
                pendingText="创建中..."
                tone="cyan"
              />
            </form>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <StatusCard
              title="lottery_prizes"
              ready={tableStatus.prizesTableExists}
              description={tableStatus.prizesTableExists ? "奖品表已可用" : "奖品表尚未创建"}
            />
            <StatusCard
              title="lottery_winner"
              ready={tableStatus.winnersTableExists}
              description={tableStatus.winnersTableExists ? "中奖表已可用" : "中奖表尚未创建"}
            />
          </div>
        </section>
      ) : null}

      {tab === "stocks" ? (
        <section className="rounded-lg border border-white/10 bg-white/5 p-6">
          <div>
            <h2 className="text-xl font-semibold">奖品数量初始化</h2>
            <p className="mt-2 text-sm leading-6 text-white/70">
              按奖品等级统一填写库存数量并提交，系统会把同等级下的奖品库存一次性更新。
            </p>
          </div>

          {tierRows.length === 0 ? (
            <div className="mt-6 rounded-lg border border-dashed border-white/12 bg-black/15 px-5 py-10 text-center text-sm text-white/55">
              当前还没有奖品，请先到奖品管理页面添加奖品，再回来做库存初始化。
            </div>
          ) : (
            <form action={stockAction} className="mt-6 space-y-4">
              <div className="space-y-3">
                {tierRows.map((row) => (
                  <div
                    key={row.tier}
                    className="grid items-center gap-3 rounded-lg border border-white/10 bg-black/15 px-4 py-4 md:grid-cols-[120px_minmax(0,1fr)_220px]"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">{row.tier} 等奖</p>
                    </div>
                    <div className="grid gap-3">
                      {row.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-3">
                          {item.imageUrl ? (
                            <Image
                              src={item.imageUrl}
                              alt={item.name}
                              width={40}
                              height={40}
                              className="h-10 w-10 shrink-0 rounded-md border border-white/10 object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-dashed border-white/12 bg-black/20 text-[10px] text-white/35">
                              无图
                            </div>
                          )}
                          <span className="min-w-0 truncate text-sm text-white/65">{item.name}</span>
                        </div>
                      ))}
                    </div>
                    <div>
                      <StockInput tier={row.tier} defaultValue={row.items[0]?.stock ?? 0} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <FeedbackText state={stockState} />
                <SubmitButton idleText="提交更新" pendingText="提交中..." tone="emerald" />
              </div>
            </form>
          )}
        </section>
      ) : null}

      {tab === "winners" ? (
        <section className="rounded-lg border border-white/10 bg-white/5 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">中奖名单清空</h2>
              <p className="mt-2 text-sm leading-6 text-white/70">
                当前中奖总人数 {winnerTotal} 人。清空前会弹出确认窗口，避免误操作。
              </p>
            </div>
          </div>

          {winnerStats.length === 0 ? (
            <div className="mt-6 rounded-lg border border-dashed border-white/12 bg-black/15 px-5 py-10 text-center text-sm text-white/55">
              当前没有中奖名单记录。
            </div>
          ) : (
            <div className="mt-6 grid gap-3">
              {winnerStats.map((item) => {
                const width = maxWinnerCount > 0 ? `${(item.count / maxWinnerCount) * 100}%` : "0%";

                return (
                  <div
                    key={item.tier}
                    className="grid items-center gap-3 rounded-lg border border-white/10 bg-black/15 px-4 py-4 md:grid-cols-[100px_minmax(0,1fr)_80px]"
                  >
                    <span className="text-sm font-medium text-white">{item.tier} 等奖</span>
                    <div className="h-3 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-300/80 to-emerald-300/80"
                        style={{ width }}
                      />
                    </div>
                    <span className="text-right text-sm text-white/70">{item.count} 人</span>
                  </div>
                );
              })}
            </div>
          )}

          <form action={winnerAction} className="mt-6 space-y-4">
            <input type="hidden" name="confirm" value="CLEAR_WINNERS" />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <FeedbackText state={winnerState} />
              <button
                type="button"
                disabled={winnerStats.length === 0}
                onClick={() => setIsWinnerConfirmOpen(true)}
                className="rounded-md border border-pink-300/30 bg-pink-400/10 px-4 py-2.5 text-sm font-medium text-pink-100 transition hover:bg-pink-400/15 disabled:cursor-not-allowed disabled:opacity-60"
              >
                确认清空中奖名单
              </button>
            </div>

            {isWinnerConfirmOpen ? (
              <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                <button
                  type="button"
                  aria-label="关闭确认弹窗"
                  className="absolute inset-0 bg-[#06010a]/78 backdrop-blur-sm"
                  onClick={() => setIsWinnerConfirmOpen(false)}
                />
                <div className="relative z-10 w-full max-w-md rounded-lg border border-pink-300/20 bg-[linear-gradient(180deg,rgba(35,9,39,0.98)_0%,rgba(17,4,22,0.98)_100%)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
                  <div className="inline-flex rounded-full border border-pink-300/20 bg-pink-400/10 px-3 py-1 text-xs tracking-[0.18em] text-pink-100">
                    危险操作
                  </div>
                  <h3 className="mt-4 text-xl font-semibold text-white">确认清空中奖名单？</h3>
                  <p className="mt-3 text-sm leading-6 text-white/70">
                    当前共有 {winnerTotal} 条中奖记录，清空后将无法恢复。请确认这次操作是你想要的。
                  </p>

                  <div className="mt-6 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsWinnerConfirmOpen(false)}
                      className="rounded-md border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
                    >
                      取消
                    </button>
                    <SubmitButton
                      idleText="确认清空"
                      pendingText="清空中..."
                      tone="pink"
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </form>
        </section>
      ) : null}
    </div>
  );
}

function StockInput({ tier, defaultValue }: { tier: number; defaultValue: number }) {
  const [value, setValue] = useState(String(defaultValue));

  return (
    <div className="flex items-center gap-3">
      <label className="shrink-0 text-sm text-white/65">库存数量</label>
      <input
        value={value}
        onChange={(event) => {
          const nextValue = event.target.value.replace(/[^\d]/g, "");
          setValue(nextValue);
        }}
        type="text"
        inputMode="numeric"
        className="w-full rounded-md border border-white/12 bg-black/20 px-4 py-2.5 text-sm text-white outline-none transition focus:border-cyan-300/60"
      />
      <input
        type="hidden"
        name="tiers"
        value={JSON.stringify({ tier, stock: Number(value || "0") })}
      />
    </div>
  );
}

function SubmitButton({
  idleText,
  pendingText,
  tone,
  disabled = false,
}: {
  idleText: string;
  pendingText: string;
  tone: "cyan" | "emerald" | "pink";
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();

  const classNameMap = {
    cyan: "border-cyan-300/30 bg-cyan-300/10 text-cyan-100 hover:bg-cyan-300/15",
    emerald:
      "border-emerald-300/30 bg-emerald-300/10 text-emerald-100 hover:bg-emerald-300/15",
    pink: "border-pink-300/30 bg-pink-400/10 text-pink-100 hover:bg-pink-400/15",
  } as const;

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={`rounded-md border px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${classNameMap[tone]}`}
    >
      {pending ? pendingText : idleText}
    </button>
  );
}

function StatusCard({
  title,
  ready,
  description,
}: {
  title: string;
  ready: boolean;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/15 p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-sm text-white/85">{title}</p>
        <span
          className={`rounded-full px-3 py-1 text-xs ${
            ready
              ? "bg-emerald-300/15 text-emerald-100"
              : "bg-amber-300/15 text-amber-100"
          }`}
        >
          {ready ? "已就绪" : "待创建"}
        </span>
      </div>
      <p className="mt-3 text-sm text-white/60">{description}</p>
    </div>
  );
}

function FeedbackText({ state }: { state: ActionFeedback }) {
  if (!state?.message) {
    return <div className="text-sm text-white/40">提交后会在这里显示处理结果。</div>;
  }

  return (
    <div
      className={`text-sm ${
        state.status === "success" ? "text-emerald-200" : state.status === "error" ? "text-pink-200" : "text-white/55"
      }`}
    >
      {state.message}
    </div>
  );
}
