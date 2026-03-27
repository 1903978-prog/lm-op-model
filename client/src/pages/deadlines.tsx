import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import type { Deadline, InsertDeadline, DeadlineCategory } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, CalendarClock, AlertTriangle, Clock, CalendarDays, CheckCircle2, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays, addYears, addMonths } from "date-fns";
import {
  MONTHS,
  FREQUENCIES,
  CATEGORIES,
  MonthYearPicker,
  DayMonthPicker,
  DayMonthYearPicker,
  DeadlineForm,
  type FormValues,
  emptyForm,
} from "@/components/deadline-form";

// ─── (constants and form imported from @/components/deadline-form) ─────────────

// ─── Date computation (ported from Python app) ───────────────────────────────

function computeNextDue(d: Deadline, today: Date): Date | null {
  const { frequency, day, month, year, lastDone } = d;

  // Multi-year frequencies: year is determined by lastDone + N years.
  // day/month (if set) pin the exact calendar date within that target year.
  if (lastDone && frequency && frequency !== "annual") {
    const base = new Date(lastDone);
    base.setHours(0, 0, 0, 0);
    let yearsToAdd = 1;
    if (frequency === "every_2_years") yearsToAdd = 2;
    else if (frequency === "every_3_years") yearsToAdd = 3;
    else if (frequency === "every_4_years") yearsToAdd = 4;
    const targetYear = addYears(base, yearsToAdd).getFullYear();
    if (day != null && month != null) {
      const due = new Date(targetYear, month - 1, day);
      due.setHours(0, 0, 0, 0);
      return due;
    }
    return addYears(base, yearsToAdd);
  }

  // Annual: use day/month anchored to stored year (or current year if none).
  if (day != null && month != null) {
    const anchorYear = year ?? today.getFullYear();
    let due = new Date(anchorYear, month - 1, day);
    due.setHours(0, 0, 0, 0);
    if (due < today) {
      due = new Date(today.getFullYear() + 1, month - 1, day);
      due.setHours(0, 0, 0, 0);
    }
    return due;
  }

  // Annual with only lastDone (no fixed day/month).
  if (lastDone) {
    const base = new Date(lastDone);
    base.setHours(0, 0, 0, 0);
    return addYears(base, 1);
  }

  return null;
}

type UrgencyLevel = "overdue" | "soon" | "medium" | "later" | "missing";

function urgencyLevel(daysLeft: number | null): UrgencyLevel {
  if (daysLeft === null) return "missing";
  if (daysLeft < 0) return "overdue";
  if (daysLeft <= 15) return "soon";
  if (daysLeft <= 45) return "medium";
  return "later";
}

// dark-compatible tile styles
const bucketStyles = {
  "7":  { border: "border-red-500/40",   bg: "bg-red-500/10",   badge: "bg-red-500 text-white",         dot: "bg-red-500",   label: "Next 7 days"  },
  "30": { border: "border-amber-400/40", bg: "bg-amber-500/10", badge: "bg-amber-400 text-white",        dot: "bg-amber-400", label: "Next 30 days" },
  "60": { border: "border-sky-400/40",   bg: "bg-sky-500/10",   badge: "bg-sky-500 text-white",          dot: "bg-sky-500",   label: "Next 60 days" },
  "90": { border: "border-muted/40",     bg: "bg-muted/10",     badge: "bg-muted-foreground text-white", dot: "bg-muted-foreground", label: "Next 90 days" },
} as const;

// ─── Overview tab ─────────────────────────────────────────────────────────────

type ComputedDeadline = Deadline & {
  nextDue: Date | null;
  daysLeft: number | null;
  urgency: UrgencyLevel;
};

function computeAll(deadlines: Deadline[]): ComputedDeadline[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return deadlines.map((d) => {
    const nextDue = computeNextDue(d, today);
    const daysLeft = nextDue ? differenceInDays(nextDue, today) : null;
    return { ...d, nextDue, daysLeft, urgency: urgencyLevel(daysLeft) };
  });
}

function DeadlineTile({ d, onSnooze, onViewNotes, onMarkDone }: {
  d: ComputedDeadline;
  onSnooze: (id: string) => void;
  onViewNotes: (name: string, notes: string) => void;
  onMarkDone: (d: ComputedDeadline) => void;
}) {
  const bucket = d.daysLeft! <= 7 ? "7" : d.daysLeft! <= 30 ? "30" : d.daysLeft! <= 60 ? "60" : "90";
  const style = bucketStyles[bucket as keyof typeof bucketStyles];
  return (
    <div
      className={`border rounded-lg p-2.5 flex flex-col gap-1.5 cursor-pointer hover:brightness-110 transition-all ${style.border} ${style.bg}`}
      data-testid={`upcoming-card-${d.id}`}
      onClick={() => onMarkDone(d)}
    >
      {/* Top row: name + badge */}
      <div className="flex items-start justify-between gap-1.5">
        <span className="font-semibold text-sm leading-snug text-foreground">{d.name}</span>
        <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${style.badge}`}>
          {d.daysLeft === 0 ? "Today" : `${d.daysLeft}d`}
        </span>
      </div>

      {/* Due date */}
      <div className="text-xs text-muted-foreground">
        {d.nextDue ? format(d.nextDue, "d MMM yyyy") : "—"}
      </div>

      {/* Category + country row */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {d.category && <span className="text-[10px] text-muted-foreground capitalize">{d.category}</span>}
        {d.country && <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">{d.country}</Badge>}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-auto pt-1 border-t border-white/5">
        {d.notes ? (
          <button onClick={(e) => { e.stopPropagation(); onViewNotes(d.name, d.notes!); }} className="text-primary/70 hover:text-primary transition-colors" title="View notes">
            <Info className="w-3.5 h-3.5" />
          </button>
        ) : <span className="w-3.5" />}
        <button onClick={(e) => { e.stopPropagation(); onSnooze(d.id); }} className="ml-auto text-muted-foreground hover:text-green-600 transition-colors" title="Snooze 6 months" data-testid={`button-snooze-${d.id}`}>
          <CheckCircle2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function BucketSection({ label, dot, items, onSnooze, onViewNotes, onMarkDone }: {
  label: string;
  dot: string;
  items: ComputedDeadline[];
  onSnooze: (id: string) => void;
  onViewNotes: (name: string, notes: string) => void;
  onMarkDone: (d: ComputedDeadline) => void;
}) {
  if (items.length === 0) return null;
  return (
    <section>
      <h2 className="text-sm font-semibold mb-2.5 flex items-center gap-2">
        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dot}`} />
        {label}
        <span className="text-xs font-normal text-muted-foreground">({items.length})</span>
      </h2>
      <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {items.map((d) => (
          <DeadlineTile key={d.id} d={d} onSnooze={onSnooze} onViewNotes={onViewNotes} onMarkDone={onMarkDone} />
        ))}
      </div>
    </section>
  );
}

function OverviewTab({ deadlines, onEdit, onDelete, onSnooze, onSave }: {
  deadlines: Deadline[];
  onEdit: (d: Deadline) => void;
  onDelete: (id: string) => void;
  onSnooze: (id: string) => void;
  onSave: (id: string, data: Partial<InsertDeadline>) => void;
}) {
  const [viewNotes, setViewNotes] = useState<{ name: string; notes: string } | null>(null);
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const [markDone, setMarkDone] = useState<{ d: ComputedDeadline; date: string } | null>(null);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const computed = computeAll(deadlines);

  const active = computed
    .filter((d) => {
      if (d.daysLeft === null || d.daysLeft < 0 || d.daysLeft > 90 || d.autoPayment) return false;
      if (d.snoozedUntil && new Date(d.snoozedUntil) > today) return false;
      return true;
    })
    .sort((a, b) => a.daysLeft! - b.daysLeft!);

  const bucket7  = active.filter((d) => d.daysLeft! <= 7);
  const bucket30 = active.filter((d) => d.daysLeft! > 7  && d.daysLeft! <= 30);
  const bucket60 = active.filter((d) => d.daysLeft! > 30 && d.daysLeft! <= 60);
  const bucket90 = active.filter((d) => d.daysLeft! > 60);

  const missing = computed
    .filter((d) => d.nextDue === null)
    .sort((a, b) => a.name.localeCompare(b.name));

  const all = [...computed].sort((a, b) => {
    if (a.nextDue === null && b.nextDue !== null) return 1;
    if (a.nextDue !== null && b.nextDue === null) return -1;
    if (a.nextDue && b.nextDue) return a.nextDue.getTime() - b.nextDue.getTime();
    return a.name.localeCompare(b.name);
  });

  return (
    <>
    <div className="space-y-6">
      {active.length === 0 && (
        <p className="text-sm text-muted-foreground">No deadlines in the next 90 days.</p>
      )}

      <BucketSection label="Next 7 days"  dot={bucketStyles["7"].dot}  items={bucket7}  onSnooze={onSnooze} onViewNotes={(n, t) => setViewNotes({ name: n, notes: t })} onMarkDone={(d) => setMarkDone({ d, date: todayStr })} />
      <BucketSection label="Next 30 days" dot={bucketStyles["30"].dot} items={bucket30} onSnooze={onSnooze} onViewNotes={(n, t) => setViewNotes({ name: n, notes: t })} onMarkDone={(d) => setMarkDone({ d, date: todayStr })} />
      <BucketSection label="Next 60 days" dot={bucketStyles["60"].dot} items={bucket60} onSnooze={onSnooze} onViewNotes={(n, t) => setViewNotes({ name: n, notes: t })} onMarkDone={(d) => setMarkDone({ d, date: todayStr })} />
      <BucketSection label="Next 90 days" dot={bucketStyles["90"].dot} items={bucket90} onSnooze={onSnooze} onViewNotes={(n, t) => setViewNotes({ name: n, notes: t })} onMarkDone={(d) => setMarkDone({ d, date: todayStr })} />

      {/* Missing dates */}
      {missing.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold mb-2.5 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-muted-foreground" />
            Missing date information
            <Badge variant="secondary" className="ml-1">{missing.length}</Badge>
          </h2>
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
                    <th className="text-left px-4 py-2 font-medium">Name</th>
                    <th className="text-left px-4 py-2 font-medium">Category</th>
                    <th className="text-left px-4 py-2 font-medium">Country</th>
                    <th className="text-left px-4 py-2 font-medium">Frequency</th>
                    <th className="text-left px-4 py-2 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {missing.map((d) => (
                    <tr key={d.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-2.5 font-medium">{d.name}</td>
                      <td className="px-4 py-2.5 text-muted-foreground capitalize">{d.category ?? "—"}</td>
                      <td className="px-4 py-2.5">
                        {d.country ? <Badge variant="secondary" className="text-xs">{d.country}</Badge> : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{d.frequency?.replace(/_/g, " ") ?? "—"}</td>
                      <td className="px-4 py-2.5 text-muted-foreground italic">{d.notes ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </section>
      )}

      {/* All items */}
      <section>
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-muted-foreground" />
          All tracked items
        </h2>
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
                  <th className="text-left px-4 py-2 font-medium">Name</th>
                  <th className="text-left px-4 py-2 font-medium">Next due</th>
                  <th className="text-left px-4 py-2 font-medium">Days left</th>
                  <th className="text-left px-4 py-2 font-medium">Category</th>
                  <th className="text-left px-4 py-2 font-medium">Country</th>
                  <th className="text-left px-4 py-2 font-medium">Frequency</th>
                </tr>
              </thead>
              <tbody>
                {all.map((d, idx) => {
                  const badgeCls = d.daysLeft === null ? "bg-muted text-muted-foreground"
                    : d.daysLeft < 0   ? "bg-destructive text-destructive-foreground"
                    : d.daysLeft <= 7  ? "bg-red-500 text-white"
                    : d.daysLeft <= 30 ? "bg-amber-400 text-white"
                    : d.daysLeft <= 60 ? "bg-sky-500 text-white"
                    : "bg-muted-foreground text-white";
                  return (
                    <tr
                      key={d.id}
                      className={`border-b last:border-0 hover:bg-muted/20 ${idx % 2 === 1 ? "bg-muted/5" : ""}`}
                      data-testid={`all-row-${d.id}`}
                    >
                      <td className="px-4 py-2.5 font-medium">{d.name}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {d.nextDue ? format(d.nextDue, "dd MMM yyyy") : <span className="italic">To confirm</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        {d.daysLeft !== null ? (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${badgeCls}`}>
                            {d.daysLeft < 0 ? `${Math.abs(d.daysLeft)}d overdue` : d.daysLeft === 0 ? "Today" : `${d.daysLeft}d`}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground capitalize">{d.category ?? "—"}</td>
                      <td className="px-4 py-2.5">
                        {d.country ? <Badge variant="secondary" className="text-xs">{d.country}</Badge> : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-muted-foreground">{d.frequency?.replace(/_/g, " ") ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </section>
    </div>

    <Dialog open={!!viewNotes} onOpenChange={(v) => { if (!v) setViewNotes(null); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="w-4 h-4 text-muted-foreground" />
            {viewNotes?.name}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{viewNotes?.notes}</p>
      </DialogContent>
    </Dialog>

    {/* Mark as done dialog */}
    <Dialog open={!!markDone} onOpenChange={(v) => { if (!v) setMarkDone(null); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            Mark as done
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm font-medium">{markDone?.d.name}</p>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Completion date</label>
            <input
              type="date"
              value={markDone?.date ?? ""}
              onChange={(e) => setMarkDone((prev) => prev ? { ...prev, date: e.target.value } : null)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setMarkDone(null)}>Cancel</Button>
          <Button
            onClick={() => {
              if (!markDone) return;
              onSave(markDone.d.id, { lastDone: markDone.date });
              setMarkDone(null);
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

// ─── Manage tab — inline editable rows ────────────────────────────────────────

type RowDraft = {
  name: string;
  category: string;
  country: string;
  frequency: string;
  day: string;
  month: string;
  year: string;
  lastDone: string;
  reminderDaysBefore: string;
  notes: string;
  autoPayment: boolean;
};

function deadlineToRow(d: Deadline): RowDraft {
  return {
    name: d.name ?? "",
    category: d.category ?? "",
    country: d.country ?? "",
    frequency: d.frequency ?? "",
    day: d.day != null ? String(d.day) : "",
    month: d.month != null ? String(d.month) : "",
    year: d.year != null ? String(d.year) : String(new Date().getFullYear()),
    lastDone: d.lastDone ?? "",
    reminderDaysBefore: d.reminderDaysBefore != null ? String(d.reminderDaysBefore) : "",
    notes: d.notes ?? "",
    autoPayment: d.autoPayment ?? false,
  };
}

function EditableRow({
  d,
  idx,
  onSave,
  onDelete,
  isSaving,
  onEditNotes,
}: {
  d: Deadline;
  idx: number;
  onSave: (id: string, data: Partial<InsertDeadline>) => void;
  onDelete: (id: string) => void;
  isSaving: boolean;
  onEditNotes: (d: Deadline) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<RowDraft>(deadlineToRow(d));

  const { data: categoryRows } = useQuery<DeadlineCategory[]>({
    queryKey: ["/api/deadline-categories"],
  });
  const categoryList = categoryRows?.map((c) => c.name) ?? CATEGORIES;

  function set(field: keyof RowDraft, value: string) {
    setDraft((prev) => ({ ...prev, [field]: value }));
  }

  function handleSave() {
    onSave(d.id, {
      name: draft.name || d.name,
      category: draft.category || null,
      country: draft.country || null,
      frequency: draft.frequency || null,
      day: draft.day ? Number(draft.day) : null,
      month: draft.month ? Number(draft.month) : null,
      year: draft.year ? Number(draft.year) : null,
      lastDone: draft.lastDone || null,
      reminderDaysBefore: draft.reminderDaysBefore ? Number(draft.reminderDaysBefore) : null,
      notes: draft.notes || null,
      autoPayment: draft.autoPayment,
    });
    setEditing(false);
  }

  function handleCancel() {
    setDraft(deadlineToRow(d));
    setEditing(false);
  }

  const rowBg = idx % 2 === 1 ? "bg-muted/10" : "";
  const editBg = editing ? "bg-primary/5" : "";
  const autoDim = d.autoPayment && !editing ? "opacity-60" : "";

  if (editing) {
    return (
      <tr className={`border-b last:border-0 ${editBg}`} data-testid={`row-deadline-${d.id}`}>
        <td className="px-2 py-1.5">
          <Input className="h-7 text-xs" value={draft.name} onChange={(e) => set("name", e.target.value)} data-testid={`inline-name-${d.id}`} />
        </td>
        <td className="px-2 py-1.5">
          <select
            className="h-7 text-xs border border-input rounded-md px-1 bg-background w-32 capitalize"
            value={draft.category}
            onChange={(e) => set("category", e.target.value)}
            data-testid={`inline-category-${d.id}`}
          >
            <option value="">—</option>
            {categoryList.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
          </select>
        </td>
        <td className="px-2 py-1.5">
          <Input className="h-7 text-xs w-24" placeholder="country" value={draft.country} onChange={(e) => set("country", e.target.value)} data-testid={`inline-country-${d.id}`} />
        </td>
        <td className="px-2 py-1.5">
          <select
            className="h-7 text-xs border border-input rounded-md px-1 bg-background w-28"
            value={draft.frequency}
            onChange={(e) => set("frequency", e.target.value)}
            data-testid={`inline-frequency-${d.id}`}
          >
            <option value="">—</option>
            {FREQUENCIES.map((f) => <option key={f} value={f}>{f.replace(/_/g, " ")}</option>)}
          </select>
        </td>
        <td className="px-2 py-1.5" colSpan={2}>
          <DayMonthPicker
            day={draft.day ? Number(draft.day) : undefined}
            month={draft.month ? Number(draft.month) : undefined}
            year={draft.year ? Number(draft.year) : new Date().getFullYear()}
            onDayChange={(v) => set("day", v != null ? String(v) : "")}
            onMonthChange={(v) => set("month", v != null ? String(v) : "")}
            onYearChange={(v) => set("year", v != null ? String(v) : "")}
            testId={`inline-daym-${d.id}`}
          />
        </td>
        <td className="px-2 py-1.5">
          <DayMonthYearPicker
            value={draft.lastDone}
            onChange={(v) => set("lastDone", v)}
            testId={`inline-lastdone-${d.id}`}
          />
        </td>
        <td className="px-2 py-1.5">
          <Input className="h-7 text-xs w-16" type="number" min={0} placeholder="days" value={draft.reminderDaysBefore} onChange={(e) => set("reminderDaysBefore", e.target.value)} data-testid={`inline-reminder-${d.id}`} />
        </td>
        <td className="px-2 py-1.5">
          <button
            type="button"
            onClick={() => onEditNotes(d)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            title="Edit notes"
          >
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate max-w-[100px]">{draft.notes || <span className="italic opacity-60">add notes…</span>}</span>
          </button>
        </td>
        <td className="px-2 py-1.5 text-center">
          <Switch
            checked={draft.autoPayment}
            onCheckedChange={(v) => setDraft((prev) => ({ ...prev, autoPayment: v }))}
            data-testid={`switch-autopay-${d.id}`}
          />
        </td>
        <td className="px-2 py-1.5">
          <div className="flex items-center gap-1">
            <Button size="sm" variant="default" className="h-7 px-2 text-xs" onClick={handleSave} disabled={isSaving} data-testid={`button-save-deadline-${d.id}`}>
              Save
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={handleCancel} data-testid={`button-cancel-deadline-${d.id}`}>
              Cancel
            </Button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr
      className={`border-b last:border-0 hover:bg-muted/20 transition-colors ${rowBg} ${autoDim}`}
      data-testid={`row-deadline-${d.id}`}
    >
      <td className="px-4 py-2.5 font-medium">{d.name}</td>
      <td className="px-4 py-2.5 text-muted-foreground capitalize">{d.category ?? "—"}</td>
      <td className="px-4 py-2.5">
        {d.country ? <Badge variant="secondary" className="text-xs">{d.country}</Badge> : <span className="text-muted-foreground">—</span>}
      </td>
      <td className="px-4 py-2.5">
        {d.frequency ? <Badge variant="outline" className="text-xs">{d.frequency.replace(/_/g, " ")}</Badge> : <span className="text-muted-foreground">—</span>}
      </td>
      <td className="px-4 py-2.5 text-muted-foreground" colSpan={2}>
        {d.day && d.month ? `${d.day} ${MONTHS[d.month - 1]}` : d.day ? `Day ${d.day}` : d.month ? MONTHS[d.month - 1] : "—"}
      </td>
      <td className="px-4 py-2.5 text-muted-foreground">{d.lastDone ?? "—"}</td>
      <td className="px-4 py-2.5 text-muted-foreground">{d.reminderDaysBefore != null ? `${d.reminderDaysBefore}d` : "—"}</td>
      <td className="px-4 py-2.5">
        <button
          type="button"
          onClick={() => onEditNotes(d)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group/notes"
          title={d.notes ? "View / edit notes" : "Add notes"}
        >
          <Info className={`w-3.5 h-3.5 shrink-0 transition-colors ${d.notes ? "text-muted-foreground group-hover/notes:text-foreground" : "opacity-30 group-hover/notes:opacity-70"}`} />
          {d.notes && <span className="truncate max-w-[140px]">{d.notes}</span>}
        </button>
      </td>
      <td className="px-4 py-2.5 text-center">
        <Switch
          checked={d.autoPayment ?? false}
          onCheckedChange={(v) => onSave(d.id, { autoPayment: v })}
          data-testid={`switch-autopay-${d.id}`}
        />
      </td>
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-1 justify-end">
          <Button size="icon" variant="ghost" onClick={() => setEditing(true)} data-testid={`button-edit-deadline-${d.id}`}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => onDelete(d.id)} data-testid={`button-delete-deadline-${d.id}`}>
            <Trash2 className="w-3.5 h-3.5 text-destructive" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

function ManageTab({ deadlines, onSave, onDelete, isSaving }: {
  deadlines: Deadline[];
  onSave: (id: string, data: Partial<InsertDeadline>) => void;
  onDelete: (id: string) => void;
  isSaving: boolean;
}) {
  const [notesDialog, setNotesDialog] = useState<Deadline | null>(null);
  const [notesDraft, setNotesDraft]   = useState("");

  function openNotes(d: Deadline) {
    setNotesDialog(d);
    setNotesDraft(d.notes ?? "");
  }

  function saveNotes() {
    if (!notesDialog) return;
    onSave(notesDialog.id, { notes: notesDraft.trim() || null });
    setNotesDialog(null);
  }

  const grouped: Record<string, Deadline[]> = {};
  for (const d of deadlines) {
    const key = d.category?.trim() || "Uncategorised";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(d);
  }

  return (
    <>
      <div className="space-y-6">
        {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([category, items]) => (
          <Card key={category} data-testid={`card-category-${category}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground capitalize">
                {category}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
                      <th className="text-left px-4 py-2 font-medium">Name</th>
                      <th className="text-left px-4 py-2 font-medium">Category</th>
                      <th className="text-left px-4 py-2 font-medium">Country</th>
                      <th className="text-left px-4 py-2 font-medium">Frequency</th>
                      <th className="text-left px-4 py-2 font-medium" colSpan={2}>Due date</th>
                      <th className="text-left px-4 py-2 font-medium">Last done</th>
                      <th className="text-left px-4 py-2 font-medium">Reminder</th>
                      <th className="text-left px-4 py-2 font-medium">Notes</th>
                      <th className="text-center px-4 py-2 font-medium">Auto pay</th>
                      <th className="px-4 py-2 w-28" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((d, idx) => (
                      <EditableRow
                        key={d.id}
                        d={d}
                        idx={idx}
                        onSave={onSave}
                        onDelete={onDelete}
                        isSaving={isSaving}
                        onEditNotes={openNotes}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Notes popup — editable large textarea */}
      <Dialog open={!!notesDialog} onOpenChange={(v) => { if (!v) setNotesDialog(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="w-4 h-4 text-muted-foreground" />
              Notes — {notesDialog?.name}
            </DialogTitle>
          </DialogHeader>
          <Textarea
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            rows={8}
            className="resize-none text-sm leading-relaxed"
            placeholder="Add notes here…"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotesDialog(null)}>Cancel</Button>
            <Button onClick={saveNotes} disabled={isSaving}>Save notes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DeadlinesPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Deadline | null>(null);

  const { data: deadlineList, isLoading } = useQuery<Deadline[]>({
    queryKey: ["/api/deadlines"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertDeadline) => {
      await apiRequest("POST", "/api/deadlines", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deadlines"] });
      setDialogOpen(false);
      toast({ title: "Deadline added" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertDeadline> }) => {
      await apiRequest("PATCH", `/api/deadlines/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deadlines"] });
      setDialogOpen(false);
      setEditing(null);
      toast({ title: "Deadline updated" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/deadlines/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deadlines"] });
      toast({ title: "Deadline removed" });
    },
  });

  function openAdd() { setEditing(null); setDialogOpen(true); }
  function openEdit(d: Deadline) { setEditing(d); setDialogOpen(true); }

  function handleSubmit(values: FormValues) {
    const payload: InsertDeadline = {
      name: values.name,
      category: values.category || null,
      country: values.country || null,
      frequency: values.frequency || null,
      day: values.day ?? 30,
      month: values.month ?? null,
      lastDone: values.lastDone || null,
      reminderDaysBefore: values.reminderDaysBefore ?? null,
      notes: values.notes || null,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 max-w-full space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <CalendarClock className="w-6 h-6" />
              Deadlines
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Recurring and one-off deadlines across countries
            </p>
          </div>
          <Button onClick={openAdd} data-testid="button-add-deadline">
            <Plus className="w-4 h-4 mr-2" />
            Add Deadline
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : !deadlineList || deadlineList.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No deadlines yet. Add one to get started.
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="overview">
            <TabsList data-testid="tabs-deadlines">
              <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
              <TabsTrigger value="manage" data-testid="tab-manage">Manage</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <OverviewTab
                deadlines={deadlineList}
                onEdit={openEdit}
                onDelete={(id) => deleteMutation.mutate(id)}
                onSave={(id, data) => updateMutation.mutate({ id, data })}
                onSnooze={(id) => {
                  const snoozedUntil = format(addMonths(new Date(), 6), "yyyy-MM-dd");
                  apiRequest("PATCH", `/api/deadlines/${id}`, { snoozedUntil }).then(() => {
                    queryClient.invalidateQueries({ queryKey: ["/api/deadlines"] });
                    toast({ title: "Snoozed for 6 months", description: `Hidden until ${format(addMonths(new Date(), 6), "dd MMM yyyy")}` });
                  });
                }}
              />
            </TabsContent>

            <TabsContent value="manage" className="mt-6">
              <ManageTab
                deadlines={deadlineList}
                onSave={(id, data) => updateMutation.mutate({ id, data })}
                onDelete={(id) => deleteMutation.mutate(id)}
                isSaving={updateMutation.isPending}
              />
            </TabsContent>
          </Tabs>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditing(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Deadline" : "Add Deadline"}</DialogTitle>
          </DialogHeader>
          <DeadlineForm
            key={editing?.id ?? "new"}
            defaultValues={
              editing
                ? {
                    name: editing.name,
                    category: editing.category ?? "",
                    country: editing.country ?? "",
                    frequency: editing.frequency ?? "",
                    day: editing.day ?? undefined,
                    month: editing.month ?? undefined,
                    year: editing.year ?? new Date().getFullYear(),
                    lastDone: editing.lastDone ?? "",
                    reminderDaysBefore: editing.reminderDaysBefore ?? undefined,
                    notes: editing.notes ?? "",
                  }
                : emptyForm
            }
            onSubmit={handleSubmit}
            isPending={isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
