import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, db } from "./storage";
import { insertDestinationSchema, insertTaskSchema, insertTripSchema, insertTripTaskSchema, insertDeadlineSchema, insertDeadlineCategorySchema, insertTdlTaskSchema, insertFriendSchema, insertPlaceSchema, insertPackingListSchema, insertPackingItemSchema, type InsertPackingItem } from "@shared/schema";
import { deadlines, deadlineCategories, destinations, tasks, trips, tripTasks, tdlTasks } from "@shared/schema";
import { sql } from "drizzle-orm";

async function applyMigrations() {
  await db.execute(sql`UPDATE deadlines SET reminder_days_before = 30 WHERE reminder_days_before IS NULL`);
}

// ── Weather cache ──────────────────────────────────────────────────────────
const WEATHER_CITIES = [
  { name: "Bergamo", country: "Italy",   lat: 45.6983, lon: 9.6773  },
  { name: "Bucharest", country: "Romania", lat: 44.4268, lon: 26.1025 },
  { name: "Paris",    country: "France",  lat: 48.8566, lon: 2.3522  },
  { name: "Phuket",   country: "Thailand", lat: 7.8804, lon: 98.3923 },
];

let weatherCache: { data: object; validUntil: number } | null = null;

function next7AM(): number {
  const now = new Date();
  const t7 = new Date(now);
  t7.setHours(7, 0, 0, 0);
  if (now >= t7) t7.setDate(t7.getDate() + 1);
  return t7.getTime();
}

async function fetchWeather() {
  const results = await Promise.all(
    WEATHER_CITIES.map(async (city) => {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1`;
      const res = await fetch(url);
      const json = await res.json() as { daily?: { temperature_2m_max?: number[]; temperature_2m_min?: number[] } };
      return {
        name: city.name,
        country: city.country,
        max: json.daily?.temperature_2m_max?.[0] ?? null,
        min: json.daily?.temperature_2m_min?.[0] ?? null,
      };
    })
  );
  weatherCache = { data: results, validUntil: next7AM() };
  return results;
}

// ── Stock cache ────────────────────────────────────────────────────────────
const STOCKS = [
  { symbol: "MEUD.PA", name: "MEUD", currency: "€" },
  { symbol: "%5EGSPC", name: "S&P 500", currency: "$" },
  { symbol: "EXUS.L", name: "EXUS", currency: "$" },
];

let stockCache: { data: object; validUntil: number } | null = null;

async function fetchStocks() {
  const results = await Promise.all(
    STOCKS.map(async (s) => {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${s.symbol}?interval=1d&range=1d`;
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
      const json = await res.json() as { chart?: { result?: Array<{ meta?: { regularMarketPrice?: number; chartPreviousClose?: number } }> } };
      const meta = json.chart?.result?.[0]?.meta;
      const price = meta?.regularMarketPrice ?? null;
      const prevClose = meta?.chartPreviousClose ?? null;
      const changePercent = (price != null && prevClose != null && prevClose !== 0)
        ? ((price - prevClose) / prevClose) * 100
        : null;
      return {
        symbol: s.symbol,
        name: s.name,
        currency: s.currency,
        price,
        changePercent,
      };
    })
  );
  stockCache = { data: results, validUntil: next7AM() };
  return results;
}

// ── Forex cache ─────────────────────────────────────────────────────────────
let forexCache: { data: object; validUntil: number } | null = null;

async function fetchForex() {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const lookback = new Date(today);
  lookback.setDate(today.getDate() - 5);
  const fromStr = lookback.toISOString().split("T")[0];

  const [latestRes, seriesRes] = await Promise.all([
    fetch(`https://api.frankfurter.app/latest?from=EUR&to=USD,THB`, { headers: { "User-Agent": "Mozilla/5.0" } }),
    fetch(`https://api.frankfurter.app/${fromStr}..${todayStr}?from=EUR&to=USD,THB`, { headers: { "User-Agent": "Mozilla/5.0" } }),
  ]);
  const [latestJson, seriesJson] = await Promise.all([
    latestRes.json() as Promise<{ rates?: Record<string, number> }>,
    seriesRes.json() as Promise<{ rates?: Record<string, Record<string, number>> }>,
  ]);

  const latestRates = latestJson.rates ?? {};
  const seriesDates = Object.keys(seriesJson.rates ?? {}).sort();
  const prevDate = seriesDates.length >= 2 ? seriesDates[seriesDates.length - 2] : null;
  const prevRates = prevDate ? (seriesJson.rates?.[prevDate] ?? {}) : null;

  const pairs = [
    { key: "USD", name: "EUR/USD" },
    { key: "THB", name: "THB/EUR" },
  ];
  const results = pairs.map((p) => {
    const rate = latestRates[p.key] ?? null;
    const prevRate = prevRates ? (prevRates[p.key] ?? null) : null;
    const changePercent = rate != null && prevRate != null && prevRate !== 0
      ? ((rate - prevRate) / prevRate) * 100
      : null;
    return { name: p.name, rate, changePercent };
  });
  forexCache = { data: results, validUntil: next7AM() };
  return results;
}

// ── Macro cache (VIX, Oil, rates) ───────────────────────────────────────────
const MACRO_YF = [
  { symbol: "CL=F",   name: "Oil (WTI)", currency: "$",  type: "commodity" },
  { symbol: "%5EVIX", name: "VIX",       currency: "",   type: "index"     },
  { symbol: "%5ETNX", name: "US 10Y",    currency: "%",  type: "rate"      },
];

let macroCache: { data: object; validUntil: number } | null = null;

async function fetchMacro() {
  const yfItems = await Promise.all(
    MACRO_YF.map(async (item) => {
      try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${item.symbol}?interval=1d&range=1d`;
        const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
        const json = await res.json() as { chart?: { result?: Array<{ meta?: { regularMarketPrice?: number; chartPreviousClose?: number } }> } };
        const meta = json.chart?.result?.[0]?.meta;
        const value = meta?.regularMarketPrice ?? null;
        const prev = meta?.chartPreviousClose ?? null;
        const changePercent = value != null && prev != null && prev !== 0 ? ((value - prev) / prev) * 100 : null;
        return { name: item.name, value, currency: item.currency, changePercent, type: item.type };
      } catch {
        return { name: item.name, value: null as number | null, currency: item.currency, changePercent: null as number | null, type: item.type };
      }
    })
  );

  // Helper: scan backwards through FRED CSV for last real value (inline, before fredLastValue is defined)
  function scanLastFred(csv: string): number | null {
    const lines = csv.trim().split("\n").filter(l => l.includes(","));
    for (let i = lines.length - 1; i >= 1; i--) {
      const val = lines[i].split(",")[1]?.trim();
      if (val && val !== ".") return parseFloat(val);
    }
    return null;
  }

  // Fed Funds Rate from FRED
  let fedRate: number | null = null;
  try {
    const res = await fetch("https://fred.stlouisfed.org/graph/fredgraph.csv?id=FEDFUNDS", { headers: { "User-Agent": "Mozilla/5.0" } });
    fedRate = scanLastFred(await res.text());
  } catch { /* silent */ }

  // ECB Deposit Facility Rate from FRED
  let ecbRate: number | null = null;
  try {
    const res = await fetch("https://fred.stlouisfed.org/graph/fredgraph.csv?id=ECBDFR", { headers: { "User-Agent": "Mozilla/5.0" } });
    ecbRate = scanLastFred(await res.text());
  } catch { /* silent */ }

  // Returns the last non-null numeric value from a FRED CSV series
  async function fredLastValue(seriesId: string): Promise<number | null> {
    try {
      const r = await fetch(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${seriesId}`, { headers: { "User-Agent": "Mozilla/5.0" } });
      const csv = await r.text();
      const lines = csv.trim().split("\n").filter(l => l.includes(","));
      for (let i = lines.length - 1; i >= 1; i--) {
        const val = lines[i].split(",")[1]?.trim();
        if (val && val !== ".") return parseFloat(val);
      }
      return null;
    } catch { return null; }
  }

  // US CPI YoY from Bureau of Labor Statistics (official source)
  async function fetchUSCPI(): Promise<number | null> {
    try {
      const r = await fetch("https://api.bls.gov/publicAPI/v1/timeseries/data/CUUR0000SA0", { headers: { "User-Agent": "Mozilla/5.0" } });
      const json = await r.json() as { Results?: { series?: Array<{ data?: Array<{ year: string; period: string; value: string }> }> } };
      const data = (json.Results?.series?.[0]?.data ?? [])
        .filter((d: { period: string }) => d.period !== "M13")
        .sort((a: { year: string; period: string }, b: { year: string; period: string }) => {
          const aD = parseInt(a.year) * 12 + parseInt(a.period.replace("M", ""));
          const bD = parseInt(b.year) * 12 + parseInt(b.period.replace("M", ""));
          return bD - aD;
        });
      if (data.length < 13) return null;
      const cur = parseFloat(data[0].value), prev = parseFloat(data[12].value);
      if (isNaN(cur) || isNaN(prev) || prev === 0) return null;
      return ((cur / prev) - 1) * 100;
    } catch { return null; }
  }

  // Eurozone HICP YoY annual rate directly from ECB Data Portal
  async function fetchEZCPI(): Promise<number | null> {
    try {
      const r = await fetch(
        "https://data-api.ecb.europa.eu/service/data/ICP/M.U2.N.000000.4.ANR?lastNObservations=1&format=jsondata",
        { headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" } }
      );
      const json = await r.json() as { dataSets?: Array<{ series?: Record<string, { observations?: Record<string, number[]> }> }> };
      const series = json.dataSets?.[0]?.series ?? {};
      const seriesKey = Object.keys(series)[0];
      const obs = series[seriesKey]?.observations ?? {};
      const obsKey = Object.keys(obs).sort().pop();
      const val = obsKey ? obs[obsKey]?.[0] : undefined;
      return (val != null && !isNaN(val)) ? val : null;
    } catch { return null; }
  }

  const [usCpi, ezCpi, usUnemp, euUnemp] = await Promise.all([
    fetchUSCPI(),                          // BLS official US CPI YoY %
    fetchEZCPI(),                          // ECB official Eurozone HICP YoY %
    fredLastValue("UNRATE"),               // US Unemployment %
    fredLastValue("LRHUTTTTEZM156S"),      // Euro Area Unemployment %
  ]);

  const results = [
    ...yfItems,
    { name: "Fed Rate",   value: fedRate, currency: "%", changePercent: null, type: "rate" },
    { name: "ECB Rate",   value: ecbRate, currency: "%", changePercent: null, type: "rate" },
    { name: "US CPI",     value: usCpi,   currency: "%", changePercent: null, type: "indicator" },
    { name: "EZ CPI",     value: ezCpi,   currency: "%", changePercent: null, type: "indicator" },
    { name: "US Unemp",   value: usUnemp, currency: "%", changePercent: null, type: "indicator" },
    { name: "EU Unemp",   value: euUnemp, currency: "%", changePercent: null, type: "indicator" },
  ];
  macroCache = { data: results, validUntil: next7AM() };
  return results;
}

// ── Geopolitical alerts cache ────────────────────────────────────────────────
let alertsCache: { data: object; validUntil: number } | null = null;

async function fetchAlerts() {
  try {
    const res = await fetch("https://feeds.bbci.co.uk/news/world/rss.xml", {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    const xml = await res.text();
    const itemBlocks = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
    const alerts = itemBlocks.slice(0, 6).map((block) => {
      const title = (block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) ?? block.match(/<title>(.*?)<\/title>/))?.[1]?.trim() ?? "—";
      const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/)?.[1]?.trim() ?? null;
      return { title, pubDate };
    });
    alertsCache = { data: alerts, validUntil: next7AM() };
    return alerts;
  } catch {
    alertsCache = { data: [], validUntil: next7AM() };
    return [];
  }
}

const DEFAULT_CATEGORIES = [
  "car insurance", "car inspection", "car tax", "company filing",
  "insurance", "property insurance", "property tax", "tax", "utility admin", "waste tax",
];

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  const { seedDatabase } = await import("./seed");
  await seedDatabase();
  await applyMigrations();

  // Destinations
  app.get("/api/destinations", async (_req, res) => {
    const dests = await storage.getDestinations();
    res.json(dests);
  });

  app.get("/api/destinations/:id", async (req, res) => {
    const dest = await storage.getDestination(req.params.id);
    if (!dest) return res.status(404).json({ message: "Not found" });
    res.json(dest);
  });

  app.post("/api/destinations", async (req, res) => {
    const parsed = insertDestinationSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const dest = await storage.createDestination(parsed.data);
    res.status(201).json(dest);
  });

  app.patch("/api/destinations/:id", async (req, res) => {
    const parsed = insertDestinationSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const dest = await storage.updateDestination(req.params.id, parsed.data);
    if (!dest) return res.status(404).json({ message: "Not found" });
    res.json(dest);
  });

  app.delete("/api/destinations/:id", async (req, res) => {
    await storage.deleteDestination(req.params.id);
    res.status(204).end();
  });

  // Tasks
  app.get("/api/tasks", async (_req, res) => {
    const allTasks = await storage.getTasks();
    res.json(allTasks);
  });

  app.get("/api/tasks/destination/:destinationId", async (req, res) => {
    const tasks = await storage.getTasksByDestination(req.params.destinationId);
    res.json(tasks);
  });

  app.get("/api/tasks/global", async (_req, res) => {
    const tasks = await storage.getGlobalTasks();
    res.json(tasks);
  });

  app.post("/api/tasks", async (req, res) => {
    const parsed = insertTaskSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const task = await storage.createTask(parsed.data);
    res.status(201).json(task);
  });

  app.patch("/api/tasks/:id", async (req, res) => {
    const parsed = insertTaskSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const task = await storage.updateTask(req.params.id, parsed.data);
    if (!task) return res.status(404).json({ message: "Not found" });
    res.json(task);
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    await storage.deleteTask(req.params.id);
    res.status(204).end();
  });

  // Trips
  app.get("/api/trips", async (_req, res) => {
    const allTrips = await storage.getTrips();
    res.json(allTrips);
  });

  app.get("/api/trips/:id", async (req, res) => {
    const trip = await storage.getTrip(req.params.id);
    if (!trip) return res.status(404).json({ message: "Not found" });
    res.json(trip);
  });

  app.post("/api/trips", async (req, res) => {
    const parsed = insertTripSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const trip = await storage.createTrip(parsed.data);

    // Auto-generate trip tasks
    const destinationTasks = await storage.getTasksByDestination(parsed.data.destinationId);
    const globalTasks = await storage.getGlobalTasks();
    const allTasks = [...destinationTasks, ...globalTasks];
    const arrivalDate = new Date(parsed.data.arrivalDate);

    for (const task of allTasks) {
      // Check seasonal applicability
      if (task.seasonStart !== null && task.seasonEnd !== null) {
        const arrivalMonth = arrivalDate.getMonth() + 1;
        if (task.seasonStart <= task.seasonEnd) {
          if (arrivalMonth < task.seasonStart || arrivalMonth > task.seasonEnd) continue;
        } else {
          if (arrivalMonth < task.seasonStart && arrivalMonth > task.seasonEnd) continue;
        }
      }

      const dueDate = new Date(arrivalDate);
      dueDate.setDate(dueDate.getDate() - task.advanceDays);

      await storage.createTripTask({
        tripId: trip.id,
        taskId: task.id,
        completed: false,
        dueDate: dueDate.toISOString().split("T")[0],
      });
    }

    res.status(201).json(trip);
  });

  app.patch("/api/trips/:id", async (req, res) => {
    const parsed = insertTripSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const trip = await storage.updateTrip(req.params.id, parsed.data);
    if (!trip) return res.status(404).json({ message: "Not found" });
    res.json(trip);
  });

  app.delete("/api/trips/:id", async (req, res) => {
    await storage.deleteTripTasksByTrip(req.params.id);
    await storage.deleteTrip(req.params.id);
    res.status(204).end();
  });

  // Trip Tasks
  app.get("/api/trips/:tripId/tasks", async (req, res) => {
    const tripTaskList = await storage.getTripTasks(req.params.tripId);
    // Enrich with task details
    const allTasks = await storage.getTasks();
    const taskMap = new Map(allTasks.map(t => [t.id, t]));
    const enriched = tripTaskList.map(tt => ({
      ...tt,
      task: taskMap.get(tt.taskId),
    }));
    res.json(enriched);
  });

  app.get("/api/actionable-tasks", async (req, res) => {
    const allTrips = await storage.getTrips();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcomingTrips = allTrips.filter((t) => {
      const arrival = new Date(t.arrivalDate + "T00:00:00");
      return arrival >= today;
    });

    const allTasks = await storage.getTasks();
    const taskMap = new Map(allTasks.map((t) => [t.id, t]));

    const result: any[] = [];
    for (const trip of upcomingTrips) {
      const tripTaskList = await storage.getTripTasks(trip.id);
      for (const tt of tripTaskList) {
        if (tt.completed) continue;
        if (!tt.dueDate) continue;
        const dueDate = new Date(tt.dueDate + "T00:00:00");
        if (dueDate <= today) {
          result.push({
            ...tt,
            task: taskMap.get(tt.taskId),
            trip,
          });
        }
      }
    }

    res.json(result);
  });

  app.patch("/api/trip-tasks/:id", async (req, res) => {
    const parsed = insertTripTaskSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const updated = await storage.updateTripTask(req.params.id, parsed.data);
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  });

  // Deadlines
  app.get("/api/deadlines", async (_req, res) => {
    const rows = await storage.getDeadlines();
    res.json(rows);
  });

  app.post("/api/deadlines", async (req, res) => {
    const parsed = insertDeadlineSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const created = await storage.createDeadline(parsed.data);
    res.status(201).json(created);
  });

  app.patch("/api/deadlines/:id", async (req, res) => {
    const parsed = insertDeadlineSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const updated = await storage.updateDeadline(req.params.id, parsed.data);
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  });

  app.delete("/api/deadlines/:id", async (req, res) => {
    await storage.deleteDeadline(req.params.id);
    res.status(204).send();
  });

  // Deadline Categories
  app.get("/api/deadline-categories", async (_req, res) => {
    let cats = await storage.getDeadlineCategories();
    if (cats.length === 0) {
      for (const name of DEFAULT_CATEGORIES) {
        await storage.createDeadlineCategory({ name });
      }
      cats = await storage.getDeadlineCategories();
    }
    res.json(cats);
  });

  app.post("/api/deadline-categories", async (req, res) => {
    const parsed = insertDeadlineCategorySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const created = await storage.createDeadlineCategory(parsed.data);
    res.status(201).json(created);
  });

  app.delete("/api/deadline-categories/:id", async (req, res) => {
    await storage.deleteDeadlineCategory(req.params.id);
    res.status(204).send();
  });

  // Friends
  app.get("/api/friends", async (_req, res) => {
    const rows = await storage.getFriends();
    res.json(rows);
  });

  app.post("/api/friends", async (req, res) => {
    const parsed = insertFriendSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const created = await storage.createFriend(parsed.data);
    res.status(201).json(created);
  });

  app.patch("/api/friends/:id", async (req, res) => {
    const parsed = insertFriendSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const updated = await storage.updateFriend(req.params.id, parsed.data);
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  });

  app.delete("/api/friends/:id", async (req, res) => {
    await storage.deleteFriend(req.params.id);
    res.status(204).send();
  });

  // Places
  app.get("/api/places", async (_req, res) => {
    const rows = await storage.getPlaces();
    res.json(rows);
  });

  app.post("/api/places", async (req, res) => {
    const parsed = insertPlaceSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const created = await storage.createPlace(parsed.data);
    res.status(201).json(created);
  });

  app.delete("/api/places/:id", async (req, res) => {
    await storage.deletePlace(req.params.id);
    res.status(204).send();
  });

  // ── Packing Lists ───────────────────────────────────────────────────────────
  app.get("/api/packing-lists", async (_req, res) => {
    res.json(await storage.getPackingLists());
  });

  app.post("/api/packing-lists", async (req, res) => {
    const parsed = insertPackingListSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    res.status(201).json(await storage.createPackingList(parsed.data));
  });

  app.delete("/api/packing-lists/:id", async (req, res) => {
    await storage.deletePackingItemsByList(req.params.id);
    await storage.deletePackingList(req.params.id);
    res.status(204).end();
  });

  app.get("/api/packing-lists/:listId/items", async (req, res) => {
    res.json(await storage.getPackingItems(req.params.listId));
  });

  app.post("/api/packing-lists/:listId/items", async (req, res) => {
    const parsed = insertPackingItemSchema.safeParse({ ...req.body, listId: req.params.listId });
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    res.status(201).json(await storage.createPackingItem(parsed.data));
  });

  app.post("/api/packing-lists/:listId/items/reorder", async (req, res) => {
    const { orderedIds } = req.body as { orderedIds: string[] };
    if (!Array.isArray(orderedIds)) return res.status(400).json({ message: "orderedIds must be an array" });
    await Promise.all(orderedIds.map((id, index) => storage.updatePackingItem(id, { sortOrder: index * 10 })));
    res.json({ ok: true });
  });

  app.post("/api/packing-lists/:listId/items/bulk", async (req, res) => {
    const { items } = req.body as { items: { name: string; category?: string | null }[] };
    if (!Array.isArray(items) || items.length === 0)
      return res.status(400).json({ message: "items must be a non-empty array" });
    const toInsert: InsertPackingItem[] = items.map((item) => ({
      name: item.name,
      category: item.category ?? null,
      listId: req.params.listId,
      packed: false,
    }));
    res.status(201).json(await storage.createPackingItemsBulk(toInsert));
  });

  app.patch("/api/packing-items/:id", async (req, res) => {
    const parsed = insertPackingItemSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const updated = await storage.updatePackingItem(req.params.id, parsed.data);
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  });

  app.delete("/api/packing-items/:id", async (req, res) => {
    await storage.deletePackingItem(req.params.id);
    res.status(204).end();
  });

  app.get("/api/weather", async (_req, res) => {
    try {
      if (weatherCache && Date.now() < weatherCache.validUntil) {
        return res.json(weatherCache.data);
      }
      const data = await fetchWeather();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.get("/api/stocks", async (_req, res) => {
    try {
      if (stockCache && Date.now() < stockCache.validUntil) {
        return res.json(stockCache.data);
      }
      const data = await fetchStocks();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.get("/api/forex", async (_req, res) => {
    try {
      if (forexCache && Date.now() < forexCache.validUntil) {
        return res.json(forexCache.data);
      }
      const data = await fetchForex();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.get("/api/macro", async (_req, res) => {
    try {
      if (macroCache && Date.now() < macroCache.validUntil) return res.json(macroCache.data);
      const data = await fetchMacro();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.get("/api/alerts", async (_req, res) => {
    try {
      if (alertsCache && Date.now() < alertsCache.validUntil) return res.json(alertsCache.data);
      const data = await fetchAlerts();
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  app.post("/api/send-test-email", async (_req, res) => {
    try {
      const { sendWeeklyDeadlinesEmail } = await import("./emailer");
      await sendWeeklyDeadlinesEmail();
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // TDL Tasks
  app.get("/api/tdl-tasks", async (_req, res) => {
    const tasks = await storage.getTdlTasks();
    res.json(tasks);
  });

  app.post("/api/tdl-tasks", async (req, res) => {
    const parsed = insertTdlTaskSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const created = await storage.createTdlTask(parsed.data);
    res.status(201).json(created);
  });

  app.patch("/api/tdl-tasks/:id", async (req, res) => {
    const parsed = insertTdlTaskSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });
    const updated = await storage.updateTdlTask(req.params.id, parsed.data);
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  });

  app.delete("/api/tdl-tasks/:id", async (_req, res) => {
    await storage.deleteTdlTask(_req.params.id);
    res.status(204).send();
  });

  app.post("/api/admin/force-reseed", async (_req, res) => {
    try {
      await db.delete(tripTasks);
      await db.delete(tdlTasks);
      await db.delete(trips);
      await db.delete(tasks);
      await db.delete(deadlines);
      await db.delete(deadlineCategories);
      await db.delete(destinations);
      const { seedDatabase } = await import("./seed");
      await seedDatabase();
      await applyMigrations();
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  return httpServer;
}
