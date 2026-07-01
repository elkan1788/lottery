import { randomUUID } from "node:crypto";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const prizes = [
  {
    id: randomUUID(),
    name: "一等奖 iPad Pro",
    tier: 1,
    probabilityWeight: 1,
    stockTotal: 2,
    stockRemaining: 2,
    imageUrl: "/prizes/ipad-pro.png",
    description: "旗舰平板大奖",
    isActive: true,
    sortOrder: 1,
  },
  {
    id: randomUUID(),
    name: "二等奖 AirPods Pro",
    tier: 2,
    probabilityWeight: 4,
    stockTotal: 8,
    stockRemaining: 8,
    imageUrl: "/prizes/airpods-pro.png",
    description: "热门耳机奖品",
    isActive: true,
    sortOrder: 2,
  },
  {
    id: randomUUID(),
    name: "三等奖 保温杯",
    tier: 3,
    probabilityWeight: 10,
    stockTotal: 20,
    stockRemaining: 20,
    imageUrl: "/prizes/thermos-cup.png",
    description: "日常实用礼品",
    isActive: true,
    sortOrder: 3,
  },
];

async function main() {
  await prisma.lotteryWinner.deleteMany();
  await prisma.lotteryPrize.deleteMany();

  await prisma.lotteryPrize.createMany({
    data: prizes,
  });

  await prisma.lotteryWinner.createMany({
    data: [
      {
        id: randomUUID(),
        nickname: "Alex",
        prizeId: prizes[1].id,
        prizeNameSnapshot: "二等奖 AirPods Pro",
        tierSnapshot: 2,
      },
      {
        id: randomUUID(),
        nickname: "Mia",
        prizeId: prizes[2].id,
        prizeNameSnapshot: "三等奖 保温杯",
        tierSnapshot: 3,
      },
    ],
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
