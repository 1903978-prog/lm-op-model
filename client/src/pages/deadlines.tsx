import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import type { Deadline, InsertDeadline, DeadlineCategory } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Plus, Pencil, Trash2, CalendarClock, AlertTriangle, Clock, CalendarDays, CheckCircle2 } from "lucide-react";
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

const urgencyStyles: Record<UrgencyLevel, { border: string; bg: string; badge: string; label: string; subText: string }> = {
  overdue: { border: "border-l-destructive", bg: "bg-destructive/5", badge: "bg-destructive text-destructive-foreground", label: "Overdue",  subText: "text-muted-foreground" },
  soon:    { border: "border-l-red-500",     bg: "bg-red-50 text-gray-900",   badge: "bg-red-500 text-white",    label: "Due soon",  subText: "text-gray-600" },
  medium:  { border: "border-l-amber-400",   bg: "bg-amber-50 text-gray-900", badge: "bg-amber-400 text-white", label: "Coming up", subText: "text-gray-600" },
  later:   { border: "border-l-sky-400",     bg: "bg-sky-50 text-gray-900",   badge: "bg-sky-400 text-white",   label: "Upcoming",  subText: "text-gray-600" },
  missing: { border: "border-l-muted-foreground/40", bg: "", badge: "bg-muted text-muted-foreground", label: "No date",   subText: "text-muted-foreground" },
};

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

function OverviewTab({ deadlines, onEdit, onDelete, onSnooze }: {
  deadlines: Deadline[];
  onEdit: (d: Deadline) => void;
  onDelete: (id: string) => void;
  onSnooze: (id: string) => void;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const computed = computeAll(deadlines);

  const upcoming = computed
    .filter((d) => {
      if (d.daysLeft === null || d.daysLeft < 0 || d.daysLeft > 90 || d.autoPayment) return false;
      if (d.snoozedUntil && new Date(d.snoozedUntil) > today) return false;
      return true;
    })
    .sort((a, b) => a.daysLeft! - b.daysLeft!);

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
    <div className="space-y-8">
      {/* Upcoming 90 days */}
      <section>
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          Upcoming in next 90 days
          <Badge variant="secondary" className="ml-1">{upcoming.length}</Badge>
        </h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">No deadlines in the next 90 days.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {upcoming.map((d) => {
              const style = urgencyStyles[d.urgency];
              return (
                <div
                  key={d.id}
                  className={`border-l-4 rounded-md p-3 ${style.border} ${style.bg}`}
                  data-testid={`upcoming-card-${d.id}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-medium text-sm">{d.name}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${style.badge}`}>
                        {d.daysLeft === 0 ? "Today" : `${d.daysLeft}d`}
                      </span>
                      <button
                        title="Snooze for 6 months"
                        onClick={() => onSnooze(d.id)}
                        className="text-muted-foreground hover:text-green-600 transition-colors"
                        data-testid={`button-snooze-${d.id}`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className={`text-xs mt-1 space-y-0.5 ${style.subText}`}>
                    <div>Due: {d.nextDue ? format(d.nextDue, "dd MMM yyyy") : "—"}</div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {d.category && <span className="capitalize">{d.category}</span>}
                      {d.country && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{d.country}</Badge>}
                    </div>
                    {d.notes && <div className="italic">{d.notes}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Missing dates */}
      {missing.length > 0 && (
        <section>
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
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
                  const style = urgencyStyles[d.urgency];
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
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${style.badge}`}>
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
}: {
  d: Deadline;
  idx: number;
  onSave: (id: string, data: Partial<InsertDeadline>) => void;
  onDelete: (id: string) => void;
  isSaving: boolean;
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
          <Input className="h-7 text-xs" placeholder="notes" value={draft.notes} onChange={(e) => set("notes", e.target.value)} data-testid={`inline-notes-${d.id}`} />
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
      <td className="px-4 py-2.5 text-muted-foreground max-w-[160px] truncate">{d.notes ?? "—"}</td>
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
  const grouped: Record<string, Deadline[]> = {};
  for (const d of deadlines) {
    const key = d.category?.trim() || "Uncategorised";
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(d);
  }

  return (
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
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
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
