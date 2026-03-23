import { db } from "./storage";
import { destinations, tasks, trips, tripTasks, deadlines, deadlineCategories, friends, tdlTasks, places, packingLists, packingItems } from "@shared/schema";

export async function seedDatabase() {
  // ── Destinations ──────────────────────────────────────────────────────────
  const existingDests = await db.select().from(destinations);
  if (existingDests.length === 0) {
    await db.insert(destinations).values([
      { id: "0f4dcd7b-9bd9-4ccb-b83d-a8cea768faf6", name: "Italy",    icon: "Wine",     color: "#16a34a" },
      { id: "f6d31e2f-bd6e-4e07-96dc-75ab606a4712", name: "Romania",  icon: "Mountain", color: "#dc2626" },
      { id: "52edfcc6-7149-4ad6-9fa1-f5dc8dacc0b2", name: "Thailand", icon: "Palmtree", color: "#f59e0b" },
      { id: "662798f3-3cef-4c5d-8d9d-5bd23e06ea3d", name: "Russia",   icon: "MapPin",   color: "#3b82f6" },
    ]);
    console.log("[seed] Inserted destinations");
  }

  // ── Tasks ─────────────────────────────────────────────────────────────────
  const existingTasks = await db.select().from(tasks);
  if (existingTasks.length === 0) {
    await db.insert(tasks).values([
      { id: "14925c24-fec7-49b7-a082-dad38a3c0b57", title: "Turn on heating",           destinationId: "0f4dcd7b-9bd9-4ccb-b83d-a8cea768faf6", isGlobal: false, advanceDays: 7,  seasonStart: 10, seasonEnd: 5 },
      { id: "010f9f17-474d-49ed-b5ae-a50c812de318", title: "Restart car insurance",      destinationId: "0f4dcd7b-9bd9-4ccb-b83d-a8cea768faf6", isGlobal: false, advanceDays: 14, seasonStart: null, seasonEnd: null },
      { id: "dde4c070-f3fe-493d-b094-f2e7350175fc", title: "Pay Wind mobile subscription",destinationId: "0f4dcd7b-9bd9-4ccb-b83d-a8cea768faf6", isGlobal: false, advanceDays: 3,  seasonStart: null, seasonEnd: null },
      { id: "447d1011-f462-48ff-a23f-582e9ba38f93", title: "Book works to be done",      destinationId: "f6d31e2f-bd6e-4e07-96dc-75ab606a4712", isGlobal: false, advanceDays: 14, seasonStart: null, seasonEnd: null },
      { id: "049cc1e4-a551-48d0-9d50-4aebe16da5b8", title: "Call RE agency",             destinationId: "f6d31e2f-bd6e-4e07-96dc-75ab606a4712", isGlobal: false, advanceDays: 7,  seasonStart: null, seasonEnd: null },
      { id: "c5c575bb-1ec2-4887-ae25-7733ae6e096a", title: "Replace car battery",        destinationId: "f6d31e2f-bd6e-4e07-96dc-75ab606a4712", isGlobal: false, advanceDays: 10, seasonStart: null, seasonEnd: null },
      { id: "c165d168-7772-41d9-92fb-bff0d333ff05", title: "Call friends",               destinationId: "f6d31e2f-bd6e-4e07-96dc-75ab606a4712", isGlobal: false, advanceDays: 3,  seasonStart: null, seasonEnd: null },
      { id: "dec57004-6796-444b-bc2e-5d63ec309945", title: "TD",                         destinationId: "f6d31e2f-bd6e-4e07-96dc-75ab606a4712", isGlobal: false, advanceDays: 5,  seasonStart: null, seasonEnd: null },
      { id: "f124fe11-ccdb-4068-9b25-bb5a8990cf9f", title: "Pay mobile phone bill",      destinationId: "52edfcc6-7149-4ad6-9fa1-f5dc8dacc0b2", isGlobal: false, advanceDays: 3,  seasonStart: null, seasonEnd: null },
      { id: "1306c3f2-cdb1-45f5-a313-210446ef23e6", title: "Bring car keys",             destinationId: null,                                    isGlobal: true,  advanceDays: 0,  seasonStart: null, seasonEnd: null },
      { id: "81fde7f4-1b16-4921-b73a-138b5d5854bb", title: "Bring flat keys",            destinationId: null,                                    isGlobal: true,  advanceDays: 0,  seasonStart: null, seasonEnd: null },
      { id: "005a74c5-49fa-4cdb-a749-83d72433ea41", title: "Visa online",                destinationId: "662798f3-3cef-4c5d-8d9d-5bd23e06ea3d", isGlobal: false, advanceDays: 10, seasonStart: null, seasonEnd: null },
      { id: "ff037a3f-187c-4c0f-afae-a0af6bf72ba9", title: "unicredit app",              destinationId: "662798f3-3cef-4c5d-8d9d-5bd23e06ea3d", isGlobal: false, advanceDays: 10, seasonStart: null, seasonEnd: null },
      { id: "9d8f1883-ea63-488e-bcea-a2df19092343", title: "sim card",                   destinationId: "662798f3-3cef-4c5d-8d9d-5bd23e06ea3d", isGlobal: false, advanceDays: 10, seasonStart: null, seasonEnd: null },
    ]);
    console.log("[seed] Inserted tasks");
  }

  // ── Trips ─────────────────────────────────────────────────────────────────
  const existingTrips = await db.select().from(trips);
  if (existingTrips.length === 0) {
    await db.insert(trips).values([
      { id: "34efac9e-eebb-4f3c-90a3-ee7378ed7980", destinationId: "52edfcc6-7149-4ad6-9fa1-f5dc8dacc0b2", arrivalDate: "2026-03-28", notes: null },
      { id: "ad865c4a-496c-49c8-a63c-77765d1e0dc0", destinationId: "0f4dcd7b-9bd9-4ccb-b83d-a8cea768faf6", arrivalDate: "2026-06-01", notes: null },
    ]);
    console.log("[seed] Inserted trips");
  }

  // ── Trip Tasks ────────────────────────────────────────────────────────────
  const existingTripTasks = await db.select().from(tripTasks);
  if (existingTripTasks.length === 0) {
    await db.insert(tripTasks).values([
      { id: "8a2fae39-b882-4ce7-88d5-c0d953a28039", tripId: "34efac9e-eebb-4f3c-90a3-ee7378ed7980", taskId: "f124fe11-ccdb-4068-9b25-bb5a8990cf9f", completed: false, dueDate: "2026-03-25" },
      { id: "d83898b2-11bc-4b9b-b0d4-121fcb1aee35", tripId: "34efac9e-eebb-4f3c-90a3-ee7378ed7980", taskId: "1306c3f2-cdb1-45f5-a313-210446ef23e6", completed: false, dueDate: "2026-03-28" },
      { id: "3849944f-809b-4306-ab64-1064c8a91618", tripId: "34efac9e-eebb-4f3c-90a3-ee7378ed7980", taskId: "81fde7f4-1b16-4921-b73a-138b5d5854bb", completed: false, dueDate: "2026-03-28" },
      { id: "3a6db702-c1ff-40a2-b04f-073dacf4dfd7", tripId: "ad865c4a-496c-49c8-a63c-77765d1e0dc0", taskId: "010f9f17-474d-49ed-b5ae-a50c812de318", completed: false, dueDate: "2026-05-18" },
      { id: "9741fd03-b233-49fb-b8d7-f275f865b601", tripId: "ad865c4a-496c-49c8-a63c-77765d1e0dc0", taskId: "dde4c070-f3fe-493d-b094-f2e7350175fc", completed: false, dueDate: "2026-05-29" },
      { id: "dae80d00-0982-443a-ab0e-225deffacdd1", tripId: "ad865c4a-496c-49c8-a63c-77765d1e0dc0", taskId: "1306c3f2-cdb1-45f5-a313-210446ef23e6", completed: false, dueDate: "2026-06-01" },
      { id: "7558af95-c967-4b10-847f-05dcee905e86", tripId: "ad865c4a-496c-49c8-a63c-77765d1e0dc0", taskId: "81fde7f4-1b16-4921-b73a-138b5d5854bb", completed: false, dueDate: "2026-06-01" },
    ]);
    console.log("[seed] Inserted trip tasks");
  }

  // ── Deadline Categories ───────────────────────────────────────────────────
  const existingCats = await db.select().from(deadlineCategories);
  if (existingCats.length === 0) {
    await db.insert(deadlineCategories).values([
      { id: "17af0d84-a784-4228-b3a0-15e2afcbb4e0", name: "car inspection" },
      { id: "b1b1cbfb-378a-4eed-8696-d93da72d36eb", name: "car insurance" },
      { id: "b01258bd-7a8e-452b-be20-6d02eeaf1a0c", name: "car tax" },
      { id: "3834170c-bfa8-4a00-944d-b71ed390373c", name: "company filing" },
      { id: "43bef26e-0de6-4bee-b6cf-e285a0aff21b", name: "insurance" },
      { id: "727e9ea9-d812-49d2-8026-df21a1d3da3a", name: "property insurance" },
      { id: "55879365-e878-4857-b2df-5fcaac0dd8c2", name: "property tax" },
      { id: "4f364060-e07e-4c62-8d5a-fad8ec9211e4", name: "tax" },
      { id: "7143aa21-2961-4798-a025-96092dad7c6e", name: "utility admin" },
      { name: "health" },
    ]);
    console.log("[seed] Inserted deadline categories");
  }

  // ── Deadlines ─────────────────────────────────────────────────────────────
  const existingDeadlines = await db.select().from(deadlines);
  if (existingDeadlines.length === 0) {
    await db.insert(deadlines).values([
      { id: "63e1ebb6-0085-4e76-8cc5-d598b7663578", name: "Square1 filing",                        category: "company filing",    country: "EE",      frequency: "annual",       day: 30, month: 4,    year: null, lastDone: "2025-03-01", reminderDaysBefore: 1,  notes: "S01_FS",                   autoPayment: false, snoozedUntil: null,         deprioritized: false },
      { id: "fa8c0c21-fe87-4653-aeaf-adf1e3efcca5", name: "Eendigo LLC -1120-5472-FBAR",           category: "company filing",    country: "US",      frequency: "annual",       day: 15, month: 4,    year: null, lastDone: "2025-03-28", reminderDaysBefore: 30, notes: "1120-5472-FBAR",            autoPayment: false, snoozedUntil: "2026-09-12", deprioritized: false },
      { id: "a873bdf2-49bd-4b97-a91a-02c7a4f670c5", name: "Cenate IMU",                            category: "property tax",      country: "Italy",   frequency: "annual",       day: 16, month: 6,    year: null, lastDone: null,         reminderDaysBefore: 30, notes: "IMU",                       autoPayment: false, snoozedUntil: null,         deprioritized: false },
      { id: "641bfd72-81f5-4f12-9995-b8bd2294ea62", name: "E-distribuzione solar meter",           category: "utility admin",     country: "Italy",   frequency: "annual",       day: null, month: null, year: null, lastDone: null,         reminderDaysBefore: 30, notes: "Misura energia solari - date to confirm", autoPayment: false, snoozedUntil: null, deprioritized: false },
      { id: "865c38ea-231c-43b9-8141-bccc1f5b9044", name: "CAR Audi",                              category: "car inspection",    country: "Italy",   frequency: "annual",       day: 1,  month: 6,    year: null, lastDone: "2024-06-01", reminderDaysBefore: 30, notes: "Revisione ogni 1 anno - last date to confirm", autoPayment: false, snoozedUntil: null, deprioritized: false },
      { id: "e3e3851a-3551-4f2b-b143-22d184587d52", name: "CAR Toyota",                            category: "car inspection",    country: "Italy",   frequency: "annual",       day: 30, month: null,  year: null, lastDone: "2025-02-01", reminderDaysBefore: 30, notes: "Date to confirm",           autoPayment: false, snoozedUntil: null,         deprioritized: true  },
      { id: "721a6d05-196c-4bb2-9072-2eedc18b37f2", name: "CAR Toyota",                            category: "car insurance",     country: "TH",      frequency: "annual",       day: 1,  month: 12,   year: null, lastDone: "2025-12-01", reminderDaysBefore: 30, notes: "Date to confirm",           autoPayment: false, snoozedUntil: null,         deprioritized: false },
      { id: "48e61d24-b20d-4624-91b5-0797090f996c", name: "CAR Toyota",                            category: "car tax",           country: "TH",      frequency: "annual",       day: null, month: null, year: null, lastDone: "2025-12-01", reminderDaysBefore: 30, notes: "Date to confirm",          autoPayment: false, snoozedUntil: null,         deprioritized: false },
      { id: "819e5477-f78e-4b58-96ba-d740e97d684f", name: "Romania land tax",                      category: "property tax",      country: "Romania", frequency: "annual",       day: 31, month: 3,    year: null, lastDone: null,         reminderDaysBefore: 30, notes: "Terenuri Romania",          autoPayment: false, snoozedUntil: null,         deprioritized: true  },
      { id: "8750d225-e986-4341-95ed-95a713690edf", name: "Vehicle inspection Peugeot 308",        category: "car inspection",    country: "Italy",   frequency: "every_2_years",day: 11, month: 1,    year: null, lastDone: "2025-06-01", reminderDaysBefore: 30, notes: "Revisione ogni 2 anni",     autoPayment: false, snoozedUntil: null,         deprioritized: false },
      { id: "2f29513a-ff13-4b37-8a71-8e4a23adeb15", name: "Ghisalba IMU",                          category: "property tax",      country: "Italy",   frequency: "annual",       day: 16, month: 6,    year: null, lastDone: null,         reminderDaysBefore: 30, notes: "IMU",                       autoPayment: false, snoozedUntil: null,         deprioritized: false },
      { id: "206d962e-0a12-4ed6-be6f-4b88b3ddd79c", name: "Tallinn property tax",                  category: "property tax",      country: "Estonia", frequency: "annual",       day: 15, month: 1,    year: null, lastDone: null,         reminderDaysBefore: 30, notes: "EE flat tax / Tallinn property tax", autoPayment: false, snoozedUntil: null, deprioritized: false },
      { id: "f5375ffd-6f71-4b52-a1ca-655f2561d9dd", name: "IR France tax filing",                  category: "tax",               country: "France",  frequency: "annual",       day: 20, month: 5,    year: null, lastDone: null,         reminderDaysBefore: 30, notes: "LM-FS / SCPI",              autoPayment: false, snoozedUntil: null,         deprioritized: false },
      { id: "2a9ccefc-4684-4f99-90ac-17cabe81cb5d", name: "Tax France CEF",                        category: "tax",               country: "France",  frequency: "annual",       day: 15, month: 11,   year: null, lastDone: null,         reminderDaysBefore: 30, notes: "FR CEF tax declaration",    autoPayment: false, snoozedUntil: null,         deprioritized: false },
      { id: "29f0fe3c-3311-4c37-b528-980f9d7f359e", name: "Stayhome CEF location meuble tax",      category: "property tax",      country: "France",  frequency: "annual",       day: 15, month: 12,   year: null, lastDone: null,         reminderDaysBefore: 30, notes: "120 EUR per flat",          autoPayment: false, snoozedUntil: null,         deprioritized: false },
      { id: "733d87ab-a27f-4b4f-a635-35b2f9fe4ffd", name: "CAR Audi A4",                           category: "car insurance",     country: "Romania", frequency: "annual",       day: 20, month: 6,    year: null, lastDone: null,         reminderDaysBefore: 30, notes: "Insurance Audi Romania",    autoPayment: false, snoozedUntil: null,         deprioritized: false },
      { id: "ed20fa74-d94c-4850-871c-3ec0b788c170", name: "RO Emerald insurance",                  category: "property insurance",country: "Romania", frequency: "annual",       day: 18, month: 3,    year: null, lastDone: null,         reminderDaysBefore: 30, notes: "Insurance RO Emerald",      autoPayment: false, snoozedUntil: "2026-09-11", deprioritized: false },
      { id: "bea87ac7-3682-45e5-b9c9-89406d7813a6", name: "Cenate TARI",                           category: "property tax",      country: "Italy",   frequency: "annual",       day: 30, month: 9,    year: null, lastDone: null,         reminderDaysBefore: 30, notes: "TARI",                      autoPayment: false, snoozedUntil: null,         deprioritized: false },
      { id: "603e758a-19be-44ea-9b9a-7d7f44a4c3ce", name: "tartaro denti",                         category: "health",            country: null,      frequency: "annual",       day: 30, month: 8,    year: null, lastDone: "2025-01-01", reminderDaysBefore: 30, notes: null,                        autoPayment: false, snoozedUntil: null,         deprioritized: false },
      { id: "4971078f-a36a-4026-a1d2-d5b2c8726126", name: "Check up",                              category: "health",            country: "it",      frequency: "every_2_years",day: 30, month: 8,    year: null, lastDone: "2024-08-01", reminderDaysBefore: 30, notes: null,                        autoPayment: false, snoozedUntil: null,         deprioritized: false },
      { id: "1f6d7f9c-1bfc-4a8c-b2e5-97bcc1b1b52a", name: "Immoconta submission",                  category: "property tax",      country: "fr",      frequency: "annual",       day: 30, month: 4,    year: null, lastDone: "2025-04-01", reminderDaysBefore: 30, notes: null,                        autoPayment: false, snoozedUntil: null,         deprioritized: false },
      { id: "ddb99e91-8649-4e3b-9355-74cd61ac9e51", name: "EENDIGO LLC - state reporting",         category: "company filing",    country: "us",      frequency: "annual",       day: 1,  month: 3,    year: null, lastDone: "2026-02-01", reminderDaysBefore: 30, notes: null,                        autoPayment: false, snoozedUntil: null,         deprioritized: false },
      { id: "a191ec6a-3236-406c-a65d-af9776d42d24", name: "EENDIGO LLC - 1099",                    category: "company filing",    country: "US",      frequency: "annual",       day: 31, month: 1,    year: null, lastDone: "2026-01-01", reminderDaysBefore: 30, notes: null,                        autoPayment: false, snoozedUntil: null,         deprioritized: false },
      { id: "db1ffa9b-53e0-4cd9-b8a8-76d79a8bff22", name: "EE flat insurance",                     category: "property insurance",country: "Estonia", frequency: "annual",       day: 30, month: 3,    year: null, lastDone: null,         reminderDaysBefore: 30, notes: "Insurance EE flat",         autoPayment: false, snoozedUntil: "2026-09-12", deprioritized: false },
      { id: "23f64be5-4ddb-45ad-b157-93106a6b122f", name: "CAR Peugeot 308",                       category: "car insurance",     country: "Italy",   frequency: "annual",       day: 28, month: 5,    year: null, lastDone: null,         reminderDaysBefore: 30, notes: "Insurance 308",             autoPayment: false, snoozedUntil: "2026-09-12", deprioritized: false },
      { id: "049667f3-8f16-414f-b9d6-a8a78e231b7f", name: "CAR Porsche Cayenne",                   category: "car insurance",     country: "Italy",   frequency: "annual",       day: 30, month: null,  year: null, lastDone: null,         reminderDaysBefore: 30, notes: "Date to confirm",           autoPayment: false, snoozedUntil: null,         deprioritized: false },
      { id: "3bd2c974-624a-4f06-9e6c-d6a15645c54b", name: "CAR Peugeot 3008",                      category: "car insurance",     country: "Italy",   frequency: "annual",       day: 30, month: null,  year: null, lastDone: null,         reminderDaysBefore: 30, notes: "Date to confirm",           autoPayment: false, snoozedUntil: null,         deprioritized: false },
      { id: "5dcae90d-cb44-49bb-98ed-307ebf795b53", name: "CAR Porsche Cayenne Superbollo",        category: "car tax",           country: "Italy",   frequency: "annual",       day: 31, month: 7,    year: null, lastDone: "2025-06-12", reminderDaysBefore: 30, notes: "paid 1300e, F24",           autoPayment: false, snoozedUntil: null,         deprioritized: false },
      { id: "fceb6a94-c5fd-463a-9a67-750afb8ab32f", name: "IMMO CONTA PAY BILL",                   category: "utility admin",     country: "fr",      frequency: "annual",       day: 30, month: 5,    year: null, lastDone: "2026-02-01", reminderDaysBefore: 30, notes: null,                        autoPayment: false, snoozedUntil: null,         deprioritized: false },
      { id: "1202e357-820b-4d96-838b-555a61e928d1", name: "IRIDIUM",                               category: "company filing",    country: "ro",      frequency: "annual",       day: 15, month: 5,    year: null, lastDone: "2025-03-01", reminderDaysBefore: 30, notes: "",                          autoPayment: false, snoozedUntil: null,         deprioritized: false },
      { id: "7eac396e-3039-4b4c-8069-d762075213f0", name: "Health insurance",                      category: "health",            country: "Unknown", frequency: "annual",       day: 10, month: 10,   year: null, lastDone: "2025-10-01", reminderDaysBefore: 30, notes: "Annual payment",            autoPayment: false, snoozedUntil: null,         deprioritized: false },
      { id: "18a8421c-42b5-43a0-a21f-59fe950fd9a8", name: "CAR Peugeot 308",                       category: "car tax",           country: "Italy",   frequency: "annual",       day: 30, month: 3,    year: null, lastDone: "2025-03-01", reminderDaysBefore: 30, notes: "Bollo 308",                 autoPayment: true,  snoozedUntil: null,         deprioritized: false },
      { id: "894dbaae-53cb-4be7-ad47-23834d51964e", name: "CAR Porsche Cayenne",                   category: "car tax",           country: "Italy",   frequency: "annual",       day: 1,  month: 6,    year: null, lastDone: "2025-06-01", reminderDaysBefore: 30, notes: "Date to confirm",           autoPayment: true,  snoozedUntil: null,         deprioritized: false },
      { id: "1116665d-7f87-4099-b5f4-3789c2f12ab6", name: "CAR Peugeot 3008",                      category: "car tax",           country: "Italy",   frequency: "annual",       day: 30, month: 3,    year: null, lastDone: "2025-03-01", reminderDaysBefore: 30, notes: "Bollo 3008",                autoPayment: true,  snoozedUntil: null,         deprioritized: false },
      { id: "85bd8a3b-310e-48aa-b8ed-d41c5ab3b0ac", name: "CAR Audi",                              category: "car tax",           country: "Italy",   frequency: "annual",       day: 30, month: 3,    year: null, lastDone: "2025-03-01", reminderDaysBefore: 30, notes: "Bollo Audi",                autoPayment: false, snoozedUntil: "2026-09-12", deprioritized: false },
      { id: "60a0fcd4-745f-4245-85f9-119d9f198423", name: "CAR Porsche Cayenne",                   category: "car inspection",    country: "Italy",   frequency: "every_4_years",day: 31, month: 3,    year: null, lastDone: "2023-03-01", reminderDaysBefore: 30, notes: "Revisione ogni 4 anni da 03/23", autoPayment: false, snoozedUntil: null, deprioritized: false },
      { id: "b738fb09-9aa2-4c18-97d6-2932787b8dee", name: "CAR Peugeot 3008",                      category: "car inspection",    country: "Italy",   frequency: "every_2_years",day: null, month: 3,  year: null, lastDone: "2022-05-01", reminderDaysBefore: 30, notes: "Revisione ogni 2 anni - last date to confirm", autoPayment: false, snoozedUntil: null, deprioritized: true },
      { id: "985fe427-f3ae-42d2-b300-68cfbcfb8a87", name: "Emerald property tax (building + land)",category: "property tax",      country: "Romania", frequency: "annual",       day: 31, month: 3,    year: null, lastDone: "2025-03-12", reminderDaysBefore: 30, notes: "Impozit\nhttps://www.impozitelocale2.ro/  pass: D****007 \npers fisica: 7730419400013 cladire, teren\n\nhttps://www.impozitelocale2.ro\n\nProcess:\n\nClick \"Platforma digitală\".\n\nLog in with CNP (personal numeric code) or your company tax code.\n\nYou may need a password issued by the tax office.\n\nOnce logged in you can view and pay local taxes online.\n\nNote: if you never registered, you might need to ask them once for login credentials.\ncan be paid in two instalments\n\ndeadlines typically:\n\n31 March AND 30 September\n\nOR\nhttps://www.ghiseul.ro/ghiseul/public/taxe\nPLATA FARA AUTENTIFICARE", autoPayment: false, snoozedUntil: null, deprioritized: false },
      { id: "a01810d2-bcef-4a30-a509-6cb58955f1c7", name: "FINECO ANTHILIA IT0005431462",           category: "utility admin",     country: "IT",      frequency: "one-off",      day: 31, month: 12,   year: null, lastDone: "2027-12-01", reminderDaysBefore: 30, notes: "SCADE",                     autoPayment: false, snoozedUntil: null,         deprioritized: false },
    ]);
    console.log("[seed] Inserted deadlines");
  }

  // ── Friends ───────────────────────────────────────────────────────────────
  const existingFriends = await db.select().from(friends);
  if (existingFriends.length === 0) {
    await db.insert(friends).values([
      { id: "41bf0aec-5c18-43b2-83ef-87de921d70c5", name: "Daniel Dubai",     lastSpoke: "2023-12-01" },
      { id: "66cc4fbd-79f7-4e71-8b66-d2fe8ffc311a", name: "malatesta",        lastSpoke: "2023-12-01" },
      { id: "af16f1a4-975b-472b-88da-df7fe2a0a785", name: "fredeirc noirot",  lastSpoke: "2023-12-01" },
      { id: "afad0b66-774e-43ee-949f-c791e09c14bd", name: "kiran",            lastSpoke: "2023-12-01" },
      { id: "d1f9f353-eec8-4005-ae58-025df9a834ae", name: "pulice",           lastSpoke: "2023-12-01" },
      { id: "ea0749f7-0ec5-4ba1-9c1c-8ff77320cf73", name: "indovina",         lastSpoke: "2023-12-01" },
      { id: "f27aa727-7477-48a0-b83a-a327edaf5edc", name: "di fiore",         lastSpoke: "2023-12-01" },
      { id: "592c4280-170e-4145-81d3-47e85904f192", name: "frati",            lastSpoke: "2023-12-01" },
      { id: "a619da47-9fdc-40c1-9ad1-1f707a4045e4", name: "cadi olivier",     lastSpoke: "2023-12-01" },
      { id: "88d07d03-a2da-4c65-b56f-05a473283d94", name: "sebtastien CRA",   lastSpoke: "2023-12-01" },
      { id: "bc7e0d38-920c-4ce3-9e4c-b666296ead8a", name: "matzinger",        lastSpoke: "2023-12-01" },
      { id: "03655561-e541-4c11-a8e2-e84ee06e189c", name: "amedeo",           lastSpoke: "2023-12-01" },
      { id: "050aa292-1a11-4dd9-a387-ecd6fa977f54", name: "teppati",          lastSpoke: "2023-12-01" },
      { id: "84ec0d30-7532-42c7-b0a6-7e896ab86f1d", name: "liotta",           lastSpoke: "2023-12-01" },
      { id: "e75a4fa6-1217-47d6-a963-01e882ab248b", name: "mihai RO",         lastSpoke: "2023-12-01" },
      { id: "3d696ec2-9d44-435c-a3ad-5b3e37fb7d78", name: "abtan",            lastSpoke: "2026-03-01" },
      { id: "fc812510-140f-4ebf-81ac-475b3c265fad", name: "mazzoni",          lastSpoke: "2026-03-01" },
      { id: "04235d44-521b-402c-98ba-adb51f0b423d", name: "raffaele dubai",   lastSpoke: "2026-03-01" },
      { id: "5c5ea909-fbe8-49a4-a794-70dd6ca75486", name: "czuwak",           lastSpoke: "2026-03-01" },
      { id: "386b6d3f-0457-40aa-ba46-90e649305f63", name: "grillo",           lastSpoke: "2026-03-01" },
      { id: "1523f35b-c149-4b4d-9c4b-5ca8bdb56e88", name: "bartone",          lastSpoke: "2026-03-01" },
      { id: "c366e2f9-c8f0-470c-bda6-157b057dc72b", name: "serra",            lastSpoke: "2026-03-01" },
      { id: "224814e9-850a-445e-bc07-dc0a41fd7757", name: "amico gius",       lastSpoke: "2026-03-01" },
      { id: "2e69f624-6da4-40c4-a244-68af4624b2e4", name: "socio",            lastSpoke: "2026-03-01" },
      { id: "f2d7d4be-896d-4e10-9e2f-a1dc5e0a7a39", name: "bonaccorso",       lastSpoke: "2026-03-01" },
      { id: "2d69fc6a-9426-4aba-8194-a0ffaf565a8e", name: "castelbuono",      lastSpoke: "2026-03-01" },
      { id: "ef7decf9-5d83-4853-b675-a5a2501b59dc", name: "rabih khuri",      lastSpoke: "2026-03-01" },
    ]);
    console.log("[seed] Inserted friends");
  }

  // ── TDL Tasks ─────────────────────────────────────────────────────────────
  const existingTdl = await db.select().from(tdlTasks);
  if (existingTdl.length === 0) {
    await db.insert(tdlTasks).values([
      { id: "5146692b-376c-473d-8d40-4d7b5afe6eab", title: "ticket",                      priority: 1, done: false },
      { id: "a33fc909-e466-4e34-a9b3-7db24ce57024", title: "valli",                       priority: 1, done: false },
      { id: "f79fe617-3778-45af-94f7-8c1b91f47ec9", title: "EE ID card renew",            priority: 1, done: false },
      { id: "90da9555-ef45-4509-937d-1661031ea968", title: "PAY SUNNY",                   priority: 1, done: false },
      { id: "5c710435-f7b0-4d03-932a-6cdf6d92b44b", title: "FTA TAX",                    priority: 2, done: false },
      { id: "03b447fd-08ba-415e-beb8-47600866ed73", title: "Camicia nera e giacca Dubai", priority: 3, done: false },
    ]);
    console.log("[seed] Inserted TDL tasks");
  }

  // ── Places ────────────────────────────────────────────────────────────────
  const existingPlaces = await db.select().from(places);
  if (existingPlaces.length === 0) {
    await db.insert(places).values([
      { name: "Dubai" },
      { name: "Estonia" },
      { name: "France" },
      { name: "Italy" },
      { name: "Romania" },
      { name: "Russia" },
      { name: "Thailand" },
      { name: "UK" },
    ]);
    console.log("[seed] Inserted places");
  }

  // ── Packing Lists ─────────────────────────────────────────────────────────
  const existingPackingLists = await db.select().from(packingLists);
  if (existingPackingLists.length === 0) {
    const lists = await db.insert(packingLists).values([
      { id: "pl-cenate-checkout", name: "Cenate: Check Out" },
      { id: "pl-cenate-checkin",  name: "Cenate: Check In" },
      { id: "pl-trolley-work",    name: "Trolley: Work" },
      { id: "pl-trolley-summer",  name: "Trolley: Summer" },
      { id: "pl-romania-checkout",name: "Romania: Check Out" },
      { id: "pl-romania-checkin", name: "Romania: Check In" },
    ]).returning();

    await db.insert(packingItems).values([
      // ── Cenate Check Out ──────────────────────────────────────────────────
      { listId: "pl-cenate-checkout", category: "Security & Access", name: "Close big gate with two locks, put keys in limonaia" },
      { listId: "pl-cenate-checkout", category: "Security & Access", name: "Close small door of hangar" },
      { listId: "pl-cenate-checkout", category: "Security & Access", name: "Close blindata hangar and workshop" },
      { listId: "pl-cenate-checkout", category: "Security & Access", name: "Put doors and motion sensors in limonaia, garage, living, underground" },
      { listId: "pl-cenate-checkout", category: "Security & Access", name: "Put all in veranda technical room, lock doors, put keys in limonaia" },
      { listId: "pl-cenate-checkout", category: "Security & Access", name: "Close Portoncino floor 1, Check windows (all closed, especially floor -1)" },
      { listId: "pl-cenate-checkout", category: "Security & Access", name: "Put light in stairs against thieves" },
      { listId: "pl-cenate-checkout", category: "Water & Pool", name: "Close water: lever 8 in box underground and valve for outside pipes (then empty pipes)" },
      { listId: "pl-cenate-checkout", category: "Water & Pool", name: "Empty all pipe outside (apri rubinetti, dopo aver chiuso N8)" },
      { listId: "pl-cenate-checkout", category: "Water & Pool", name: "Cover pool and place on top sausages to block, Add chlorine to pool" },
      { listId: "pl-cenate-checkout", category: "Water & Pool", name: "Activate bubbles to empty all pipes from dirt, empty jacuzzi, cover with green sheet" },
      { listId: "pl-cenate-checkout", category: "Water & Pool", name: "Stacca spina a addolcitore" },
      { listId: "pl-cenate-checkout", category: "Water & Pool", name: "Faucet of outside bathroom (in hangar)" },
      { listId: "pl-cenate-checkout", category: "Electricity & Systems", name: "Switch AC to warm-up (underground technical room, ground floor entrance, 1st floor cabina armadio – switch to winter and pump)" },
      { listId: "pl-cenate-checkout", category: "Electricity & Systems", name: "Switch off all lights, close windows underground" },
      { listId: "pl-cenate-checkout", category: "Electricity & Systems", name: "Switch off veranda main switches" },
      { listId: "pl-cenate-checkout", category: "Electricity & Systems", name: "Check water sensor batteries" },
      { listId: "pl-cenate-checkout", category: "Cars & Equipment", name: "Close 2 boxes with cars inside + unplug and charge batteries" },
      { listId: "pl-cenate-checkout", category: "Cars & Equipment", name: "Keep mower batteries inside home on charge" },
      { listId: "pl-cenate-checkout", category: "Cars & Equipment", name: "Empty petrol from lawnmower (keep engine on until used up)" },
      { listId: "pl-cenate-checkout", category: "Cars & Equipment", name: "Freeze car insurance" },
      { listId: "pl-cenate-checkout", category: "House & Garden", name: "Cut grass, Bring in lemons" },
      { listId: "pl-cenate-checkout", category: "House & Garden", name: "Svuota imp. Zanzare con compressore, turn off. Empty tank sauna se c'è acqua" },
      { listId: "pl-cenate-checkout", category: "House & Garden", name: "Turn on both driers 1F, put silica gel in each wardrobe" },
      { listId: "pl-cenate-checkout", category: "House & Garden", name: "Throw humid, empty sinkerator, empty fridge, empty jars (onions, garlic...), paper/plastic" },
      { listId: "pl-cenate-checkout", category: "Valuables & Safety", name: "Put watches, money, car keys and hardisk in safe 1-2" },
      { listId: "pl-cenate-checkout", category: "Valuables & Safety", name: "Close gas near entrance and behind kitchen, close water" },

      // ── Cenate Check In ───────────────────────────────────────────────────
      { listId: "pl-cenate-checkin", category: null, name: "Call Antonina" },
      { listId: "pl-cenate-checkin", category: null, name: "Insure back cars, check tagliando biannuale, telepass" },
      { listId: "pl-cenate-checkin", category: null, name: "Pay Wind SIM" },
      { listId: "pl-cenate-checkin", category: null, name: "Open safe, take car keys, veranda locks of ain gate" },
      { listId: "pl-cenate-checkin", category: null, name: "Open water and gas" },
      { listId: "pl-cenate-checkin", category: null, name: "Open garages, charge car, open big gate" },
      { listId: "pl-cenate-checkin", category: null, name: "Pool: empty keeping pump on, 180kg salt, turn on pump, se alghe 750g dichlore, PH 7.2-7.7, 2kg PH- to decrease by 0.5 PH, REDOX 650-750mv; Jacuzzi: water +10g antialghe +antifloculante +anticalcare, 3 bromo, PH 7.2-7.6, clean filter, alcalanita 80-120ppm, TDS <1500, conduttività 800-2000 microsec/cm" },
      { listId: "pl-cenate-checkin", category: null, name: "Test colesterolo" },
      { listId: "pl-cenate-checkin", category: null, name: "Take cash from ATM" },

      // ── Trolley: Work ─────────────────────────────────────────────────────
      { listId: "pl-trolley-work", category: "Documents", name: "Passport, boarding pass, hotel booking, Entry VISA, Book Taxi" },
      { listId: "pl-trolley-work", category: "Electronics", name: "PC + CHARGER + mouse" },
      { listId: "pl-trolley-work", category: "Electronics", name: "iPhone + CHARGER + earpod" },
      { listId: "pl-trolley-work", category: "Electronics", name: "Glasses (work)" },
      { listId: "pl-trolley-work", category: "Electronics", name: "Powerbank" },
      { listId: "pl-trolley-work", category: "Electronics", name: "USB KEY" },
      { listId: "pl-trolley-work", category: "Electronics", name: "BOSE noise cancel" },
      { listId: "pl-trolley-work", category: "Electronics", name: "PLUG ADAPTER (UK, US)" },
      { listId: "pl-trolley-work", category: "Keys & Cash", name: "CENATE entry and gate keys" },
      { listId: "pl-trolley-work", category: "Keys & Cash", name: "Revolut and B4bank cards, 200 EUR cash" },
      { listId: "pl-trolley-work", category: "Keys & Cash", name: "Business cards" },
      { listId: "pl-trolley-work", category: "Keys & Cash", name: "Watch" },
      { listId: "pl-trolley-work", category: "Clothes", name: "Scarpe lavoro" },
      { listId: "pl-trolley-work", category: "Clothes", name: "2 shirts (in case of spill)" },
      { listId: "pl-trolley-work", category: "Clothes", name: "Abito, cintura, (tie), 240h" },
      { listId: "pl-trolley-work", category: "Clothes", name: "Dress: 1 white t-shirt, 1 slip, 2 blue socks, 1 polo, 1 t-shirt, 1 white socks, shorts" },
      { listId: "pl-trolley-work", category: "Clothes", name: "Sleeping t-shirt long sleeve" },
      { listId: "pl-trolley-work", category: "Clothes", name: "Sneakers and gym outfit" },
      { listId: "pl-trolley-work", category: "Clothes", name: "GYM: T-shirt, pantaloncini, white socks, shoes" },
      { listId: "pl-trolley-work", category: "Clothes", name: "Sunglasses, cap, umbrella / k way" },
      { listId: "pl-trolley-work", category: "Clothes", name: "SWIMSUIT (if hotel sauna)" },
      { listId: "pl-trolley-work", category: "Clothes", name: "WATER BOTTLE" },
      { listId: "pl-trolley-work", category: "Clothes", name: "WINTER: scarf, hat, gloves" },
      { listId: "pl-trolley-work", category: "Toiletries", name: "Igiene: rasoio, EYE DROPS, taglia unghie, shampoo, toothpaste, cream face, toothbrush, cuffia" },
      { listId: "pl-trolley-work", category: "Stationery", name: "Quaderno, 2 penne" },
      { listId: "pl-trolley-work", category: "Optional", name: "Driving licence, iPhone holder for car, music loudspeaker" },

      // ── Trolley: Summer ───────────────────────────────────────────────────
      { listId: "pl-trolley-summer", category: "Documents & Travel", name: "Passport + photo" },
      { listId: "pl-trolley-summer", category: "Documents & Travel", name: "VISA + photocopy" },
      { listId: "pl-trolley-summer", category: "Documents & Travel", name: "Hotel confirmation (print for border check)" },
      { listId: "pl-trolley-summer", category: "Documents & Travel", name: "Driving license" },
      { listId: "pl-trolley-summer", category: "Documents & Travel", name: "Health insurance card (for US)" },
      { listId: "pl-trolley-summer", category: "Documents & Travel", name: "Credit card (for car rental)" },
      { listId: "pl-trolley-summer", category: "Documents & Travel", name: "Cash (EUR/USD)" },
      { listId: "pl-trolley-summer", category: "Documents & Travel", name: "CENATE entry and gate keys" },
      { listId: "pl-trolley-summer", category: "Electronics & Gadgets", name: "PC + charger" },
      { listId: "pl-trolley-summer", category: "Electronics & Gadgets", name: "iPhone + charger" },
      { listId: "pl-trolley-summer", category: "Electronics & Gadgets", name: "iPad + charger" },
      { listId: "pl-trolley-summer", category: "Electronics & Gadgets", name: "Camera Nikon + charger + empty flash cards" },
      { listId: "pl-trolley-summer", category: "Electronics & Gadgets", name: "USB adaptor for car charger" },
      { listId: "pl-trolley-summer", category: "Electronics & Gadgets", name: "Voltage converter / adaptor" },
      { listId: "pl-trolley-summer", category: "Electronics & Gadgets", name: "BOSE noise-cancelling headphones" },
      { listId: "pl-trolley-summer", category: "Electronics & Gadgets", name: "Loudspeaker" },
      { listId: "pl-trolley-summer", category: "Electronics & Gadgets", name: "Torch / bicycle light for night" },
      { listId: "pl-trolley-summer", category: "Toiletries & Health", name: "Toothbrush, toothpaste, deodorant, shampoo + conditioner, razor + nail cutter, ear drops + eye drops, face cream + disinfectant gel, floss, lip balm" },
      { listId: "pl-trolley-summer", category: "Toiletries & Health", name: "Tissues, mosquito spray + after-bite spray, sun cream (pre and post sun), medicine kit (headache, flu, personal meds)" },
      { listId: "pl-trolley-summer", category: "Clothes & Shoes", name: "Beach & Sport: 2 swimsuits, slippers / flip-flops, band for eyewear, gloves + shoes for windsurf, sneakers, workout outfit (T-shirt + shorts + socks)" },
      { listId: "pl-trolley-summer", category: "Clothes & Shoes", name: "Casual & Daywear: 2 slips, 2 white T-shirts, socks (white & blue), polo shirt, lino trousers, jeans, shorts, walking shoes" },
      { listId: "pl-trolley-summer", category: "Clothes & Shoes", name: "Evening & Sleepwear: 2 long-sleeved shirts, jacket + sweater, sweater with zip, sleeping T-shirt (long sleeve)" },
      { listId: "pl-trolley-summer", category: "Beach & Outdoor", name: "Sunglasses + case, sun hat / cap, beach bag, pareo, towel, underwater glasses / mask, snorkeling gear, mosquito net, sea-inflatable bed, lighter (for BBQ)" },
      { listId: "pl-trolley-summer", category: "Accessories & Misc.", name: "Notebook + 2 pens" },
      { listId: "pl-trolley-summer", category: "Accessories & Misc.", name: "Books" },
      { listId: "pl-trolley-summer", category: "Accessories & Misc.", name: "Backpack" },
      { listId: "pl-trolley-summer", category: "Accessories & Misc.", name: "Umbrella" },
      { listId: "pl-trolley-summer", category: "Optional", name: "Elastic bands / fabric strip (20cm), Swiss knife, screwdriver for bikes, scissors + tape, small bottle for washing hands, plastic bags (normal + sealable), Tupperware for lunch, belt money / money belt, lock and chain" },
      { listId: "pl-trolley-summer", category: "Optional", name: "Sewing kit, pinzette per ricci di mare" },

      // ── Romania Check Out ─────────────────────────────────────────────────
      { listId: "pl-romania-checkout", category: null, name: "Disconnect car battery" },
      { listId: "pl-romania-checkout", category: null, name: "Throw garbage" },
      { listId: "pl-romania-checkout", category: null, name: "Close electricity, leave fridge open" },
      { listId: "pl-romania-checkout", category: null, name: "Turn off heaters" },
      { listId: "pl-romania-checkout", category: null, name: "Close gas outside" },
      { listId: "pl-romania-checkout", category: null, name: "Cover sofa" },
      { listId: "pl-romania-checkout", category: null, name: "NB. Buy chiavi inglesi to disconnect battery Audi" },

      // ── Romania Check In ──────────────────────────────────────────────────
      { listId: "pl-romania-checkin", category: null, name: "Ask cleaner to hover all, clean dust all surfaces, wash sheets-pillow, open windows" },
      { listId: "pl-romania-checkin", category: null, name: "Bring key door, key car, keys storage" },
      { listId: "pl-romania-checkin", category: null, name: "Pay car insurance, check ITP" },
      { listId: "pl-romania-checkin", category: null, name: "Gas, electricity" },
      { listId: "pl-romania-checkin", category: null, name: "Pay Orange SIM (cu optiuni)" },
      { listId: "pl-romania-checkin", category: null, name: "Wash 70c sheets" },
      { listId: "pl-romania-checkin", category: null, name: "Reconnect Audi battery" },
    ]);
    console.log("[seed] Inserted packing lists and items");
  }

  // ── Data patches (run always, idempotent) ──────────────────────────────────
  // Add "Entry Card" task for Thailand with passport/visa note if not present
  const { eq, and, isNull } = await import("drizzle-orm");
  const entryCardExists = await db.select().from(tasks).where(
    and(eq(tasks.title, "Entry Card"), eq(tasks.destinationId, "52edfcc6-7149-4ad6-9fa1-f5dc8dacc0b2"))
  );
  if (entryCardExists.length === 0) {
    await db.insert(tasks).values({
      id: "b1e27c4a-9f3d-4e8b-a2f1-c0d5e6f7a8b9",
      title: "Entry Card",
      destinationId: "52edfcc6-7149-4ad6-9fa1-f5dc8dacc0b2",
      isGlobal: false,
      advanceDays: 30,
      notes: "Passport: YB8762326\nExp: 22/6/2032\nVisa: NB335/68",
    });
    console.log("[seed] Inserted Entry Card task for Thailand");
  }
}
