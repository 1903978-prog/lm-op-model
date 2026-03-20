import { Resend } from "resend";
import { storage } from "./storage";
import { log } from "./index";

const RECIPIENT = "1903978@gmail.com";

function computeNextDue(d: {
  frequency: string | null;
  day: number | null;
  month: number | null;
  lastDone: string | null;
}): Date | null {
  const { frequency, day, month, lastDone } = d;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (day != null && month != null) {
    let due = new Date(today.getFullYear(), month - 1, day);
    due.setHours(0, 0, 0, 0);
    if (due < today) {
      due = new Date(today.getFullYear() + 1, month - 1, day);
      due.setHours(0, 0, 0, 0);
    }
    return due;
  }

  if (lastDone) {
    const base = new Date(lastDone);
    base.setHours(0, 0, 0, 0);
    if (frequency === "every_2_years") { const d = new Date(base); d.setFullYear(d.getFullYear() + 2); return d; }
    if (frequency === "every_3_years") { const d = new Date(base); d.setFullYear(d.getFullYear() + 3); return d; }
    if (frequency === "every_4_years") { const d = new Date(base); d.setFullYear(d.getFullYear() + 4); return d; }
    if (frequency === "annual")        { const d = new Date(base); d.setFullYear(d.getFullYear() + 1); return d; }
  }

  return null;
}

function daysDiff(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}

function fmt(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export async function sendWeeklyDeadlinesEmail(): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    log("RESEND_API_KEY not set — skipping weekly email", "scheduler");
    return;
  }

  const resend = new Resend(apiKey);
  const deadlines = await storage.getDeadlines();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdue = deadlines
    .filter((d) => !d.autoPayment)
    .map((d) => {
      const nextDue = computeNextDue(d);
      if (!nextDue) return null;
      const daysLeft = daysDiff(nextDue, today);
      return daysLeft < 0 ? { ...d, nextDue, daysLeft } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a!.daysLeft - b!.daysLeft) as Array<{
      id: string; name: string; category: string | null; country: string | null;
      nextDue: Date; daysLeft: number;
    }>;

  if (overdue.length === 0) {
    log("No overdue deadlines — skipping weekly email", "scheduler");
    return;
  }

  const rows = overdue
    .map(
      (d) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${d.name}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-transform:capitalize;">${d.category ?? "—"}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${d.country ?? "—"}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${fmt(d.nextDue)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#dc2626;font-weight:600;">${Math.abs(d.daysLeft)}d overdue</td>
      </tr>`
    )
    .join("");

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;color:#111827;max-width:700px;margin:0 auto;padding:24px;">
  <h2 style="margin-bottom:4px;">⚠️ Overdue Deadlines</h2>
  <p style="color:#6b7280;margin-top:0;">Weekly summary — ${today.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
  <p>You have <strong>${overdue.length}</strong> overdue deadline${overdue.length === 1 ? "" : "s"} that need attention:</p>
  <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
    <thead>
      <tr style="background:#f9fafb;">
        <th style="padding:10px 12px;text-align:left;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Name</th>
        <th style="padding:10px 12px;text-align:left;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Category</th>
        <th style="padding:10px 12px;text-align:left;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Country</th>
        <th style="padding:10px 12px;text-align:left;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Due Date</th>
        <th style="padding:10px 12px;text-align:left;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Status</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <p style="margin-top:24px;color:#9ca3af;font-size:12px;">Sent automatically every Monday at 2 PM CET by your life management app.</p>
</body>
</html>`;

  const { data, error } = await resend.emails.send({
    from: "Life Manager <onboarding@resend.dev>",
    to: RECIPIENT,
    subject: `⚠️ ${overdue.length} overdue deadline${overdue.length === 1 ? "" : "s"} — weekly summary`,
    html,
  });

  if (error) {
    log(`Email send failed: ${JSON.stringify(error)}`, "scheduler");
  } else {
    log(`Weekly email sent (id=${data?.id}) — ${overdue.length} overdue items`, "scheduler");
  }
}
