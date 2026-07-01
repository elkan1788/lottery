import { NextResponse } from "next/server";
import { z } from "zod";

import { listPrizes, listWinners, runLottery } from "@/lib/lottery/service";
import { formatDateTimeToAppTimezone } from "@/lib/utils/time";

const drawRequestSchema = z.object({
  nickname: z.string().trim().min(1).max(40),
});

export async function GET() {
  const [prizes, winners] = await Promise.all([listPrizes(), listWinners(10)]);

  return NextResponse.json({
    prizes,
    winners: winners.map((winner) => ({
      ...winner,
      wonAtLabel: formatDateTimeToAppTimezone(winner.wonAt),
    })),
    serverTime: formatDateTimeToAppTimezone(new Date()),
  });
}

export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const parsed = drawRequestSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        message: "请输入有效花名后再开始抽奖。",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const result = await runLottery(parsed.data.nickname);

    if (result.status === "ended") {
      return NextResponse.json(result, { status: 409 });
    }

    return NextResponse.json({
      status: result.status,
      prize: result.prize,
      winner: {
        ...result.winner,
        wonAtLabel: formatDateTimeToAppTimezone(result.winner.wonAt),
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_NICKNAME") {
      return NextResponse.json({ message: "请输入有效花名后再开始抽奖。" }, { status: 400 });
    }

    if (error instanceof Error && error.message === "PRIZE_STOCK_CONFLICT") {
      return NextResponse.json(
        { message: "奖品库存刚刚发生变化，请重新抽奖。" },
        { status: 409 },
      );
    }

    throw error;
  }
}
