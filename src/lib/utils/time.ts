import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const APP_TIMEZONE = process.env.APP_TIMEZONE || "Asia/Shanghai";

export function formatDateTimeToAppTimezone(value: Date | string) {
  return dayjs(value).tz(APP_TIMEZONE).format("YYYY-MM-DD HH:mm");
}
