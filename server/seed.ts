import { db } from "./storage";
import { destinations, tasks, trips, tripTasks, deadlines, deadlineCategories } from "@shared/schema";
import { eq, or, isNull } from "drizzle-orm";

export async function seedDatabase() {
  // ── Destinations ──────────────────────────────────────────────────────────
  let existingDests = await db.select().from(destinations);

  let italy = existingDests.find((d) => d.name === "Italy");
  let romania = existingDests.find((d) => d.name === "Romania");
  let thailand = existingDests.find((d) => d.name === "Thailand");

  if (!italy) {
    [italy] = await db.insert(destinations).values({ name: "Italy", icon: "Wine", color: "#16a34a" }).returning();
    console.log("[seed] Inserted destination: Italy");
  }
  if (!romania) {
    [romania] = await db.insert(destinations).values({ name: "Romania", icon: "Mountain", color: "#dc2626" }).returning();
    console.log("[seed] Inserted destination: Romania");
  }
  if (!thailand) {
    [thailand] = await db.insert(destinations).values({ name: "Thailand", icon: "Palmtree", color: "#f59e0b" }).returning();
    console.log("[seed] Inserted destination: Thailand");
  }

  // ── Tasks ─────────────────────────────────────────────────────────────────
  const existingTasks = await db.select().from(tasks);
  if (existingTasks.length === 0) {
    await db.insert(tasks).values([
      { title: "Turn on heating", destinationId: italy!.id, isGlobal: false, advanceDays: 7, seasonStart: 10, seasonEnd: 5 },
      { title: "Restart car insurance", destinationId: italy!.id, isGlobal: false, advanceDays: 14 },
      { title: "Pay Wind mobile subscription", destinationId: italy!.id, isGlobal: false, advanceDays: 3 },
      { title: "Buy travel insurance", destinationId: italy!.id, isGlobal: false, advanceDays: 21 },
      { title: "Book works to be done", destinationId: romania!.id, isGlobal: false, advanceDays: 14 },
      { title: "Call RE agency", destinationId: romania!.id, isGlobal: false, advanceDays: 7 },
      { title: "Replace car battery", destinationId: romania!.id, isGlobal: false, advanceDays: 10 },
      { title: "Call friends", destinationId: romania!.id, isGlobal: false, advanceDays: 3 },
      { title: "TD", destinationId: romania!.id, isGlobal: false, advanceDays: 5 },
      { title: "audi ITP", destinationId: romania!.id, isGlobal: false, advanceDays: 7 },
      { title: "Pay mobile phone bill", destinationId: thailand!.id, isGlobal: false, advanceDays: 3 },
      { title: "Entry card", destinationId: thailand!.id, isGlobal: false, advanceDays: 3 },
      { title: "Suspend car insurance italy", destinationId: thailand!.id, isGlobal: false, advanceDays: 1 },
      { title: "Bring car keys", destinationId: null, isGlobal: true, advanceDays: 3 },
      { title: "Bring flat keys", destinationId: null, isGlobal: true, advanceDays: 5 },
    ]);
    console.log("[seed] Inserted tasks");
  }

  // ── Trips + Trip Tasks ────────────────────────────────────────────────────
  const existingTrips = await db.select().from(trips);
  if (existingTrips.length === 0) {
    const allTasks = await db.select().from(tasks);

    const seedTrips = [
      { destinationId: romania!.id, arrivalDate: "2026-03-23" },
      { destinationId: thailand!.id, arrivalDate: "2026-03-28" },
      { destinationId: italy!.id,   arrivalDate: "2026-06-01" },
    ];

    for (const t of seedTrips) {
      const [trip] = await db.insert(trips).values({ destinationId: t.destinationId, arrivalDate: t.arrivalDate }).returning();
      const arrivalDate = new Date(t.arrivalDate);
      const destTasks = allTasks.filter(
        (task) => task.destinationId === t.destinationId || task.isGlobal
      );
      for (const task of destTasks) {
        if (task.seasonStart !== null && task.seasonEnd !== null) {
          const m = arrivalDate.getMonth() + 1;
          if (task.seasonStart <= task.seasonEnd) {
            if (m < task.seasonStart || m > task.seasonEnd) continue;
          } else {
            if (m < task.seasonStart && m > task.seasonEnd) continue;
          }
        }
        const due = new Date(arrivalDate);
        due.setDate(due.getDate() - task.advanceDays);
        await db.insert(tripTasks).values({
          tripId: trip.id,
          taskId: task.id,
          completed: false,
          dueDate: due.toISOString().split("T")[0],
        });
      }
    }
    console.log("[seed] Inserted trips + trip tasks");
  }

  // ── Deadline Categories ───────────────────────────────────────────────────
  const existingCats = await db.select().from(deadlineCategories);
  if (existingCats.length === 0) {
    await db.insert(deadlineCategories).values([
      { name: "car insurance" },
      { name: "car inspection" },
      { name: "car tax" },
      { name: "company filing" },
      { name: "insurance" },
      { name: "property insurance" },
      { name: "property tax" },
      { name: "tax" },
      { name: "utility admin" },
      { name: "health" },
    ]);
    console.log("[seed] Inserted deadline categories");
  }

  // ── Deadlines ─────────────────────────────────────────────────────────────
  const existingDeadlines = await db.select().from(deadlines);
  if (existingDeadlines.length === 0) {
    await db.insert(deadlines).values([
      { name: "Cenate IMU", category: "property tax", country: "Italy", frequency: "annual", day: 16, month: 6, notes: "IMU", autoPayment: false, reminderDaysBefore: 30 },
      { name: "E-distribuzione solar meter", category: "utility admin", country: "Italy", frequency: "annual", notes: "Misura energia solari - date to confirm", autoPayment: false, reminderDaysBefore: 30 },
      { name: "Ghisalba IMU", category: "property tax", country: "Italy", frequency: "annual", day: 16, month: 6, notes: "IMU", autoPayment: false, reminderDaysBefore: 30 },
      { name: "Emerald property tax (building + land)", category: "property tax", country: "Romania", frequency: "annual", day: 31, month: 3, notes: "Impozit cladire, teren", autoPayment: false, reminderDaysBefore: 30 },
      { name: "Romania land tax", category: "property tax", country: "Romania", frequency: "annual", day: 31, month: 3, notes: "Terenuri Romania", autoPayment: false, reminderDaysBefore: 30 },
      { name: "Tallinn property tax", category: "property tax", country: "Estonia", frequency: "annual", day: 15, month: 1, notes: "EE flat tax / Tallinn property tax", autoPayment: false, reminderDaysBefore: 30 },
      { name: "EE flat insurance", category: "property insurance", country: "Estonia", frequency: "annual", day: 30, month: 3, notes: "Insurance EE flat", autoPayment: false, reminderDaysBefore: 30 },
      { name: "IR France tax filing", category: "tax", country: "France", frequency: "annual", day: 20, month: 5, notes: "LM-FS / SCPI", autoPayment: false, reminderDaysBefore: 30 },
      { name: "Tax France CEF", category: "tax", country: "France", frequency: "annual", day: 15, month: 11, notes: "FR CEF tax declaration", autoPayment: false, reminderDaysBefore: 30 },
      { name: "Stayhome CEF location meuble tax", category: "property tax", country: "France", frequency: "annual", day: 15, month: 12, notes: "120 EUR per flat", autoPayment: false, reminderDaysBefore: 30 },
      { name: "CAR Peugeot 308", category: "car tax", country: "Italy", frequency: "annual", day: 30, month: 3, notes: "Bollo 308", autoPayment: false, reminderDaysBefore: 30 },
      { name: "CAR Porsche Cayenne", category: "car tax", country: "Italy", frequency: "annual", notes: "Date to confirm", autoPayment: false, reminderDaysBefore: 30 },
      { name: "Eendigo LLC", category: "company filing", country: "US", frequency: "annual", day: 1, month: 4, lastDone: "2025-03-28", reminderDaysBefore: 30, autoPayment: false },
      { name: "IRIDIUM", category: "company filing", country: "ro", frequency: "annual", month: 4, lastDone: "2025-03-01", autoPayment: false, reminderDaysBefore: 30 },
      { name: "Square1 filing", category: "company filing", country: "EE", frequency: "annual", day: 30, month: 4, reminderDaysBefore: 1, notes: "S01_FS", autoPayment: false },
      { name: "CAR Toyota", category: "car inspection", country: "Italy", frequency: "annual", day: 30, notes: "Date to confirm", autoPayment: false, reminderDaysBefore: 30 },
      { name: "CAR Audi", category: "car inspection", country: "Italy", frequency: "annual", notes: "Revisione ogni 1 anno - last date to confirm", autoPayment: false, reminderDaysBefore: 30 },
      { name: "CAR Peugeot 3008", category: "car inspection", country: "Italy", frequency: "every_2_years", notes: "Revisione ogni 2 anni - last date to confirm", autoPayment: false, reminderDaysBefore: 30 },
      { name: "CAR Porsche Cayenne", category: "car inspection", country: "Italy", frequency: "every_2_years", lastDone: "2023-03-01", notes: "Revisione ogni 4 anni da 03/23", autoPayment: false, reminderDaysBefore: 30 },
      { name: "CAR Audi", category: "car insurance", country: "Italy", frequency: "annual", day: 30, notes: "Date to confirm", autoPayment: false, reminderDaysBefore: 30 },
      { name: "CAR Peugeot 308", category: "car insurance", country: "Italy", frequency: "annual", day: 28, month: 5, notes: "Insurance 308", autoPayment: false, reminderDaysBefore: 30 },
      { name: "CAR Peugeot 3008", category: "car insurance", country: "Italy", frequency: "annual", day: 30, notes: "Date to confirm", autoPayment: false, reminderDaysBefore: 30 },
      { name: "CAR Porsche Cayenne", category: "car insurance", country: "Italy", frequency: "annual", day: 30, notes: "Date to confirm", autoPayment: false, reminderDaysBefore: 30 },
      { name: "CAR Audi A4", category: "car insurance", country: "Romania", frequency: "annual", day: 20, month: 6, notes: "Insurance Audi Romania", autoPayment: false, reminderDaysBefore: 30 },
      { name: "CAR Toyota", category: "car insurance", country: "Italy", frequency: "annual", notes: "Date to confirm", autoPayment: false, reminderDaysBefore: 30 },
      { name: "CAR Audi", category: "car tax", country: "Italy", frequency: "annual", day: 30, month: 3, notes: "Bollo Audi", autoPayment: false, reminderDaysBefore: 30 },
      { name: "CAR Peugeot 3008", category: "car tax", country: "Italy", frequency: "annual", day: 30, month: 3, notes: "Bollo 3008", autoPayment: false, reminderDaysBefore: 30 },
      { name: "CAR Porsche Cayenne Superbollo", category: "car tax", country: "Italy", frequency: "annual", notes: "Date to confirm", autoPayment: false, reminderDaysBefore: 30 },
      { name: "CAR Toyota", category: "car tax", country: "Italy", frequency: "annual", notes: "Date to confirm", autoPayment: false, reminderDaysBefore: 30 },
      { name: "Vehicle inspection Peugeot 308", category: "car inspection", country: "Italy", frequency: "every_2_years", month: 1, lastDone: "2023-06-01", notes: "Revisione ogni 2 anni", autoPayment: false, reminderDaysBefore: 30 },
      { name: "RO Emerald insurance", category: "property insurance", country: "Romania", frequency: "annual", day: 18, month: 3, notes: "Insurance RO Emerald", autoPayment: false, snoozedUntil: "2026-09-11", reminderDaysBefore: 30 },
      { name: "IMMO conta", category: "utility admin", country: "fr", frequency: "annual", day: 30, month: 5, lastDone: "2026-02-01", autoPayment: false, reminderDaysBefore: 30 },
      { name: "Cenate TARI", category: "property tax", country: "Italy", frequency: "annual", day: 30, month: 9, notes: "TARI", autoPayment: false, reminderDaysBefore: 30 },
      { name: "Health insurance", category: "health", country: "Unknown", frequency: "annual", day: 10, month: 10, notes: "Annual payment", autoPayment: false, reminderDaysBefore: 30 },
      { name: "tartaro denti", category: "health", frequency: "annual", day: 30, month: 8, lastDone: "2025-01-01", autoPayment: false, reminderDaysBefore: 30 },
      { name: "Check up", category: "health", country: "it", frequency: "every_2_years", day: 30, month: 8, lastDone: "2024-08-01", autoPayment: false, reminderDaysBefore: 30 },
    ]);
    console.log("[seed] Inserted deadlines");
  }
}
