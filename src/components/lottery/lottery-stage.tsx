"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

import type { PrizeListItem, WinnerListItem } from "@/lib/lottery/types";
import backgroundImage from "../../../design-prd/background.png";

type WinnerWithLabel = WinnerListItem & {
  wonAtLabel: string;
};

type LotteryApiWinner = {
  id: number;
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
const RESULT_HOLD_DURATION_MS = 900;
const DEFAULT_RESULT_MODAL_COUNTDOWN_SECONDS = 5;
const resultCountdownEnv = Number(process.env.NEXT_PUBLIC_RESULT_COUNTDOWN_SECONDS);
const RESULT_MODAL_COUNTDOWN_SECONDS = Number.isFinite(resultCountdownEnv)
  ? Math.max(0, resultCountdownEnv)
  : DEFAULT_RESULT_MODAL_COUNTDOWN_SECONDS;

function getTierText(tier: number) {
  return `${tier} 等奖`;
}

function getTimeLabel(label: string) {
  return label.split(" ")[1] || label;
}

function getPrizeCardTone(tier: number) {
  if (tier === 1) {
    return "from-[#ffbb57]/35 via-[#7f2d08]/20 to-[#110706]";
  }

  if (tier === 2) {
    return "from-[#31dbff]/18 via-[#11386b]/18 to-[#0a0913]";
  }

  return "from-[#ff8e43]/18 via-[#4f170e]/18 to-[#0d0910]";
}

export function LotteryStage({
  initialPrizes,
  initialWinners,
}: {
  initialPrizes: PrizeListItem[];
  initialWinners: WinnerWithLabel[];
}) {
  const leftColumnRef = useRef<HTMLDivElement | null>(null);
  const rightColumnRef = useRef<HTMLElement | null>(null);
  const [nickname, setNickname] = useState("");
  const [prizes, setPrizes] = useState(initialPrizes);
  const [winners, setWinners] = useState(initialWinners);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [resultPrizeId, setResultPrizeId] = useState<number | null>(null);
  const [resultWinner, setResultWinner] = useState<WinnerWithLabel | null>(null);
  const [resultCountdown, setResultCountdown] = useState(RESULT_MODAL_COUNTDOWN_SECONDS);
  const [pendingResultWinner, setPendingResultWinner] = useState<WinnerWithLabel | null>(null);
  const [, setStatusMessage] = useState("输入花名后，点击开始抽奖。");

  const visiblePrizes = useMemo(
    () => prizes.filter((prize) => prize.isActive),
    [prizes],
  );
  const drawablePrizes = useMemo(
    () => prizes.filter((prize) => prize.isActive && prize.stock > 0),
    [prizes],
  );
  const prizeRows = useMemo(
    () => [visiblePrizes.slice(0, 3), visiblePrizes.slice(3, 5)].filter((row) => row.length > 0),
    [visiblePrizes],
  );
  const shouldScrollWinners = winners.length >= 6;

  useEffect(() => {
    if (visiblePrizes.length === 0) {
      return;
    }

    if (!isSubmitting && !resultPrizeId) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % visiblePrizes.length);
    }, HIGHLIGHT_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [visiblePrizes.length, isSubmitting, resultPrizeId]);

  useEffect(() => {
    const leftColumn = leftColumnRef.current;
    const rightColumn = rightColumnRef.current;

    if (!leftColumn || !rightColumn) {
      return;
    }

    const syncRightColumnHeight = () => {
      const { height } = leftColumn.getBoundingClientRect();
      if (height > 0) {
        rightColumn.style.height = `${height}px`;
      }
    };

    syncRightColumnHeight();

    const resizeObserver = new ResizeObserver(() => {
      syncRightColumnHeight();
    });

    resizeObserver.observe(leftColumn);
    window.addEventListener("resize", syncRightColumnHeight);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", syncRightColumnHeight);
      rightColumn.style.height = "";
    };
  }, [winners.length, resultWinner, visiblePrizes.length]);

  useEffect(() => {
    if (!resultWinner) {
      return;
    }

    const timer = window.setInterval(() => {
      setResultCountdown((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          setResultWinner(null);
          setResultPrizeId(null);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resultWinner]);

  useEffect(() => {
    if (!pendingResultWinner || !resultPrizeId) {
      return;
    }

    const timer = window.setTimeout(() => {
      setResultCountdown(RESULT_MODAL_COUNTDOWN_SECONDS);
      setResultWinner(pendingResultWinner);
      setPendingResultWinner(null);
      setIsSubmitting(false);
    }, RESULT_HOLD_DURATION_MS);

    return () => window.clearTimeout(timer);
  }, [pendingResultWinner, resultPrizeId]);

  const resolvedActiveIndex =
    resultPrizeId && !resultWinner
      ? visiblePrizes.findIndex((prize) => prize.id === resultPrizeId)
      : activeIndex;
  const resultPrize = resultPrizeId
    ? visiblePrizes.find((prize) => prize.id === resultPrizeId) ?? null
    : null;

  function closeResultModal() {
    setResultWinner(null);
    setResultPrizeId(null);
    setPendingResultWinner(null);
    setResultCountdown(RESULT_MODAL_COUNTDOWN_SECONDS);
  }

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
    setPendingResultWinner(null);
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
                  stock: payload.prize.stock,
                }
              : prize,
          ),
        );
        setWinners((current) => [nextWinner, ...current].slice(0, 20));
        setResultPrizeId(payload.prize.id);
        setPendingResultWinner(nextWinner);
        setStatusMessage(`恭喜 ${nextWinner.nickname} 抽中 ${nextWinner.prizeName}`);
        setNickname("");
      }, remainingDelay);
    } catch {
      setStatusMessage("网络连接异常，请稍后重试。");
      setIsSubmitting(false);
    }
  }

  return (
    <main
      className="lottery-shell min-h-screen overflow-hidden px-2 py-3 text-white sm:px-4 lg:px-6"
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(2, 4, 12, 0.04), rgba(3, 2, 7, 0.18)), url(${backgroundImage.src})`,
      }}
    >
      <div className="lottery-stage-frame mx-auto flex min-h-[calc(100vh-1.5rem)] w-full max-w-[1600px] flex-col gap-4 px-2 py-3 sm:px-3 sm:py-4 lg:px-5">
        <header className="lottery-title-panel px-2 py-3 text-center sm:px-4 lg:px-10 lg:py-5">
          <p className="lottery-kicker text-[11px] uppercase sm:text-sm">
            海派风华 x 弄堂新潮
          </p>
          <h1 className="lottery-title mt-2 text-[2.2rem] font-black leading-none sm:text-[3.4rem] lg:text-[5.6rem]">
            石库门跑马灯
          </h1>
          <div className="lottery-title-ribbon mx-auto mt-3 inline-flex items-center justify-center px-5 py-2 text-sm font-semibold tracking-[0.28em] text-[#ffd98b] sm:text-base">
            潮酷娱乐抽奖盛典
          </div>
        </header>

        <div className="flex min-h-0 flex-col">
          <section className="grid min-h-0 items-start gap-4 xl:grid-cols-[minmax(0,1.18fr)_320px]">
            <div
              ref={leftColumnRef}
              className="flex min-h-0 flex-col gap-4"
            >
              <section className="lottery-control-panel grid gap-3 p-3 sm:grid-cols-[minmax(0,1.7fr)_minmax(200px,0.9fr)] sm:items-center sm:p-4">
                <label className="block">
                  <span className="sr-only">花名</span>
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
                    placeholder="请输入您的花名"
                    className="lottery-name-input h-16 w-full px-5 text-lg text-white outline-none"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void handleDraw()}
                  disabled={isSubmitting || drawablePrizes.length === 0}
                  className="lottery-draw-button h-16 px-4 text-lg font-black tracking-[0.16em] text-[#eff8ff] disabled:cursor-not-allowed disabled:opacity-55"
                >
                  <span className="block">{isSubmitting ? "抽奖进行中" : drawablePrizes.length === 0 ? "活动已结束" : "开始抽奖"}</span>
                  <span className="mt-1 block text-[10px] font-medium tracking-[0.22em] text-[#80ddff]">
                    START LOTTERY
                  </span>
                </button>
              </section>

              <section className="lottery-prize-wall p-3 sm:p-4">
                <div className="space-y-3">
                  {prizeRows.map((row, rowIndex) => (
                    <div
                      key={`row-${rowIndex}`}
                      className={`mx-auto grid max-w-[1020px] gap-3 ${
                        row.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2"
                      }`}
                    >
                      {row.map((prize) => {
                        const visibleIndex = visiblePrizes.findIndex((item) => item.id === prize.id);
                        const isHighlighted =
                          visibleIndex >= 0 &&
                          visiblePrizes.length > 0 &&
                          (resolvedActiveIndex >= 0 ? resolvedActiveIndex : activeIndex) === visibleIndex &&
                          (isSubmitting || !!resultPrizeId);

                        return (
                          <article
                            key={prize.id}
                            className={`lottery-prize-card relative mx-auto min-h-[218px] w-full max-w-[320px] overflow-hidden rounded-[14px] border border-[#7f4c1b] bg-gradient-to-b ${getPrizeCardTone(prize.tier)} p-3 ${
                              isHighlighted ? "lottery-prize-card-active" : ""
                            }`}
                          >
                            <div className="lottery-prize-number">{getTierText(prize.tier)}</div>
                            <div className="lottery-prize-arch h-full rounded-[12px] px-3 pb-4 pt-10 text-center">
                              <div className="mx-auto flex h-28 w-28 items-center justify-center overflow-hidden rounded-[10px] border border-[#f3c172]/20 bg-black/20 shadow-[inset_0_0_24px_rgba(0,0,0,0.42)]">
                                {prize.imageUrl ? (
                                  <Image
                                    src={prize.imageUrl}
                                    alt={prize.name}
                                    width={112}
                                    height={112}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <span className="text-xs text-white/45">暂无图片</span>
                                )}
                              </div>

                              <h2 className="mt-6 text-[1.6rem] font-semibold leading-tight text-[#fff4d7]">
                                {prize.name}
                              </h2>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </section>

              <footer className="lottery-bottom-plaque mx-auto flex justify-center px-8 py-3 text-center text-sm tracking-[0.28em] text-[#f8d39c]">
                上海记忆 · 未来狂欢
              </footer>
            </div>

            <aside
              ref={rightColumnRef}
              className="relative flex min-h-0 flex-col overflow-hidden"
            >
              <section className="lottery-side-panel flex min-h-0 flex-1 flex-col">
                <div className="lottery-side-heading">
                  <h2 className="text-[2rem] font-black tracking-[0.18em] text-[#fff1c3]">中奖名单</h2>
                  <p className="mt-2 text-sm tracking-[0.22em] text-[#eac17d]">WINNER LIST</p>
                </div>

                <div className="mt-4 flex-1 overflow-hidden px-2 pb-2">
                  <div className="lottery-winner-marquee h-full">
                    {winners.length === 0 ? (
                      <div className="lottery-empty-panel flex h-full items-center justify-center px-3 py-4">
                        <div className="lottery-empty-card w-full max-w-[300px] px-5 py-6 text-center">
                          <div className="lottery-empty-card-inner">
                            <h3 className="text-[2.2rem] font-black leading-none tracking-[0.12em] text-[#f4c65c]">
                              等待第一位幸运儿
                            </h3>
                            <p className="mt-3 text-[1.05rem] font-semibold tracking-[0.08em] text-[#d8a63d]">
                              WAITING FOR THE FIRST LUCKY WINNER
                            </p>

                            <div className="lottery-empty-illustration mt-5" aria-hidden="true">
                              <div className="lottery-empty-lamp lottery-empty-lamp-left" />
                              <div className="lottery-empty-lamp lottery-empty-lamp-right" />
                              <div className="lottery-empty-building">
                                <div className="lottery-empty-door lottery-empty-door-left" />
                                <div className="lottery-empty-door lottery-empty-door-right" />
                              </div>
                            </div>

                            <div className="mt-5 space-y-2 text-base tracking-[0.28em] text-[#d4a03d]">
                              <p>- 灯光已就绪 -</p>
                              <p>- 幸运即将降临 -</p>
                            </div>
                            <div className="lottery-empty-dots" aria-hidden="true">
                              {Array.from({ length: 7 }).map((_, index) => (
                                <span key={index} />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className={shouldScrollWinners ? "lottery-winner-marquee-track" : "grid gap-2.5"}>
                        {(shouldScrollWinners ? [...winners, ...winners] : winners).map((winner, index) => (
                          <article
                            key={`${winner.id}-${index}`}
                            className="lottery-winner-row rounded-[14px] px-3 py-3"
                          >
                            <div className="lottery-winner-avatar">
                              {winner.nickname.slice(0, 1)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-lg font-semibold text-[#fff3cf]">
                                {winner.nickname}
                              </p>
                              <p className="mt-1 truncate text-base text-[#f0bd53]">
                                {winner.prizeName}
                              </p>
                            </div>
                            <time className="shrink-0 text-sm text-[#f2dbbb]">
                              {getTimeLabel(winner.wonAtLabel)}
                            </time>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {resultWinner ? (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#120602]/70 px-4 py-6 backdrop-blur-[6px]">
                  <section className="lottery-result-shell lottery-result-popup pointer-events-auto relative w-full max-w-[560px] p-4">
                    <div className="lottery-result-heading text-center">
                      <p className="text-[2.5rem] font-black leading-none text-[#fff4cf] sm:text-[3.1rem]">
                        恭喜中奖
                      </p>
                      <p className="mt-2 text-base tracking-[0.16em] text-[#ffcf7c]">
                        CONGRATULATIONS
                      </p>
                    </div>

                    <div className="lottery-result-firework lottery-result-firework-top-left" />
                    <div className="lottery-result-firework lottery-result-firework-top-right" />
                    <div className="lottery-result-firework lottery-result-firework-bottom-left" />
                    <div className="lottery-result-firework lottery-result-firework-bottom-right" />
                    <div className="lottery-result-firework lottery-result-firework-side-left" />
                    <div className="lottery-result-firework lottery-result-firework-side-right" />

                    <div className="mt-4">
                      <div className="lottery-result-panel rounded-[28px] px-5 py-6 text-center">
                        <p className="text-5xl font-black tracking-[0.12em] text-[#fff0c4]">
                          {resultWinner.nickname}
                        </p>
                        <p className="mt-4 text-lg tracking-[0.16em] text-[#ffd78a]">
                          恭喜您获得
                        </p>
                        <p className="mt-3 text-[2rem] font-bold leading-tight text-[#ffcc52]">
                          {resultWinner.prizeName}
                        </p>
                        <div className="mx-auto mt-5 flex h-48 w-48 items-center justify-center overflow-hidden rounded-[18px] border border-[#f4ce7d]/30 bg-black/15 shadow-[0_0_28px_rgba(255,186,75,0.2)]">
                          {resultPrize?.imageUrl ? (
                            <Image
                              src={resultPrize.imageUrl}
                              alt={resultWinner.prizeName}
                              width={192}
                              height={192}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-sm text-white/45">暂无图片</span>
                          )}
                        </div>
                        <p className="mt-5 text-base text-[#f8d39d]">{getTierText(resultWinner.tier)}</p>
                        <button
                          type="button"
                          onClick={closeResultModal}
                          className="lottery-result-button mx-auto mt-6 inline-flex min-h-16 min-w-[240px] items-center justify-center px-8 text-2xl font-black tracking-[0.16em] text-[#fff2db]"
                        >
                          开心收下
                        </button>
                        <p className="mt-4 text-sm tracking-[0.14em] text-[#ffe0ae]">
                          {resultCountdown}s 后自动关闭
                        </p>
                      </div>
                    </div>
                  </section>
                </div>
              ) : null}
            </aside>
          </section>
        </div>
      </div>
    </main>
  );
}
