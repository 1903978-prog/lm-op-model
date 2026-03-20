import cron from "node-cron";
import { sendWeeklyDeadlinesEmail } from "./emailer";
import { log } from "./index";

export function startScheduler(): void {
  // Every Monday at 14:00 CET (Europe/Rome = CET/CEST)
  cron.schedule(
    "0 14 * * 1",
    async () => {
      log("Running weekly overdue-deadlines email job", "scheduler");
      try {
        await sendWeeklyDeadlinesEmail();
      } catch (err) {
        log(`Weekly email job failed: ${String(err)}`, "scheduler");
      }
    },
    { timezone: "Europe/Rome" }
  );

  log("Weekly email scheduler started (Mon 14:00 CET)", "scheduler");
}
