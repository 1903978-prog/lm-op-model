import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Trip, Destination, TripTask, Task, Deadline, TdlTask, Friend } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link } from "wouter";
import { Plane, Calendar, Trash2, MapPin, AlertTriangle, BellRing, CalendarClock, Mail, Thermometer, TrendingUp, TrendingDown, Newspaper, Download, Plus, ListTodo, RotateCcw, EyeOff, CheckCircle2, Users, ChevronDown, ChevronRight, RefreshCw, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays, isBefore, startOfDay, addYears } from "date-fns";
import { DeadlineForm, type FormValues } from "@/components/deadline-form";

function TripCard({ trip, destinations }: { trip: Trip; destinations: Destination[] }) {
  const destination = destinations.find((d) => d.id === trip.destinationId);

  const { data: tripTasks } = useQuery<(TripTask & { task?: Task })[]>({
    queryKey: ["/api/trips", trip.id, "tasks"],
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/trips/${trip.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
      queryClient.invalidateQueries({ queryKey: ["/api/actionable-tasks"] });
    },
  });

  const arrivalDate = new Date(trip.arrivalDate + "T00:00:00");
  const daysUntil = differenceInDays(arrivalDate, new Date());
  const completedCount = tripTasks?.filter((t) => t.completed).length ?? 0;
  const totalCount = tripTasks?.length ?? 0;

  return (
    <Card data-testid={`card-trip-${trip.id}`}>
      <CardContent className="flex items-center gap-4 py-4">
        <div
          className="flex items-center justify-center w-10 h-10 rounded-md shrink-0"
          style={{ backgroundColor: destination?.color + "20", color: destination?.color }}
        >
          <MapPin className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm">{destination?.name ?? "Unknown"}</span>
            {trip.notes && (
              <span className="text-xs text-muted-foreground truncate">{trip.notes}</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {format(arrivalDate, "MMM d, yyyy")}
            </span>
            {totalCount > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 bg-muted rounded-full">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${(completedCount / totalCount) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">{completedCount}/{totalCount}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={daysUntil < 0 ? "destructive" : daysUntil <= 7 ? "default" : "secondary"}>
            {daysUntil < 0
              ? `${Math.abs(daysUntil)}d ago`
              : daysUntil === 0
                ? "Today"
                : `${daysUntil}d away`}
          </Badge>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => deleteMutation.mutate()}
            data-testid={`button-delete-trip-${trip.id}`}
          >
            <Trash2 className="w-4 h-4 text-muted-foreground" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

type ActionableTask = TripTask & { task?: Task; trip?: Trip };

function TodaysActions({ destinations }: { destinations: Destination[] }) {
  const { data: actionItems, isLoading } = useQuery<ActionableTask[]>({
    queryKey: ["/api/actionable-tasks"],
  });
  const [viewNotes, setViewNotes] = useState<{ title: string; notes: string } | null>(null);

  const toggleMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      await apiRequest("PATCH", `/api/trip-tasks/${id}`, { completed });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/actionable-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
    },
  });

  if (isLoading || !actionItems || actionItems.length === 0) return null;

  const today = startOfDay(new Date());

  const sorted = [...actionItems].sort((a, b) => {
    const aDue = new Date((a.dueDate ?? "") + "T00:00:00").getTime();
    const bDue = new Date((b.dueDate ?? "") + "T00:00:00").getTime();
    return aDue - bDue;
  });

  return (
    <>
    <Card className="border-primary/20 bg-primary/5 mb-6" data-testid="card-todays-actions">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BellRing className="w-5 h-5 text-primary" />
          Action Required Today
          <Badge variant="default" className="ml-auto">
            {sorted.length}
          </Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Tasks that are due today or overdue -- handle these now
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {sorted.map((item) => {
            const dueDate = new Date((item.dueDate ?? "") + "T00:00:00");
            const isOverdue = isBefore(dueDate, today);
            const trip = item.trip;
            const destination = trip ? destinations.find((d) => d.id === trip.destinationId) : undefined;
            const arrivalDate = trip ? new Date(trip.arrivalDate + "T00:00:00") : null;
            const daysLeft = arrivalDate ? differenceInDays(arrivalDate, today) : 0;

            return (
              <div
                key={item.id}
                className={`flex items-center gap-3 p-2.5 rounded-md ${
                  isOverdue ? "bg-destructive/10" : "bg-background"
                }`}
                data-testid={`action-item-${item.id}`}
              >
                <Checkbox
                  checked={item.completed}
                  onCheckedChange={(checked) =>
                    toggleMutation.mutate({ id: item.id, completed: checked === true })
                  }
                  data-testid={`action-checkbox-${item.id}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">
                      {item.task?.title ?? "Unknown"}
                    </span>
                    {destination && (
                      <Badge variant="secondary" className="text-xs">
                        <div
                          className="w-2 h-2 rounded-full mr-1"
                          style={{ backgroundColor: destination.color }}
                        />
                        {destination.name}
                      </Badge>
                    )}
                    {item.task?.notes && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setViewNotes({ title: item.task!.title, notes: item.task!.notes! }); }}
                        className="text-primary/70 hover:text-primary transition-colors"
                        title="View notes"
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    {arrivalDate && (
                      <span className="text-xs text-muted-foreground">
                        Trip: {format(arrivalDate, "MMM d")}
                      </span>
                    )}
                    {isOverdue && (
                      <span className="text-xs text-destructive font-medium flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {Math.abs(differenceInDays(dueDate, today))}d overdue
                      </span>
                    )}
                    {!isOverdue && (
                      <span className="text-xs text-primary font-medium">Due today</span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs text-muted-foreground">
                    {daysLeft}d to trip
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>

    <Dialog open={!!viewNotes} onOpenChange={(v) => { if (!v) setViewNotes(null); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="w-4 h-4 text-muted-foreground" />
            {viewNotes?.title}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{viewNotes?.notes}</p>
      </DialogContent>
    </Dialog>
    </>
  );
}

// ─── Overdue Trip Tasks panel ─────────────────────────────────────────────────

function OverdueTripTasks({ destinations }: { destinations: Destination[] }) {
  const { data: actionItems, isLoading } = useQuery<ActionableTask[]>({
    queryKey: ["/api/actionable-tasks"],
  });
  const [viewNotes, setViewNotes] = useState<{ title: string; notes: string } | null>(null);

  const toggleMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      await apiRequest("PATCH", `/api/trip-tasks/${id}`, { completed });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/actionable-tasks"] });
    },
  });

  if (isLoading) return null;

  const today = startOfDay(new Date());

  const overdue = (actionItems ?? [])
    .filter((item) => {
      if (!item.dueDate) return false;
      return isBefore(new Date(item.dueDate + "T00:00:00"), today);
    })
    .sort((a, b) => new Date(a.dueDate! + "T00:00:00").getTime() - new Date(b.dueDate! + "T00:00:00").getTime());

  if (overdue.length === 0) return null;

  return (
    <>
    <Card className="border-orange-500/30 bg-orange-500/5" data-testid="card-overdue-tasks">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="w-5 h-5 text-orange-500" />
          Overdue Trip Tasks
          <Badge className="ml-auto bg-orange-500 text-white">{overdue.length}</Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">Trip checklist items past their due date</p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-1">
          {overdue.map((item) => {
            const dueDate = new Date(item.dueDate! + "T00:00:00");
            const daysOverdue = Math.abs(differenceInDays(dueDate, today));
            const dest = item.trip ? destinations.find((d) => d.id === item.trip!.destinationId) : undefined;
            return (
              <div
                key={item.id}
                className="flex items-center gap-3 px-2.5 py-2 rounded-md bg-orange-500/10 hover:bg-orange-500/15 transition-colors"
                data-testid={`overdue-task-item-${item.id}`}
              >
                <Checkbox
                  checked={item.completed}
                  onCheckedChange={(checked) =>
                    toggleMutation.mutate({ id: item.id, completed: checked === true })
                  }
                  data-testid={`overdue-task-checkbox-${item.id}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{item.task?.title ?? "Unknown task"}</span>
                    {dest && (
                      <Badge variant="secondary" className="text-xs">
                        <div className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: dest.color }} />
                        {dest.name}
                      </Badge>
                    )}
                    {item.task?.notes && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setViewNotes({ title: item.task!.title, notes: item.task!.notes! }); }}
                        className="text-primary/70 hover:text-primary transition-colors"
                        title="View notes"
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  {item.trip && (
                    <span className="text-xs text-muted-foreground">
                      Trip: {format(new Date(item.trip.arrivalDate + "T00:00:00"), "MMM d, yyyy")}
                    </span>
                  )}
                </div>
                <span className="text-xs font-semibold text-orange-500 shrink-0 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {daysOverdue}d overdue
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>

    <Dialog open={!!viewNotes} onOpenChange={(v) => { if (!v) setViewNotes(null); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="w-4 h-4 text-muted-foreground" />
            {viewNotes?.title}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{viewNotes?.notes}</p>
      </DialogContent>
    </Dialog>
    </>
  );
}

// ─── TDL Tile ─────────────────────────────────────────────────────────────────

const PRIO_STYLES: Record<number, { label: string; badge: string }> = {
  1: { label: "P1", badge: "bg-red-500 text-white" },
  2: { label: "P2", badge: "bg-orange-400 text-white" },
  3: { label: "P3", badge: "bg-blue-500 text-white" },
};

function TDLTile() {
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState<1 | 2 | 3>(1);
  const [completedOpen, setCompletedOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState<Record<number, boolean>>({ 1: true, 2: true, 3: true });
  const [viewTask, setViewTask] = useState<string | null>(null);

  const { data: tdlTasks, isLoading } = useQuery<TdlTask[]>({
    queryKey: ["/api/tdl-tasks"],
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/tdl-tasks", { title: newTitle.trim(), priority: newPriority, done: false });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tdl-tasks"] });
      setNewTitle("");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      await apiRequest("PATCH", `/api/tdl-tasks/${id}`, { done });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/tdl-tasks"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/tdl-tasks/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/tdl-tasks"] }),
  });

  const allTasks = tdlTasks ?? [];
  const activeTasks = allTasks.filter((t) => !t.done);
  const doneTasks = allTasks.filter((t) => t.done);

  return (
    <Card className="flex flex-col" data-testid="card-tdl">
      <CardHeader className="pb-2 shrink-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <ListTodo className="w-4 h-4 text-primary" />
          To-Do List
          {activeTasks.length > 0 && (
            <Badge className="ml-auto bg-primary text-primary-foreground">{activeTasks.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pt-0">
        {/* Add form */}
        <div className="flex flex-col gap-2 shrink-0">
          <Textarea
            placeholder="Write a new task…"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && newTitle.trim()) {
                e.preventDefault();
                addMutation.mutate();
              }
            }}
            className="min-h-[88px] text-sm"
            data-testid="input-tdl-new-task"
          />
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground font-medium shrink-0">Priority:</span>
            {([1, 2, 3] as const).map((p) => (
              <button
                key={p}
                onClick={() => setNewPriority(p)}
                className={`h-7 px-2.5 rounded text-xs font-bold transition-all border ${
                  newPriority === p
                    ? PRIO_STYLES[p].badge + " border-transparent ring-2 ring-offset-1 ring-current"
                    : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                }`}
                data-testid={`button-tdl-prio-${p}`}
              >
                P{p}
              </button>
            ))}
            <Button
              size="sm"
              className="ml-auto h-7 px-3 gap-1.5 text-xs"
              onClick={() => { if (newTitle.trim()) addMutation.mutate(); }}
              disabled={!newTitle.trim() || addMutation.isPending}
              data-testid="button-tdl-add"
            >
              <Plus className="w-3.5 h-3.5" />
              Add task
            </Button>
          </div>
        </div>

        {/* Active tasks grouped by priority */}
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : activeTasks.length === 0 && doneTasks.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">No tasks yet — add one above</p>
        ) : activeTasks.length === 0 ? null : (
          <div className="space-y-3" data-testid="tdl-grouped-list">
            {([1, 2, 3] as const).map((p) => {
              const group = activeTasks
                .filter((t) => t.priority === p)
                .sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime());
              if (group.length === 0) return null;
              const isOpen = groupOpen[p] !== false;
              return (
                <div key={p} data-testid={`tdl-group-p${p}`}>
                  <button
                    type="button"
                    onClick={() => setGroupOpen((prev) => ({ ...prev, [p]: !isOpen }))}
                    className="flex items-center gap-2 mb-1 w-full text-left"
                    data-testid={`button-tdl-group-toggle-p${p}`}
                  >
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${PRIO_STYLES[p].badge}`}>
                      {PRIO_STYLES[p].label}
                    </span>
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground tabular-nums">{group.length}</span>
                    {isOpen
                      ? <ChevronDown className="w-3 h-3 text-muted-foreground" />
                      : <ChevronRight className="w-3 h-3 text-muted-foreground" />
                    }
                  </button>
                  {isOpen && (
                    <div className="space-y-0.5">
                      {group.map((task) => (
                        <div
                          key={task.id}
                          className="flex items-start gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 group cursor-pointer"
                          onClick={() => toggleMutation.mutate({ id: task.id, done: true })}
                          data-testid={`tdl-task-row-${task.id}`}
                        >
                          <span
                            className="flex-1 text-sm leading-snug min-w-0 truncate select-none cursor-pointer hover:text-primary transition-colors"
                            data-testid={`tdl-task-title-${task.id}`}
                            title={task.title}
                            onClick={(e) => { e.stopPropagation(); setViewTask(task.title); }}
                          >
                            {task.title.split("\n")[0]}
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(task.id); }}
                            className="shrink-0 mt-0.5 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                            title="Delete"
                            data-testid={`tdl-task-delete-${task.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Completed tasks collapsible section */}
        {doneTasks.length > 0 && (
          <div className="border-t border-dashed pt-2 mt-1">
            <button
              type="button"
              onClick={() => setCompletedOpen((o) => !o)}
              className="flex items-center gap-1.5 w-full text-left text-xs text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-tdl-completed-toggle"
            >
              {completedOpen
                ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                : <CheckCircle2 className="w-3.5 h-3.5" />
              }
              <span className="font-medium">Completed tasks</span>
              <Badge variant="outline" className="text-xs font-normal px-1.5 py-0">{doneTasks.length}</Badge>
              <span className="ml-auto">{completedOpen ? "▲" : "▼"}</span>
            </button>
            {completedOpen && (
              <div className="mt-2 space-y-0.5" data-testid="tdl-completed-list">
                {doneTasks
                  .sort((a, b) => new Date(a.createdAt!).getTime() - new Date(b.createdAt!).getTime())
                  .map((task) => (
                    <div
                      key={task.id}
                      className="flex items-start gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 group opacity-60 cursor-pointer"
                      onClick={() => toggleMutation.mutate({ id: task.id, done: false })}
                      title="Click to restore"
                      data-testid={`tdl-done-row-${task.id}`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0 text-green-500" />
                      <span
                        className="flex-1 text-sm line-through leading-snug min-w-0 truncate select-none cursor-pointer"
                        title={task.title}
                        onClick={(e) => { e.stopPropagation(); setViewTask(task.title); }}
                      >
                        {task.title.split("\n")[0]}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(task.id); }}
                        className="shrink-0 mt-0.5 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete"
                        data-testid={`tdl-done-delete-${task.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>

    <Dialog open={!!viewTask} onOpenChange={(v) => { if (!v) setViewTask(null); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Task</DialogTitle>
        </DialogHeader>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{viewTask}</p>
      </DialogContent>
    </Dialog>
  );
}

// ─── Friends Box ───────────────────────────────────────────────────────────────

function FriendsBox() {
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [listOpen, setListOpen] = useState(true);
  const [collapsedLocs, setCollapsedLocs] = useState<Set<string>>(new Set());

  function toggleLoc(loc: string) {
    setCollapsedLocs((prev) => {
      const next = new Set(prev);
      if (next.has(loc)) next.delete(loc); else next.add(loc);
      return next;
    });
  }

  const { data: friendsList, isLoading } = useQuery<Friend[]>({
    queryKey: ["/api/friends"],
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/friends", { name: newName.trim(), lastSpoke: "2023-12-01" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
      setNewName("");
      setAdding(false);
    },
  });

  const spokeMutation = useMutation({
    mutationFn: async (id: string) => {
      const now = new Date();
      const lastSpoke = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      await apiRequest("PATCH", `/api/friends/${id}`, { lastSpoke });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/friends"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/friends/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/friends"] }),
  });

  function formatLastSpoke(dateStr: string) {
    const [year, month] = dateStr.split("-");
    return `${month}/${year.slice(2)}`;
  }

  function isOlderThan3Months(dateStr: string) {
    const [year, month] = dateStr.split("-").map(Number);
    const spoke = new Date(year, month - 1, 1);
    const threshold = new Date();
    threshold.setMonth(threshold.getMonth() - 3);
    return spoke < threshold;
  }

  return (
    <Card data-testid="card-friends">
      <CardHeader className="pb-2 shrink-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="w-4 h-4 text-primary" />
          Friends
          {friendsList && friendsList.length > 0 && (
            <Badge variant="outline" className="ml-auto text-xs font-normal">{friendsList.length}</Badge>
          )}
          <button
            type="button"
            onClick={() => setListOpen((o) => !o)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-friends-toggle"
          >
            {listOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 pb-3">
        {listOpen && (
          <>
            {isLoading && <Skeleton className="h-16 w-full" />}
            {!isLoading && (!friendsList || friendsList.length === 0) && !adding && (
              <p className="text-xs text-muted-foreground py-2">No friends yet.</p>
            )}
            {(() => {
              const list = friendsList ?? [];
              // Group by location
              const groups: Record<string, typeof list> = {};
              for (const f of list) {
                const key = f.location?.trim() || "—";
                if (!groups[key]) groups[key] = [];
                groups[key].push(f);
              }
              // Within each group: most overdue (oldest lastSpoke) first
              for (const key of Object.keys(groups)) {
                groups[key].sort((a, b) => {
                  const ad = new Date(a.lastSpoke + "T00:00:00").getTime();
                  const bd = new Date(b.lastSpoke + "T00:00:00").getTime();
                  return ad - bd;
                });
              }
              const sortedKeys = Object.keys(groups).sort((a, b) =>
                a === "—" ? 1 : b === "—" ? -1 : a.localeCompare(b)
              );

              const FriendRow = ({ f }: { f: typeof list[0] }) => (
                <div
                  key={f.id}
                  className="group flex items-center gap-2 py-1.5 px-1 rounded hover:bg-muted/50 transition-colors"
                  data-testid={`row-friend-${f.id}`}
                >
                  {isOlderThan3Months(f.lastSpoke) && (
                    <span className="w-2 h-2 rounded-sm bg-orange-400 shrink-0" title="No contact for over 3 months" data-testid={`dot-overdue-${f.id}`} />
                  )}
                  <span className="flex-1 text-sm truncate">{f.name}</span>
                  <span className="text-xs text-muted-foreground font-mono shrink-0 tabular-nums" data-testid={`text-lastspoke-${f.id}`}>
                    {formatLastSpoke(f.lastSpoke)}
                  </span>
                  <button
                    type="button"
                    onClick={() => apiRequest("PATCH", `/api/friends/${f.id}`, { keepInTouch: !f.keepInTouch }).then(() => queryClient.invalidateQueries({ queryKey: ["/api/friends"] }))}
                    title={f.keepInTouch ? "In touch — click to disable" : "Not in touch — click to enable"}
                    className={`shrink-0 text-xs px-1.5 py-0.5 rounded transition-colors ${f.keepInTouch ? "bg-green-500/20 text-green-600 hover:bg-green-500/30" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                  >
                    {f.keepInTouch ? "✓" : "—"}
                  </button>
                  <button type="button" onClick={() => spokeMutation.mutate(f.id)} disabled={spokeMutation.isPending} className="opacity-0 group-hover:opacity-100 transition-opacity text-xs px-2 py-0.5 rounded bg-green-500 text-white hover:bg-green-600 shrink-0" data-testid={`button-spoke-${f.id}`} title="Spoke today">
                    ✓ Today
                  </button>
                  <button type="button" onClick={() => deleteMutation.mutate(f.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0" data-testid={`button-delete-friend-${f.id}`}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );

              return (
                <div className="space-y-2">
                  {sortedKeys.map((loc) => {
                    const isCollapsed = collapsedLocs.has(loc);
                    return (
                      <div key={loc}>
                        <button
                          type="button"
                          onClick={() => toggleLoc(loc)}
                          className="w-full flex items-center gap-1.5 px-1 py-0.5 mb-0.5 rounded hover:bg-muted/40 transition-colors"
                        >
                          {isCollapsed
                            ? <ChevronRight className="w-3.5 h-3.5 text-primary shrink-0" />
                            : <ChevronDown className="w-3.5 h-3.5 text-primary shrink-0" />
                          }
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground">
                            {loc}
                          </span>
                          <span className="text-[10px] text-muted-foreground ml-0.5">
                            ({groups[loc].length})
                          </span>
                        </button>
                        {!isCollapsed && (
                          <div className="space-y-0.5 ml-3">
                            {groups[loc].map((f) => <FriendRow key={f.id} f={f} />)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </>
        )}

        {adding && (
          <div className="flex items-center gap-2 pt-2">
            <Input
              autoFocus
              placeholder="Friend's name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newName.trim()) addMutation.mutate();
                if (e.key === "Escape") { setAdding(false); setNewName(""); }
              }}
              className="h-7 text-sm"
              data-testid="input-friend-name"
            />
            <Button
              size="sm"
              className="h-7 px-2.5 text-xs"
              disabled={!newName.trim() || addMutation.isPending}
              onClick={() => addMutation.mutate()}
              data-testid="button-add-friend-confirm"
            >
              Add
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={() => { setAdding(false); setNewName(""); }}
            >
              ✕
            </Button>
          </div>
        )}

        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mt-2 pt-2 border-t border-dashed w-full"
            data-testid="button-add-friend"
          >
            <Plus className="w-3.5 h-3.5" />
            Add friend
          </button>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Done Tasks Bottom Box ─────────────────────────────────────────────────────

function DoneTasksBox() {
  const { data: tdlTasks } = useQuery<TdlTask[]>({
    queryKey: ["/api/tdl-tasks"],
  });

  const toggleMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/tdl-tasks/${id}`, { done: false });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/tdl-tasks"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/tdl-tasks/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/tdl-tasks"] }),
  });

  const doneTasks = (tdlTasks ?? [])
    .filter((t) => t.done)
    .sort((a, b) => a.priority - b.priority);

  if (doneTasks.length === 0) return null;

  return (
    <div className="shrink-0 border-t pt-3" data-testid="section-done-tasks">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        Toggled tasks ({doneTasks.length})
      </p>
      <div className="flex flex-wrap gap-2">
        {doneTasks.map((task) => (
          <div
            key={task.id}
            className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted border text-sm"
            data-testid={`done-task-chip-${task.id}`}
          >
            <span
              className={`text-xs font-bold px-1 rounded ${PRIO_STYLES[task.priority]?.badge ?? "bg-muted-foreground text-white"}`}
            >
              {PRIO_STYLES[task.priority]?.label}
            </span>
            <span className="line-through text-muted-foreground text-xs">{task.title}</span>
            <button
              onClick={() => toggleMutation.mutate(task.id)}
              className="text-muted-foreground hover:text-primary transition-colors"
              title="Restore task"
              data-testid={`done-task-restore-${task.id}`}
            >
              <RotateCcw className="w-3 h-3" />
            </button>
            <button
              onClick={() => deleteMutation.mutate(task.id)}
              className="text-muted-foreground hover:text-destructive transition-colors"
              title="Delete"
              data-testid={`done-task-delete-${task.id}`}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Deadline computation (mirrors deadlines.tsx logic) ──────────────────────

function computeDeadlineNextDue(d: Deadline, today: Date): Date | null {
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
    // If lastDone is set, next due must be at least 1 year after lastDone
    if (lastDone) {
      const lastDoneDate = new Date(lastDone);
      lastDoneDate.setHours(0, 0, 0, 0);
      const minNext = addYears(lastDoneDate, 1);
      if (due < minNext) {
        due = new Date(minNext.getFullYear(), month - 1, day);
        due.setHours(0, 0, 0, 0);
      }
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

function ExpiredDeadlines() {
  const { data: deadlines, isLoading } = useQuery<Deadline[]>({ queryKey: ["/api/deadlines"] });
  const [editing, setEditing] = useState<Deadline | null>(null);
  const [viewNotes, setViewNotes] = useState<{ name: string; notes: string } | null>(null);

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<FormValues> }) => {
      await apiRequest("PATCH", `/api/deadlines/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deadlines"] });
      setEditing(null);
    },
  });

  const deprioritizeMutation = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: boolean }) => {
      await apiRequest("PATCH", `/api/deadlines/${id}`, { deprioritized: value });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/deadlines"] }),
  });

  const doneMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/deadlines/${id}`, { lastDone: format(new Date(), "yyyy-MM-dd") });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/deadlines"] }),
  });

  if (isLoading) return null;
  if (!deadlines || deadlines.length === 0) return null;

  const today = startOfDay(new Date());

  const expired = deadlines
    .map((d) => {
      const nextDue = computeDeadlineNextDue(d, today);
      const daysLeft = nextDue ? differenceInDays(nextDue, today) : null;
      return { ...d, nextDue, daysLeft };
    })
    .filter((d) => {
      if (d.deprioritized) return false;
      if (d.daysLeft === null || d.daysLeft >= 0 || d.autoPayment) return false;
      return true;
    })
    .sort((a, b) => a.daysLeft! - b.daysLeft!);

  if (expired.length === 0) return null;

  return (
    <>
      <Card className="border-destructive/30 bg-destructive/5 mb-4" data-testid="card-expired-deadlines">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Expired Deadlines
            <Badge variant="destructive" className="ml-auto">{expired.length}</Badge>
          </CardTitle>
          <p className="text-xs text-muted-foreground">Click any item to update · These are past their due date</p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-1">
            {expired.map((d) => (
              <div
                key={d.id}
                className="flex items-center gap-3 px-2.5 py-2 rounded-md cursor-pointer bg-destructive/10 hover:bg-destructive/20 transition-colors group"
                onClick={() => setEditing(d)}
                data-testid={`expired-deadline-item-${d.id}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{d.name}</span>
                    {d.country && <Badge variant="secondary" className="text-xs">{d.country}</Badge>}
                    {d.category && <span className="text-xs text-muted-foreground capitalize">{d.category}</span>}
                  </div>
                  {d.nextDue && (
                    <span className="text-xs text-muted-foreground">Was due {format(d.nextDue, "MMM d, yyyy")}</span>
                  )}
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  {d.notes && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setViewNotes({ name: d.name, notes: d.notes! }); }}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      title="View notes"
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <span className="text-xs font-semibold text-destructive flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {Math.abs(d.daysLeft!)}d overdue
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); doneMutation.mutate(d.id); }}
                    className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-500 hover:text-green-700 dark:hover:text-green-400 transition-colors opacity-0 group-hover:opacity-100 border border-green-600/40 rounded px-1.5 py-0.5"
                    title="Mark as done today"
                    data-testid={`expired-done-${d.id}`}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    Done
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deprioritizeMutation.mutate({ id: d.id, value: true }); }}
                    className="text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
                    title="Move to Not priority"
                    data-testid={`expired-deprioritize-${d.id}`}
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!viewNotes} onOpenChange={(v) => { if (!v) setViewNotes(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Info className="w-4 h-4 text-muted-foreground" />{viewNotes?.name}</DialogTitle>
          </DialogHeader>
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">{viewNotes?.notes}</p>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(open) => { if (!open) setEditing(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Deadline</DialogTitle>
          </DialogHeader>
          {editing && (
            <DeadlineForm
              key={editing.id}
              defaultValues={{
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
                autoPayment: editing.autoPayment ?? false,
              }}
              onSubmit={(values) => updateMutation.mutate({ id: editing.id, data: values })}
              isPending={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function UpcomingDeadlines() {
  const { data: deadlines, isLoading } = useQuery<Deadline[]>({
    queryKey: ["/api/deadlines"],
  });
  const [editing, setEditing] = useState<Deadline | null>(null);
  const [viewNotes, setViewNotes] = useState<{ name: string; notes: string } | null>(null);

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<FormValues> }) => {
      await apiRequest("PATCH", `/api/deadlines/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deadlines"] });
      setEditing(null);
    },
  });

  const deprioritizeMutation = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: boolean }) => {
      await apiRequest("PATCH", `/api/deadlines/${id}`, { deprioritized: value });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/deadlines"] }),
  });

  const doneMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/deadlines/${id}`, { lastDone: format(new Date(), "yyyy-MM-dd") });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/deadlines"] }),
  });

  if (isLoading) return null;
  if (!deadlines || deadlines.length === 0) return null;

  const today = startOfDay(new Date());

  const relevant = deadlines
    .map((d) => {
      const nextDue = computeDeadlineNextDue(d, today);
      const daysLeft = nextDue ? differenceInDays(nextDue, today) : null;
      return { ...d, nextDue, daysLeft };
    })
    .filter((d) => {
      if (d.deprioritized) return false;
      if (d.daysLeft === null || d.daysLeft < 0 || d.daysLeft > 30 || d.autoPayment) return false;
      if (d.snoozedUntil && new Date(d.snoozedUntil) > today) return false;
      return true;
    })
    .sort((a, b) => a.daysLeft! - b.daysLeft!);

  if (relevant.length === 0) return null;

  return (
    <>
      <Card className="border-amber-500/20 bg-amber-500/5 mb-6" data-testid="card-upcoming-deadlines">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            Deadlines — Next 30 Days
            <Badge variant="secondary" className="ml-auto">{relevant.length}</Badge>
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Click any item to edit · Overdue or due within the next 30 days
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-1">
            {relevant.map((d) => {
              const overdue = d.daysLeft! < 0;
              const today30 = d.daysLeft! <= 7;
              return (
                <div
                  key={d.id}
                  className={`flex items-center gap-3 px-2.5 py-2 rounded-md cursor-pointer hover:bg-muted/40 transition-colors group ${overdue ? "bg-destructive/10" : "bg-background"}`}
                  onClick={() => setEditing(d)}
                  data-testid={`deadline-item-${d.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{d.name}</span>
                      {d.country && (
                        <Badge variant="secondary" className="text-xs">{d.country}</Badge>
                      )}
                      {d.category && (
                        <span className="text-xs text-muted-foreground capitalize">{d.category}</span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    {d.notes && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setViewNotes({ name: d.name, notes: d.notes! }); }}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        title="View notes"
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {overdue ? (
                      <span className="text-xs font-semibold text-destructive flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {Math.abs(d.daysLeft!)}d overdue
                      </span>
                    ) : d.daysLeft === 0 ? (
                      <span className="text-xs font-semibold text-destructive">Today</span>
                    ) : (
                      <span className={`text-xs font-semibold ${today30 ? "text-orange-600 dark:text-orange-400" : "text-amber-600 dark:text-amber-400"}`}>
                        {d.daysLeft}d left
                      </span>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); doneMutation.mutate(d.id); }}
                      className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-500 hover:text-green-700 dark:hover:text-green-400 transition-colors opacity-0 group-hover:opacity-100 border border-green-600/40 rounded px-1.5 py-0.5"
                      title="Mark as done today"
                      data-testid={`upcoming-done-${d.id}`}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      Done
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deprioritizeMutation.mutate({ id: d.id, value: true }); }}
                      className="text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
                      title="Move to Not priority"
                      data-testid={`upcoming-deprioritize-${d.id}`}
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 pt-3 border-t">
            <Link href="/deadlines">
              <Button variant="ghost" size="sm" className="text-xs h-7 px-2" data-testid="link-view-all-deadlines">
                View all deadlines →
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!viewNotes} onOpenChange={(v) => { if (!v) setViewNotes(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Info className="w-4 h-4 text-muted-foreground" />{viewNotes?.name}</DialogTitle>
          </DialogHeader>
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">{viewNotes?.notes}</p>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(open) => { if (!open) setEditing(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Deadline</DialogTitle>
          </DialogHeader>
          {editing && (
            <DeadlineForm
              key={editing.id}
              defaultValues={{
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
                autoPayment: editing.autoPayment ?? false,
              }}
              onSubmit={(values) => updateMutation.mutate({ id: editing.id, data: values })}
              isPending={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function NotPriorityDeadlines() {
  const [open, setOpen] = useState(false);
  const [viewNotes, setViewNotes] = useState<{ name: string; notes: string } | null>(null);
  const { data: deadlines, isLoading } = useQuery<Deadline[]>({ queryKey: ["/api/deadlines"] });

  const restoreMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/deadlines/${id}`, { deprioritized: false });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/deadlines"] }),
  });

  if (isLoading) return null;

  const today = startOfDay(new Date());

  const deprioritized = (deadlines ?? [])
    .filter((d) => d.deprioritized)
    .map((d) => {
      const nextDue = computeDeadlineNextDue(d, today);
      const daysLeft = nextDue ? differenceInDays(nextDue, today) : null;
      return { ...d, nextDue, daysLeft };
    })
    .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));

  if (deprioritized.length === 0) return null;

  return (
    <>
      {/* Compact collapsible header — clicking opens the dialog */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-muted/50 bg-muted/10 hover:bg-muted/20 transition-colors mb-4 group"
        data-testid="button-not-priority-open"
      >
        <EyeOff className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <span className="text-sm text-muted-foreground font-medium">Not priority deadlines</span>
        <Badge variant="secondary" className="text-xs ml-1">{deprioritized.length}</Badge>
        <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto group-hover:text-foreground transition-colors" />
      </button>

      {/* Full pop-out dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col" data-testid="dialog-not-priority">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <EyeOff className="w-4 h-4 text-muted-foreground" />
              Not priority deadlines
              <Badge variant="secondary" className="ml-1">{deprioritized.length}</Badge>
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground -mt-2 mb-1">Click the restore icon to move an item back to its active section</p>
          <div className="overflow-y-auto flex-1 space-y-1 pr-1">
            {deprioritized.map((d) => {
              const isExpired = d.daysLeft !== null && d.daysLeft < 0;
              return (
                <div
                  key={d.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-md bg-muted/20 hover:bg-muted/30 transition-colors"
                  data-testid={`not-priority-dialog-item-${d.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{d.name}</span>
                      {d.country && <Badge variant="outline" className="text-xs">{d.country}</Badge>}
                      {d.category && <span className="text-xs text-muted-foreground capitalize">{d.category}</span>}
                    </div>
                    {d.nextDue && (
                      <span className="text-xs text-muted-foreground">
                        {isExpired ? `Was due ${format(d.nextDue, "MMM d, yyyy")}` : `Due ${format(d.nextDue, "MMM d, yyyy")}`}
                        {d.daysLeft !== null && !isExpired && (
                          <span className="ml-1 text-muted-foreground/70">({d.daysLeft}d)</span>
                        )}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {d.notes && (
                      <button
                        onClick={() => setViewNotes({ name: d.name, notes: d.notes! })}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        title="View notes"
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => restoreMutation.mutate(d.id)}
                      className="text-muted-foreground hover:text-primary transition-colors"
                      title="Restore to active section"
                      data-testid={`not-priority-dialog-restore-${d.id}`}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewNotes} onOpenChange={(v) => { if (!v) setViewNotes(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Info className="w-4 h-4 text-muted-foreground" />{viewNotes?.name}</DialogTitle>
          </DialogHeader>
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">{viewNotes?.notes}</p>
        </DialogContent>
      </Dialog>
    </>
  );
}

type WeatherCity = { name: string; country: string; max: number | null; min: number | null };
type StockQuote = { symbol: string; name: string; currency: string; price: number | null; changePercent: number | null };
type ForexRate = { name: string; rate: number | null; changePercent: number | null };
type MacroItem = { name: string; value: number | null; currency: string; changePercent: number | null; type: string };
type Alert = { title: string; pubDate: string | null };

const DAILY = 1000 * 60 * 60 * 24;
const RETRY_INTERVAL = 30_000; // 30s — keeps fetching until data arrives

function ChangeBadge({ changePercent }: { changePercent: number | null }) {
  if (changePercent == null) return null;
  const up = changePercent >= 0;
  return (
    <span className={`flex items-center gap-0.5 text-xs font-medium ${up ? "text-green-600" : "text-red-500"}`}>
      {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {up ? "+" : ""}{changePercent.toFixed(2)}%
    </span>
  );
}

function SidebarSection({ label }: { label: string }) {
  return <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1 pt-2 pb-0.5">{label}</p>;
}

function InfoSidebar({ width }: { width: number }) {
  const [refreshing, setRefreshing] = useState(false);

  const { data: weatherData } = useQuery<WeatherCity[]>({ queryKey: ["/api/weather"], staleTime: DAILY, refetchInterval: (q) => (q.state.data && q.state.data.length > 0) ? DAILY : RETRY_INTERVAL });
  const { data: stockData }   = useQuery<StockQuote[]>({ queryKey: ["/api/stocks"],  staleTime: DAILY, refetchInterval: (q) => (q.state.data && q.state.data.length > 0) ? DAILY : RETRY_INTERVAL });
  const { data: forexData }   = useQuery<ForexRate[]>({ queryKey: ["/api/forex"],   staleTime: DAILY, refetchInterval: (q) => (q.state.data && q.state.data.length > 0) ? DAILY : RETRY_INTERVAL });
  const { data: macroData }   = useQuery<MacroItem[]>({ queryKey: ["/api/macro"],   staleTime: DAILY, refetchInterval: (q) => (q.state.data && q.state.data.length > 0) ? DAILY : RETRY_INTERVAL });
  const { data: alertsData }  = useQuery<Alert[]>({     queryKey: ["/api/alerts"],  staleTime: DAILY, refetchInterval: (q) => (q.state.data && q.state.data.length > 0) ? DAILY : RETRY_INTERVAL });
  const { data: trips }       = useQuery<Trip[]>({        queryKey: ["/api/trips"] });
  const { data: destinations }= useQuery<Destination[]>({ queryKey: ["/api/destinations"] });

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["/api/weather"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/stocks"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/forex"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/macro"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] }),
    ]);
    setRefreshing(false);
  }

  const upcomingTrips = trips
    ?.filter((t) => differenceInDays(new Date(t.arrivalDate), new Date()) >= 0)
    .sort((a, b) => new Date(a.arrivalDate).getTime() - new Date(b.arrivalDate).getTime());

  const FLAG: Record<string, string> = { Italy: "🇮🇹", Romania: "🇷🇴", France: "🇫🇷", Thailand: "🇹🇭" };

  const rates       = macroData?.filter(m => m.type === "rate")       ?? [];
  const indicators  = macroData?.filter(m => m.type === "indicator")  ?? [];
  const commodities = macroData?.filter(m => m.type !== "rate" && m.type !== "indicator") ?? [];

  function fmtValue(item: MacroItem) {
    if (item.value == null) return "—";
    const v = item.type === "rate" ? item.value.toFixed(2) : item.value.toFixed(2);
    return `${item.currency === "$" ? "$" : ""}${v}${item.currency === "%" ? "%" : item.currency === "$" ? "" : item.currency}`;
  }

  return (
    <aside className="flex-shrink-0 border-r bg-muted/20 overflow-y-auto flex flex-col" style={{ width }} data-testid="info-sidebar">
      <div className="flex items-center justify-between px-3 pt-2 pb-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Live Data</span>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          title="Refresh all data"
          className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>
      <div className="p-3 space-y-1">

        {/* Weather */}
        {weatherData && weatherData.length > 0 && (
          <>
            <SidebarSection label="Weather" />
            <div className="grid grid-cols-2 gap-1.5">
              {weatherData.map((city) => (
                <div key={city.name} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-card border" data-testid={`weather-card-${city.name.toLowerCase()}`}>
                  <span className="text-base leading-none">{FLAG[city.country] ?? "🌍"}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-tight truncate">{city.name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Thermometer className="w-2.5 h-2.5 text-red-500 flex-shrink-0" />
                      <span className="text-xs font-medium">{city.max != null ? `${Math.round(city.max)}°` : "—"}</span>
                      <span className="text-xs text-muted-foreground">/ {city.min != null ? `${Math.round(city.min)}°` : "—"}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Markets */}
        {stockData && stockData.length > 0 && (
          <>
            <SidebarSection label="Markets" />
            <div className="grid grid-cols-2 gap-1.5">
              {stockData.map((stock) => (
                <div key={stock.symbol} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-card border" data-testid={`stock-card-${stock.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}>
                  <span className="text-base leading-none">📈</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-tight truncate">{stock.name}</p>
                    <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                      <span className="text-xs font-medium">{stock.price != null ? `${stock.currency}${stock.price.toFixed(2)}` : "—"}</span>
                      <ChangeBadge changePercent={stock.changePercent} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Forex */}
        {forexData && forexData.length > 0 && (
          <>
            <SidebarSection label="Forex" />
            <div className="grid grid-cols-2 gap-1.5">
              {forexData.map((fx) => (
                <div key={fx.name} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-card border" data-testid={`forex-card-${fx.name.toLowerCase().replace("/", "-")}`}>
                  <span className="text-base leading-none">💱</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-tight">{fx.name}</p>
                    <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                      <span className="text-xs font-medium">{fx.rate != null ? fx.rate.toFixed(4) : "—"}</span>
                      <ChangeBadge changePercent={fx.changePercent} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Rates */}
        {rates.length > 0 && (
          <>
            <SidebarSection label="Rates" />
            <div className="grid grid-cols-2 gap-1.5">
              {rates.map((item) => (
                <div key={item.name} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-card border" data-testid={`macro-card-${item.name.toLowerCase().replace(/\s+/g, "-")}`}>
                  <span className="text-base leading-none">🏦</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-tight truncate">{item.name}</p>
                    <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                      <span className="text-xs font-medium">{fmtValue(item)}</span>
                      <ChangeBadge changePercent={item.changePercent} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* CPI & Unemployment Indicators */}
        {indicators.length > 0 && (
          <>
            <SidebarSection label="Inflation &amp; Jobs" />
            <div className="grid grid-cols-2 gap-1.5">
              {indicators.map((item) => (
                <div key={item.name} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-card border" data-testid={`macro-card-${item.name.toLowerCase().replace(/\s+/g, "-")}`}>
                  <span className="text-base leading-none">{item.name.includes("CPI") ? "📊" : "👷"}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-tight truncate">{item.name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-xs font-medium">{item.value != null ? `${item.value.toFixed(1)}%` : "—"}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Commodities & Volatility */}
        {commodities.length > 0 && (
          <>
            <SidebarSection label="Commodities" />
            <div className="grid grid-cols-2 gap-1.5">
              {commodities.map((item) => (
                <div key={item.name} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-card border" data-testid={`macro-card-${item.name.toLowerCase().replace(/\s+/g, "-")}`}>
                  <span className="text-base leading-none">{item.type === "commodity" ? "🛢️" : "⚡"}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold leading-tight truncate">{item.name}</p>
                    <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                      <span className="text-xs font-medium">{fmtValue(item)}</span>
                      <ChangeBadge changePercent={item.changePercent} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Upcoming Trips */}
        {upcomingTrips && upcomingTrips.length > 0 && (
          <>
            <SidebarSection label="Upcoming Trips" />
            <div className="space-y-1.5">
              {upcomingTrips.map((trip) => {
                const dest = destinations?.find((d) => d.id === trip.destinationId);
                const daysUntil = differenceInDays(new Date(trip.arrivalDate), new Date());
                return (
                  <div key={trip.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-card border" data-testid={`sidebar-trip-${trip.id}`}>
                    <span className="text-base leading-none">{FLAG[dest?.name ?? ""] ?? "✈️"}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold leading-tight truncate">{trip.name}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(trip.arrivalDate), "d MMM yyyy")}</p>
                    </div>
                    <span className={`text-xs font-semibold shrink-0 ${daysUntil === 0 ? "text-destructive" : daysUntil <= 14 ? "text-orange-400" : "text-muted-foreground"}`}>
                      {daysUntil === 0 ? "Today" : `${daysUntil}d`}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}

      </div>
    </aside>
  );
}

export default function Dashboard() {
  const { toast } = useToast();
  const [newsOpen, setNewsOpen] = useState(false);

  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const s = localStorage.getItem("dash-sidebar-width");
    return s ? parseInt(s) : 352;
  });
  const [rightColWidth, setRightColWidth] = useState(() => {
    const s = localStorage.getItem("dash-right-col-width");
    return s ? parseInt(s) : 420;
  });

  function startDrag(type: "sidebar" | "right", e: { preventDefault(): void; clientX: number }, startWidth: number) {
    e.preventDefault();
    const startX = e.clientX;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    function onMove(ev: MouseEvent) {
      const delta = ev.clientX - startX;
      if (type === "sidebar") {
        const w = Math.max(200, Math.min(600, startWidth + delta));
        setSidebarWidth(w);
        localStorage.setItem("dash-sidebar-width", String(w));
      } else {
        const w = Math.max(240, Math.min(700, startWidth - delta));
        setRightColWidth(w);
        localStorage.setItem("dash-right-col-width", String(w));
      }
    }

    function onUp() {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  const emailMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/send-test-email");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Email sent", description: "Overdue deadlines summary sent to your inbox." });
    },
    onError: () => {
      toast({ title: "Failed to send", description: "Check your connection and try again.", variant: "destructive" });
    },
  });

  const { data: trips, isLoading: tripsLoading } = useQuery<Trip[]>({
    queryKey: ["/api/trips"],
  });

  const { data: destinations, isLoading: destsLoading } = useQuery<Destination[]>({
    queryKey: ["/api/destinations"],
  });

  const isLoading = tripsLoading || destsLoading;

  function downloadDeadlinesCSV() {
    fetch("/api/deadlines")
      .then((r) => r.json())
      .then((deadlines: Deadline[]) => {
        const today = startOfDay(new Date());
        const headers = ["Name", "Category", "Country", "Frequency", "Day", "Month", "Last Done", "Next Due", "Days Left", "Auto Payment", "Snoozed Until", "Notes"];
        const rows = deadlines.map((d) => {
          const nextDue = computeDeadlineNextDue(d, today);
          const daysLeft = nextDue ? differenceInDays(nextDue, today) : "";
          const nextDueStr = nextDue ? format(nextDue, "yyyy-MM-dd") : "";
          const esc = (v: string | null | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;
          return [
            esc(d.name), esc(d.category), esc(d.country), esc(d.frequency),
            d.day ?? "", d.month ?? "", esc(d.lastDone),
            nextDueStr, daysLeft,
            d.autoPayment ? "Yes" : "No", esc(d.snoozedUntil), esc(d.notes),
          ].join(",");
        });
        const csv = [headers.join(","), ...rows].join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `deadlines-${format(new Date(), "yyyy-MM-dd")}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      });
  }

  const sortedTrips = trips
    ?.slice()
    .sort((a, b) => new Date(a.arrivalDate).getTime() - new Date(b.arrivalDate).getTime());

  const upcomingTrips = sortedTrips?.filter(
    (t) => differenceInDays(new Date(t.arrivalDate), new Date()) >= 0
  );
  const pastTrips = sortedTrips?.filter(
    (t) => differenceInDays(new Date(t.arrivalDate), new Date()) < 0
  );

  return (
    <div className="h-full flex overflow-hidden">
      <InfoSidebar width={sidebarWidth} />

      {/* Sidebar resize handle */}
      <div
        className="w-1 flex-shrink-0 cursor-col-resize hover:bg-primary/30 active:bg-primary/50 transition-colors"
        onMouseDown={(e) => startDrag("sidebar", e, sidebarWidth)}
        title="Drag to resize"
      />

      {/* Main area — flex column, no outer scroll */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Fixed header */}
        <div className="pl-3 pr-6 pt-4 pb-3 shrink-0 flex items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Your upcoming trips and tasks at a glance</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={downloadDeadlinesCSV}
              className="gap-2"
              data-testid="button-download-csv"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setNewsOpen(true)}
              className="gap-2"
              data-testid="button-open-news"
            >
              <Newspaper className="w-4 h-4" />
              World News
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => emailMutation.mutate()}
              disabled={emailMutation.isPending}
              className="gap-2"
              data-testid="button-send-email-dashboard"
            >
              <Mail className="w-4 h-4" />
              {emailMutation.isPending ? "Sending…" : "Email deadlines"}
            </Button>
            <Link href="/trips/new">
              <Button data-testid="button-new-trip">
                <Plane className="w-4 h-4 mr-2" />
                Plan Trip
              </Button>
            </Link>
          </div>
        </div>

        {/* Scrollable content — each column scrolls independently */}
        <div className="flex-1 overflow-hidden pl-3 pr-6 pb-6 min-h-0 flex flex-col gap-4">
          {isLoading ? (
            <div className="flex-1 min-h-0 flex overflow-hidden">
              <div className="flex-1 min-w-0 space-y-4">
                <Skeleton className="h-56 w-full" />
                <Skeleton className="h-48 w-full" />
              </div>
              <div className="w-1 flex-shrink-0 cursor-col-resize" onMouseDown={(e) => startDrag("right", e, rightColWidth)} />
              <div className="flex-shrink-0" style={{ width: rightColWidth }}>
                <Skeleton className="h-full w-full" />
              </div>
            </div>
          ) : !trips || trips.length === 0 ? (
            <div className="flex-1 min-h-0 flex overflow-hidden">
              <div className="flex-1 min-w-0 overflow-y-auto min-h-0 space-y-4 pr-1">
                <TDLTile />
                <FriendsBox />
              </div>
              <div
                className="w-1 flex-shrink-0 cursor-col-resize hover:bg-primary/30 active:bg-primary/50 transition-colors mx-1.5"
                onMouseDown={(e) => startDrag("right", e, rightColWidth)}
                title="Drag to resize"
              />
              <div className="flex-shrink-0 overflow-y-auto min-h-0" style={{ width: rightColWidth }}>
                <Card className="h-full">
                  <CardContent className="flex flex-col items-center justify-center h-full">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                      <Plane className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-1">No trips planned yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Start by planning your next trip to see your task checklist
                    </p>
                    <Link href="/trips/new">
                      <Button data-testid="button-plan-first-trip">Plan your first trip</Button>
                    </Link>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <div className="flex-1 min-h-0 flex overflow-hidden">
              {/* Left column — TDL at top, then trip actions below */}
              <div className="flex-1 min-w-0 overflow-y-auto space-y-4 min-h-0 pr-1">
                <TDLTile />
                <FriendsBox />
                {destinations && <TodaysActions destinations={destinations} />}

                {pastTrips && pastTrips.length > 0 && (
                  <section>
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                      Past Trips
                    </h2>
                    <div className="space-y-4">
                      {pastTrips.map((trip) => (
                        <TripCard key={trip.id} trip={trip} destinations={destinations ?? []} />
                      ))}
                    </div>
                  </section>
                )}
              </div>

              {/* Right column resize handle */}
              <div
                className="w-1 flex-shrink-0 cursor-col-resize hover:bg-primary/30 active:bg-primary/50 transition-colors mx-1.5"
                onMouseDown={(e) => startDrag("right", e, rightColWidth)}
                title="Drag to resize"
              />

              {/* Right column — overdue + deadline boxes */}
              <div className="flex-shrink-0 overflow-y-auto min-h-0 space-y-4 pr-1" style={{ width: rightColWidth }}>
                {destinations && <OverdueTripTasks destinations={destinations} />}
                <ExpiredDeadlines />
                <UpcomingDeadlines />
                <NotPriorityDeadlines />
              </div>
            </div>
          )}

        </div>
      </div>

      {/* World News Dialog */}
      <Dialog open={newsOpen} onOpenChange={setNewsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Newspaper className="w-5 h-5" />
              World News
            </DialogTitle>
          </DialogHeader>
          <NewsDialogContent />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NewsDialogContent() {
  const { data: alertsData, isLoading } = useQuery<Alert[]>({
    queryKey: ["/api/alerts"],
    staleTime: DAILY,
    refetchInterval: DAILY,
  });

  if (isLoading) return <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;
  if (!alertsData || alertsData.length === 0) return <p className="text-muted-foreground text-sm">No news available.</p>;

  return (
    <div className="space-y-2">
      {alertsData.map((alert, i) => (
        <div key={i} className="flex gap-3 px-3 py-2.5 rounded-lg bg-muted/40 border" data-testid={`news-item-${i}`}>
          <Newspaper className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm leading-snug font-medium">{alert.title}</p>
            {alert.pubDate && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {new Date(alert.pubDate).toLocaleString()}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
