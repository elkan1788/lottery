import { NextResponse } from "next/server";

import { isAdminAuthenticated } from "@/lib/auth/session";
import { listAllWinners } from "@/lib/lottery/service";
import { formatDateTimeToAppTimezone } from "@/lib/utils/time";

function escapeCsvValue(value: string | number) {
  const text = String(value);

  if (text.includes(",") || text.includes("\"") || text.includes("\n")) {
    return `"${text.replaceAll("\"", "\"\"")}"`;
  }

  return text;
}

export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ message: "请先登录后台。" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const nickname = searchParams.get("nickname") || "";
  const keyword = searchParams.get("keyword") || "";
  const tierValue = Number(searchParams.get("tier") || "");
  const normalizedTier = Number.isFinite(tierValue) && tierValue > 0 ? tierValue : undefined;

  const winners = await listAllWinners({
    nickname,
    keyword,
    tier: normalizedTier,
  });

  const rows = [
    ["花名", "奖品名称", "等级", "中奖时间"],
    ...winners.map((winner) => [
      winner.nickname,
      winner.prizeName,
      `${winner.tier} 等奖`,
      formatDateTimeToAppTimezone(winner.wonAt),
    ]),
  ];

  const csv = `\uFEFF${rows
    .map((row) => row.map((cell) => escapeCsvValue(cell)).join(","))
    .join("\n")}`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="winners-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
