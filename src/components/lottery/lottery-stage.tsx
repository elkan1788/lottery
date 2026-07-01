"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import type { PrizeListItem, WinnerListItem } from "@/lib/lottery/types";

type WinnerWithLabel = WinnerListItem & {
  wonAtLabel: string;
};

type LotteryApiWinner = {
  id: string;
  nickname: string;
  prizeName: string;
  tier: number;
  wonAt: string;
  wonAtLabel: string;
};

type LotteryApiPrize = Omit<PrizeListItem, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};

type DrawSuccessResponse = {
  status: "success";
  prize: LotteryApiPrize;
  winner: LotteryApiWinner;
};

type DrawEndedResponse = {
  status: "ended";
  message: string;
};

type DrawErrorResponse = {
  message: string;
};

const HIGHLIGHT_INTERVAL_MS = 90;
const MIN_ROLL_DURATION_MS = 2200;

function getTierLabel(tier: number) {
  return ` ${tier} 等奖`;
}

function getTimeLabel(label: string) {
  return label.split(" ")[1] || label;
}

function getWinnerBroadcast(winner: WinnerWithLabel) {
  return `${winner.nickname} 同学抽中 ${getTierLabel(winner.tier)}「${winner.prizeName}」`;
}

function getPrizeCardTone(tier: number) {
  if (tier === 1) {
    return "from-[#ffd76a]/28 via-[#ff8c42]/18 to-white/8";
  }

  if (tier === 2) {
    return "from-[#3be7ff]/22 via-[#597bff]/14 to-white/8";
  }

  return "from-[#ff4db8]/22 via-[#a84dff]/14 to-white/8";
}

export function LotteryStage({
  initialPrizes,
  initialWinners,
}: {
  initialPrizes: PrizeListItem[];
  initialWinners: WinnerWithLabel[];
}) {
  const [nickname, setNickname] = useState("");
  const [prizes, setPrizes] = useState(initialPrizes);
  const [winners, setWinners] = useState(initialWinners);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [resultPrizeId, setResultPrizeId] = useState<string | null>(null);
  const [resultWinner, setResultWinner] = useState<WinnerWithLabel | null>(null);
  const [statusMessage, setStatusMessage] = useState("输入花名后，点击开始抽奖。");

  const activePrizes = useMemo(
    () => prizes.filter((prize) => prize.isActive),
    [prizes],
  );
  const drawablePrizes = useMemo(
    () => prizes.filter((prize) => prize.isActive && prize.stockRemaining > 0),
    [prizes],
  );

  useEffect(() => {
    if (activePrizes.length === 0) {
      return;
    }

    if (!isSubmitting && !resultPrizeId) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % activePrizes.length);
    }, HIGHLIGHT_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [activePrizes.length, isSubmitting, resultPrizeId]);

  const resolvedActiveIndex =
    !isSubmitting && resultPrizeId
      ? activePrizes.findIndex((prize) => prize.id === resultPrizeId)
      : activeIndex;
  const resultPrize = resultPrizeId
    ? prizes.find((prize) => prize.id === resultPrizeId) ?? null
    : null;

  async function handleDraw() {
    const trimmedNickname = nickname.trim();

    if (!trimmedNickname || isSubmitting || drawablePrizes.length === 0) {
      if (!trimmedNickname) {
        setStatusMessage("请先输入花名。");
      }
      return;
    }

    setIsSubmitting(true);
    setResultWinner(null);
    setResultPrizeId(null);
    setStatusMessage("抽奖进行中，幸运即将揭晓...");

    const startAt = Date.now();

    try {
      const response = await fetch("/api/lottery", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ nickname: trimmedNickname }),
      });

      const payload = (await response.json().catch(() => null)) as
        | DrawSuccessResponse
        | DrawEndedResponse
        | DrawErrorResponse
        | null;

      const elapsed = Date.now() - startAt;
      const remainingDelay = Math.max(MIN_ROLL_DURATION_MS - elapsed, 0);

      window.setTimeout(() => {
        if (!response.ok) {
          const message =
            payload && "message" in payload
              ? payload.message
              : "抽奖暂时不可用，请稍后再试。";
          setStatusMessage(message);
          setIsSubmitting(false);
          return;
        }

        if (!payload || !("status" in payload)) {
          setStatusMessage("抽奖结果解析失败，请重新尝试。");
          setIsSubmitting(false);
          return;
        }

        if (payload.status === "ended") {
          setStatusMessage(payload.message);
          setIsSubmitting(false);
          return;
        }

        const nextWinner: WinnerWithLabel = {
          ...payload.winner,
          wonAt: new Date(payload.winner.wonAt),
        };

        setPrizes((current) =>
          current.map((prize) =>
            prize.id === payload.prize.id
              ? {
                  ...prize,
                  stockRemaining: payload.prize.stockRemaining,
                }
              : prize,
          ),
        );
        setWinners((current) => [nextWinner, ...current].slice(0, 20));
        setResultPrizeId(payload.prize.id);
        setResultWinner(nextWinner);
        setStatusMessage(`恭喜 ${nextWinner.nickname} 抽中 ${nextWinner.prizeName}`);
        setNickname("");
        setIsSubmitting(false);
      }, remainingDelay);
    } catch {
      setStatusMessage("网络连接异常，请稍后重试。");
      setIsSubmitting(false);
    }
  }

  return (
    <main className="lottery-shell min-h-screen overflow-hidden px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-7xl flex-col gap-6">
        <section className="lottery-hero grid gap-6 rounded-lg border border-white/10 px-5 py-6 shadow-[0_0_80px_rgba(255,77,184,0.16)] lg:grid-cols-[1.2fr_0.8fr] lg:px-8">
          <div className="space-y-5">
            <div className="space-y-3">
              <span className="inline-flex rounded-full border border-[#ffd76a]/35 bg-[#ffd76a]/10 px-4 py-1 text-xs tracking-[0.24em] text-[#ffe9a8] uppercase">
                C9 Lottery Live
              </span>
              <div>
                <h1 className="text-4xl font-black tracking-[0.08em] text-white sm:text-5xl lg:text-6xl">
                  幸运大奖 今晚开箱
                </h1>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-white/12 bg-black/22 p-4 backdrop-blur-sm">
            <div className="grid gap-3">
              <label className="space-y-2">
                <span className="text-sm text-white/76">花名</span>
                <input
                  value={nickname}
                  onChange={(event) => setNickname(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void handleDraw();
                    }
                  }}
                  maxLength={40}
                  placeholder="请输入参与抽奖的花名"
                  className="h-12 w-full rounded-md border border-white/12 bg-white/8 px-4 text-base text-white outline-none transition focus:border-[#3be7ff]/55 focus:bg-white/10"
                />
              </label>

              <button
                type="button"
                onClick={() => void handleDraw()}
                disabled={isSubmitting || drawablePrizes.length === 0}
                className="lottery-draw-button h-12 rounded-md text-base font-semibold text-[#2b071a] disabled:cursor-not-allowed disabled:opacity-55"
              >
                {isSubmitting ? "抽奖进行中..." : drawablePrizes.length === 0 ? "活动已结束" : "开始抽奖"}
              </button>

              <div className="rounded-md border border-white/10 bg-black/18 px-4 py-3 text-sm text-white/74">
                {statusMessage}
              </div>
            </div>
          </div>
        </section>

        <section className="grid flex-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <header className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold tracking-[0.08em] text-white">奖品宫格</h2>
              </div>
            </header>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {prizes.map((prize) => {
                const visibleIndex = activePrizes.findIndex((item) => item.id === prize.id);
                const isHighlighted =
                  visibleIndex >= 0 &&
                  activePrizes.length > 0 &&
                  (resolvedActiveIndex >= 0 ? resolvedActiveIndex : activeIndex) === visibleIndex &&
                  (isSubmitting || resultPrizeId === prize.id);

                return (
                  <article
                    key={prize.id}
                    className={`lottery-prize-card relative overflow-hidden rounded-lg border border-white/10 bg-gradient-to-br ${getPrizeCardTone(prize.tier)} p-4 ${
                      isHighlighted ? "lottery-prize-card-active" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className="inline-flex rounded-full border border-white/14 bg-black/20 px-2.5 py-1 text-[11px] text-white/72">
                          {getTierLabel(prize.tier)}
                        </span>
                        <h3 className="mt-3 line-clamp-2 text-lg font-semibold text-white">
                          {prize.name}
                        </h3>
                      </div>

                      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/12 bg-black/15">
                        {prize.imageUrl ? (
                          <Image
                            src={prize.imageUrl}
                            alt={prize.name}
                            width={64}
                            height={64}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-[11px] text-white/40">暂无图片</span>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <aside className="grid gap-6">
            <section className="rounded-lg border border-[#ffd76a]/18 bg-black/22 p-5 shadow-[0_0_60px_rgba(255,215,106,0.08)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold tracking-[0.08em] text-white">中奖揭晓</h2>
                  <p className="mt-1 text-sm text-white/60">本轮抽奖结果将在这里点亮。</p>
                </div>
                <span className="rounded-full border border-[#ff4db8]/28 bg-[#ff4db8]/10 px-3 py-1 text-xs text-[#ffc7e9]">
                  实时开奖
                </span>
              </div>

              <div className="mt-5">
                {resultWinner ? (
                  <div className="lottery-result-panel rounded-lg border border-[#ffd76a]/28 px-5 py-6 text-center">
                    <p className="text-sm tracking-[0.3em] text-[#ffe08b] uppercase">恭喜中奖</p>
                    <p className="mt-4 text-3xl font-black text-white">
                      {resultWinner.nickname}
                      <span className="ml-3">同学</span>
                    </p>
                    <div className="mx-auto mt-4 flex h-28 w-28 items-center justify-center overflow-hidden rounded-lg border border-white/14 bg-black/18">
                      {resultPrize?.imageUrl ? (
                        <Image
                          src={resultPrize.imageUrl}
                          alt={resultWinner.prizeName}
                          width={112}
                          height={112}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-xs text-white/40">暂无图片</span>
                      )}
                    </div>
                    <p className="mt-3 text-lg text-white/78">{resultWinner.prizeName}</p>
                    <p className="mt-2 text-sm text-white/58">
                      {getTierLabel(resultWinner.tier)} · {resultWinner.wonAtLabel}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-white/12 bg-white/4 px-5 py-10 text-center text-sm text-white/48">
                    本轮尚未开奖，点击“开始抽奖”揭晓幸运得主。
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-lg border border-white/10 bg-black/22 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold tracking-[0.08em] text-white">最近中奖名单</h2>
                  <p className="mt-1 text-sm text-white/60">按时间倒序展示最新开奖记录。</p>
                </div>
                <span className="rounded-full border border-white/14 bg-white/7 px-3 py-1 text-xs text-white/68">
                  Top 20
                </span>
              </div>

              <div className="mt-5 max-h-[540px] overflow-hidden">
                <div className="lottery-winner-marquee">
                  {winners.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-white/12 bg-white/4 px-4 py-8 text-center text-sm text-white/48">
                      暂无中奖记录。
                    </div>
                  ) : (
                    <div className="lottery-winner-marquee-track">
                      {[...winners, ...winners].map((winner, index) => (
                        <article
                          key={`${winner.id}-${index}`}
                          className="lottery-winner-row rounded-lg border border-white/8 bg-white/5 px-4 py-3"
                        >
                          <span className="truncate text-sm text-white">
                            {getWinnerBroadcast(winner)}
                          </span>
                          <time className="shrink-0 text-xs text-white/50">
                            {getTimeLabel(winner.wonAtLabel)}
                          </time>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}
