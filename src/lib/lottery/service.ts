import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import type { DrawResult, PrizeListItem, WinnerListItem } from "@/lib/lottery/types";

const winnerSelect = {
  id: true,
  nickname: true,
  prizeName: true,
  tier: true,
  wonAt: true,
} as const;

const prizeSelect = {
  id: true,
  name: true,
  tier: true,
  probabilityWeight: true,
  stock: true,
  imageUrl: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function listPrizes(): Promise<PrizeListItem[]> {
  return prisma.lotteryPrize.findMany({
    orderBy: [{ tier: "asc" }, { id: "asc" }],
    select: prizeSelect,
  });
}

export async function createPrize(input: Omit<PrizeListItem, "id" | "createdAt" | "updatedAt">) {
  return prisma.lotteryPrize.create({
    data: input,
    select: prizeSelect,
  });
}

export async function updatePrize(
  id: number,
  input: Partial<Omit<PrizeListItem, "id" | "createdAt" | "updatedAt">>,
) {
  return prisma.lotteryPrize.update({
    where: { id },
    data: input,
    select: prizeSelect,
  });
}

export async function listWinners(limit = 20): Promise<WinnerListItem[]> {
  return prisma.lotteryWinner.findMany({
    orderBy: [{ wonAt: "desc" }, { id: "desc" }],
    take: limit,
    select: winnerSelect,
  });
}

export async function getEligiblePrizes(
  tx: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<PrizeListItem[]> {
  return tx.lotteryPrize.findMany({
    where: {
      isActive: true,
      stock: { gt: 0 },
    },
    orderBy: [{ tier: "asc" }, { id: "asc" }],
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
        stock: { gt: 0 },
      },
      data: {
        stock: {
          decrement: 1,
        },
      },
    });

    if (updatedPrize.count === 0) {
      throw new Error("PRIZE_STOCK_CONFLICT");
    }

    const winner = await tx.lotteryWinner.create({
      data: {
        nickname: trimmedNickname,
        prizeName: chosenPrize.name,
        tier: chosenPrize.tier,
      },
      select: winnerSelect,
    });

    return {
      status: "success",
      winner,
      prize: {
        ...chosenPrize,
        stock: chosenPrize.stock - 1,
      },
    } satisfies DrawResult;
  });
}
