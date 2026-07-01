import crypto from "node:crypto";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import type {
  DrawResult,
  PrizeFilters,
  PrizeListItem,
  WinnerFilters,
  WinnerListItem,
} from "@/lib/lottery/types";

const winnerSelect = {
  id: true,
  nickname: true,
  prizeNameSnapshot: true,
  tierSnapshot: true,
  wonAt: true,
} as const;

const prizeSelect = {
  id: true,
  name: true,
  tier: true,
  probabilityWeight: true,
  stockTotal: true,
  stockRemaining: true,
  imageUrl: true,
  description: true,
  isActive: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function listPrizes(filters: PrizeFilters = {}): Promise<PrizeListItem[]> {
  const orderByMap: Record<NonNullable<PrizeFilters["sort"]>, Prisma.LotteryPrizeOrderByWithRelationInput[]> =
    {
      "tier-asc": [{ tier: "asc" }, { id: "asc" }],
      "tier-desc": [{ tier: "desc" }, { id: "desc" }],
      "stock-desc": [{ stockRemaining: "desc" }, { tier: "asc" }, { id: "asc" }],
      "stock-asc": [{ stockRemaining: "asc" }, { tier: "asc" }, { id: "asc" }],
      "updated-desc": [{ updatedAt: "desc" }, { id: "desc" }],
    };

  return prisma.lotteryPrize.findMany({
    where: {
      ...(filters.status === "active" ? { isActive: true } : {}),
      ...(filters.status === "inactive" ? { isActive: false } : {}),
      ...(filters.keyword
        ? {
            name: {
              contains: filters.keyword,
              mode: "insensitive",
            },
          }
        : {}),
    },
    orderBy: orderByMap[filters.sort || "tier-asc"],
    select: prizeSelect,
  });
}

export async function createPrize(input: Omit<PrizeListItem, "createdAt" | "updatedAt">) {
  return prisma.lotteryPrize.create({
    data: input,
    select: prizeSelect,
  });
}

export async function getPrizeById(id: string) {
  return prisma.lotteryPrize.findUnique({
    where: { id },
    select: prizeSelect,
  });
}

export async function updatePrize(
  id: string,
  input: Partial<Omit<PrizeListItem, "id" | "createdAt" | "updatedAt">>,
) {
  return prisma.lotteryPrize.update({
    where: { id },
    data: input,
    select: prizeSelect,
  });
}

export async function listWinners(filters: number | WinnerFilters = 20): Promise<WinnerListItem[]> {
  const normalized =
    typeof filters === "number"
      ? { limit: filters }
      : {
          limit: filters.limit ?? 20,
          keyword: filters.keyword?.trim() || undefined,
          tier: filters.tier,
        };

  return prisma.lotteryWinner.findMany({
    where: {
      ...(normalized.keyword
        ? {
            OR: [
              { nickname: { contains: normalized.keyword, mode: "insensitive" } },
              {
                prizeNameSnapshot: {
                  contains: normalized.keyword,
                  mode: "insensitive",
                },
              },
            ],
          }
        : {}),
      ...(normalized.tier ? { tierSnapshot: normalized.tier } : {}),
    },
    orderBy: [{ wonAt: "desc" }, { id: "desc" }],
    take: normalized.limit,
    select: winnerSelect,
  }).then((winners) =>
    winners.map((winner) => ({
      id: winner.id,
      nickname: winner.nickname,
      prizeName: winner.prizeNameSnapshot,
      tier: winner.tierSnapshot,
      wonAt: winner.wonAt,
    })),
  );
}

export async function getEligiblePrizes(
  tx: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<PrizeListItem[]> {
  return tx.lotteryPrize.findMany({
    where: {
      isActive: true,
      stockRemaining: { gt: 0 },
    },
    orderBy: [{ sortOrder: "asc" }, { tier: "asc" }, { id: "asc" }],
    select: prizeSelect,
  });
}

export function pickPrizeByWeight(prizes: PrizeListItem[]) {
  const totalWeight = prizes.reduce((sum, prize) => sum + prize.probabilityWeight, 0);

  if (prizes.length === 0 || totalWeight <= 0) {
    return null;
  }

  let cursor = Math.random() * totalWeight;

  for (const prize of prizes) {
    cursor -= prize.probabilityWeight;
    if (cursor < 0) {
      return prize;
    }
  }

  return prizes[prizes.length - 1] ?? null;
}

export async function runLottery(nickname: string): Promise<DrawResult> {
  const trimmedNickname = nickname.trim();

  if (!trimmedNickname) {
    throw new Error("INVALID_NICKNAME");
  }

  return prisma.$transaction(async (tx) => {
    const eligiblePrizes = await getEligiblePrizes(tx);

    if (eligiblePrizes.length === 0) {
      return {
        status: "ended",
        message: "活动已结束，奖品已全部抽完。",
      } satisfies DrawResult;
    }

    const chosenPrize = pickPrizeByWeight(eligiblePrizes);

    if (!chosenPrize) {
      return {
        status: "ended",
        message: "当前没有可参与抽奖的奖品。",
      } satisfies DrawResult;
    }

    const updatedPrize = await tx.lotteryPrize.updateMany({
      where: {
        id: chosenPrize.id,
        isActive: true,
        stockRemaining: { gt: 0 },
      },
      data: {
        stockRemaining: {
          decrement: 1,
        },
      },
    });

    if (updatedPrize.count === 0) {
      throw new Error("PRIZE_STOCK_CONFLICT");
    }

    const winner = await tx.lotteryWinner.create({
      data: {
        id: crypto.randomUUID(),
        nickname: trimmedNickname,
        prizeId: chosenPrize.id,
        prizeNameSnapshot: chosenPrize.name,
        tierSnapshot: chosenPrize.tier,
      },
      select: winnerSelect,
    });

    return {
      status: "success",
      winner: {
        id: winner.id,
        nickname: winner.nickname,
        prizeName: winner.prizeNameSnapshot,
        tier: winner.tierSnapshot,
        wonAt: winner.wonAt,
      },
      prize: {
        ...chosenPrize,
        stockRemaining: chosenPrize.stockRemaining - 1,
      },
    } satisfies DrawResult;
  });
}
