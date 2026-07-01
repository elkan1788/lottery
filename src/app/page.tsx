import { LotteryStage } from "@/components/lottery/lottery-stage";
import { listPrizes, listWinners } from "@/lib/lottery/service";
import { formatDateTimeToAppTimezone } from "@/lib/utils/time";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [prizes, winners] = await Promise.all([listPrizes(), listWinners(12)]);

  return (
    <LotteryStage
      initialPrizes={prizes}
      initialWinners={winners.map((winner) => ({
        ...winner,
        wonAtLabel: formatDateTimeToAppTimezone(winner.wonAt),
      }))}
    />
  );
}
