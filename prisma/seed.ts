import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const prizes = [
  {
    name: "一等奖 iPad Pro",
    tier: 1,
    probabilityWeight: 1,
    stock: 2,
    imageUrl: "/prizes/ipad-pro.png",
    isActive: true,
  },
  {
    name: "二等奖 AirPods Pro",
    tier: 2,
    probabilityWeight: 4,
    stock: 8,
    imageUrl: "/prizes/airpods-pro.png",
    isActive: true,
  },
  {
    name: "三等奖 保温杯",
    tier: 3,
    probabilityWeight: 10,
    stock: 20,
    imageUrl: "/prizes/thermos-cup.png",
    isActive: true,
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
      { nickname: "Alex", prizeName: "二等奖 AirPods Pro", tier: 2 },
      { nickname: "Mia", prizeName: "三等奖 保温杯", tier: 3 },
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
