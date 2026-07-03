import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import type {
  DrawResult,
  LotteryTableStatus,
  PrizeFilters,
  PrizeListItem,
  WinnerTierStat,
  WinnerFilters,
  WinnerListResult,
  WinnerListItem,
} from "@/lib/lottery/types";

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

const LOTTERY_TABLE_NAMES = ["lottery_prizes", "lottery_winner"] as const;
type LotteryTableName = (typeof LOTTERY_TABLE_NAMES)[number];

async function getExistingLotteryTableNames(): Promise<Set<string>> {
  const rows = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = ANY (current_schemas(false))
      AND table_name IN (${Prisma.join(LOTTERY_TABLE_NAMES)})
  `;

  return new Set(rows.map((row) => row.table_name));
}

async function hasRequiredLotteryTables(requiredTables: LotteryTableName[]) {
  const tableNames = await getExistingLotteryTableNames();

  return requiredTables.every((tableName) => tableNames.has(tableName));
}

export async function listPrizes(filters: PrizeFilters = {}): Promise<PrizeListItem[]> {
  if (!(await hasRequiredLotteryTables(["lottery_prizes"]))) {
    return [];
  }

  const orderByMap: Record<NonNullable<PrizeFilters["sort"]>, Prisma.LotteryPrizeOrderByWithRelationInput[]> =
    {
      "tier-asc": [{ tier: "asc" }, { id: "asc" }],
      "tier-desc": [{ tier: "desc" }, { id: "desc" }],
      "stock-desc": [{ stock: "desc" }, { tier: "asc" }, { id: "asc" }],
      "stock-asc": [{ stock: "asc" }, { tier: "asc" }, { id: "asc" }],
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

export async function createPrize(input: Omit<PrizeListItem, "id" | "createdAt" | "updatedAt">) {
  return prisma.lotteryPrize.create({
    data: input,
    select: prizeSelect,
  });
}

export async function getPrizeById(id: number) {
  return prisma.lotteryPrize.findUnique({
    where: { id },
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

export async function listWinners(filters: number | WinnerFilters = 20): Promise<WinnerListItem[]> {
  if (!(await hasRequiredLotteryTables(["lottery_winner"]))) {
    return [];
  }

  const normalized =
    typeof filters === "number"
      ? { limit: filters }
      : {
          limit: filters.limit ?? 20,
          nickname: filters.nickname?.trim() || undefined,
          keyword: filters.keyword?.trim() || undefined,
          tier: filters.tier,
        };

  return prisma.lotteryWinner.findMany({
    where: {
      ...(normalized.nickname
        ? {
            nickname: {
              contains: normalized.nickname,
              mode: "insensitive",
            },
          }
        : {}),
      ...(normalized.keyword
        ? {
            prizeName: {
              contains: normalized.keyword,
              mode: "insensitive",
            },
          }
        : {}),
      ...(normalized.tier ? { tier: normalized.tier } : {}),
    },
    orderBy: [{ wonAt: "desc" }, { id: "desc" }],
    take: normalized.limit,
    select: winnerSelect,
  }).then((winners) =>
    winners.map((winner) => ({
      id: winner.id,
      nickname: winner.nickname,
      prizeName: winner.prizeName,
      tier: winner.tier,
      wonAt: winner.wonAt,
    })),
  );
}

export async function listWinnersPaginated(
  filters: WinnerFilters = {},
): Promise<WinnerListResult> {
  if (!(await hasRequiredLotteryTables(["lottery_winner"]))) {
    return {
      items: [],
      total: 0,
      page: 1,
      pageSize: filters.limit ?? 20,
      totalPages: 1,
    };
  }

  const pageSize = filters.limit ?? 20;
  const page = filters.page && filters.page > 0 ? Math.floor(filters.page) : 1;
  const nickname = filters.nickname?.trim() || undefined;
  const keyword = filters.keyword?.trim() || undefined;
  const tier = filters.tier;

  const where: Prisma.LotteryWinnerWhereInput = {
    ...(nickname
      ? {
          nickname: {
            contains: nickname,
            mode: "insensitive",
          },
        }
      : {}),
    ...(keyword
      ? {
          prizeName: {
            contains: keyword,
            mode: "insensitive",
          },
        }
      : {}),
    ...(tier ? { tier } : {}),
  };

  const total = await prisma.lotteryWinner.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const skip = (currentPage - 1) * pageSize;

  const items = await prisma.lotteryWinner
    .findMany({
      where,
      orderBy: [{ wonAt: "desc" }, { id: "desc" }],
      skip,
      take: pageSize,
      select: winnerSelect,
    })
    .then((winners) =>
      winners.map((winner) => ({
        id: winner.id,
        nickname: winner.nickname,
        prizeName: winner.prizeName,
        tier: winner.tier,
        wonAt: winner.wonAt,
      })),
    );

  return {
    items,
    total,
    page: currentPage,
    pageSize,
    totalPages,
  };
}

export async function listAllWinners(filters: Omit<WinnerFilters, "limit" | "page"> = {}) {
  if (!(await hasRequiredLotteryTables(["lottery_winner"]))) {
    return [];
  }

  const nickname = filters.nickname?.trim() || undefined;
  const keyword = filters.keyword?.trim() || undefined;
  const tier = filters.tier;

  return prisma.lotteryWinner
    .findMany({
      where: {
        ...(nickname
          ? {
              nickname: {
                contains: nickname,
                mode: "insensitive",
              },
            }
          : {}),
        ...(keyword
          ? {
              prizeName: {
                contains: keyword,
                mode: "insensitive",
              },
            }
          : {}),
        ...(tier ? { tier } : {}),
      },
      orderBy: [{ wonAt: "desc" }, { id: "desc" }],
      select: winnerSelect,
    })
    .then((winners) =>
      winners.map((winner) => ({
        id: winner.id,
        nickname: winner.nickname,
        prizeName: winner.prizeName,
        tier: winner.tier,
        wonAt: winner.wonAt,
      })),
    );
}

export async function getLotteryTableStatus(): Promise<LotteryTableStatus> {
  const tableNames = await getExistingLotteryTableNames();

  return {
    prizesTableExists: tableNames.has("lottery_prizes"),
    winnersTableExists: tableNames.has("lottery_winner"),
  };
}

export async function createLotteryTables() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "lottery_prizes" (
      "id" SERIAL NOT NULL,
      "name" TEXT NOT NULL,
      "tier" INTEGER NOT NULL,
      "probability_weight" INTEGER NOT NULL DEFAULT 1,
      "stock" INTEGER NOT NULL DEFAULT 0,
      "image_url" TEXT,
      "is_active" BOOLEAN NOT NULL DEFAULT true,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "lottery_prizes_pkey" PRIMARY KEY ("id")
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "lottery_winner" (
      "id" SERIAL NOT NULL,
      "nickname" TEXT NOT NULL,
      "prize_name" TEXT NOT NULL,
      "tier" INTEGER NOT NULL,
      "won_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "lottery_winner_pkey" PRIMARY KEY ("id")
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "lottery_prizes_tier_idx"
    ON "lottery_prizes"("tier");
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "lottery_winner_won_at_idx"
    ON "lottery_winner"("won_at" DESC);
  `);

  return getLotteryTableStatus();
}

export async function updatePrizeStocksByTier(input: Array<{ tier: number; stock: number }>) {
  if (!(await hasRequiredLotteryTables(["lottery_prizes"]))) {
    return 0;
  }

  return prisma.$transaction(async (tx) => {
    const results = await Promise.all(
      input.map(({ tier, stock }) =>
        tx.lotteryPrize.updateMany({
          where: { tier },
          data: { stock },
        }),
      ),
    );

    return results.reduce((sum, item) => sum + item.count, 0);
  });
}

export async function getWinnerTierStats(): Promise<WinnerTierStat[]> {
  if (!(await hasRequiredLotteryTables(["lottery_winner"]))) {
    return [];
  }

  const rows = await prisma.lotteryWinner.groupBy({
    by: ["tier"],
    _count: {
      _all: true,
    },
    orderBy: {
      tier: "asc",
    },
  });

  return rows.map((row) => ({
    tier: row.tier,
    count: row._count._all,
  }));
}

export async function clearAllWinners() {
  if (!(await hasRequiredLotteryTables(["lottery_winner"]))) {
    return { count: 0 };
  }

  return prisma.lotteryWinner.deleteMany();
}

export async function getEligiblePrizes(
  tx: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<PrizeListItem[]> {
  if (tx === prisma && !(await hasRequiredLotteryTables(["lottery_prizes"]))) {
    return [];
  }

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
      winner: {
        id: winner.id,
        nickname: winner.nickname,
        prizeName: winner.prizeName,
        tier: winner.tier,
        wonAt: winner.wonAt,
      },
      prize: {
        ...chosenPrize,
        stock: chosenPrize.stock - 1,
      },
    } satisfies DrawResult;
  });
}
