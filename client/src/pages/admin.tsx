import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Destination, Task, DeadlineCategory, Friend, Place } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import {
  Settings,
  Plus,
  Trash2,
  MapPin,
  Globe,
  Clock,
  CalendarRange,
  Edit2,
  Check,
  X,
  Mail,
  RefreshCw,
  Info,
} from "lucide-react";

function DestinationManager() {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: destinations, isLoading } = useQuery<Destination[]>({
    queryKey: ["/api/destinations"],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/destinations", { name, color, icon: "MapPin" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/destinations"] });
      setName("");
      setColor("#3b82f6");
      setDialogOpen(false);
      toast({ title: "Destination added" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/destinations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/destinations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Destination removed" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">Destinations</h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-add-destination">
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Destination</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Spain"
                  data-testid="input-destination-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-10 h-10 rounded-md border cursor-pointer"
                    data-testid="input-destination-color"
                  />
                  <span className="text-sm text-muted-foreground">{color}</span>
                </div>
              </div>
              <Button
                className="w-full"
                disabled={!name || createMutation.isPending}
                onClick={() => createMutation.mutate()}
                data-testid="button-save-destination"
              >
                {createMutation.isPending ? "Adding..." : "Add Destination"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : destinations && destinations.length > 0 ? (
        <div className="space-y-2">
          {destinations.map((dest) => (
            <div
              key={dest.id}
              className="flex items-center justify-between gap-3 p-3 rounded-md bg-muted/50"
              data-testid={`destination-item-${dest.id}`}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full shrink-0"
                  style={{ backgroundColor: dest.color }}
                />
                <span className="text-sm font-medium">{dest.name}</span>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => deleteMutation.mutate(dest.id)}
                data-testid={`button-delete-destination-${dest.id}`}
              >
                <Trash2 className="w-4 h-4 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-6">No destinations yet</p>
      )}
    </div>
  );
}

function TaskManager() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [destinationId, setDestinationId] = useState("global");
  const [advanceDays, setAdvanceDays] = useState("0");
  const [isSeasonal, setIsSeasonal] = useState(false);
  const [seasonStart, setSeasonStart] = useState("1");
  const [seasonEnd, setSeasonEnd] = useState("12");

  const { data: tasks, isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: destinations } = useQuery<Destination[]>({
    queryKey: ["/api/destinations"],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const isGlobal = destinationId === "global";
      await apiRequest("POST", "/api/tasks", {
        title,
        destinationId: isGlobal ? null : destinationId,
        isGlobal,
        advanceDays: parseInt(advanceDays) || 0,
        seasonStart: isSeasonal ? parseInt(seasonStart) : null,
        seasonEnd: isSeasonal ? parseInt(seasonEnd) : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setTitle("");
      setDestinationId("global");
      setAdvanceDays("0");
      setIsSeasonal(false);
      setDialogOpen(false);
      toast({ title: "Task added" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Task removed" });
    },
  });

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const globalTasks = tasks?.filter((t) => t.isGlobal) ?? [];
  const destTaskGroups = destinations?.map((dest) => ({
    destination: dest,
    tasks: tasks?.filter((t) => t.destinationId === dest.id) ?? [],
  })) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">Tasks</h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-add-task">
              <Plus className="w-4 h-4 mr-1" />
              Add Task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Task Title</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Pay phone bill"
                  data-testid="input-task-title"
                />
              </div>

              <div className="space-y-2">
                <Label>Destination</Label>
                <Select value={destinationId} onValueChange={setDestinationId}>
                  <SelectTrigger data-testid="select-task-destination">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">
                      <div className="flex items-center gap-2">
                        <Globe className="w-3 h-3" />
                        Global (all trips)
                      </div>
                    </SelectItem>
                    {destinations?.map((dest) => (
                      <SelectItem key={dest.id} value={dest.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: dest.color }}
                          />
                          {dest.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Days in advance</Label>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <Input
                    type="number"
                    min="0"
                    value={advanceDays}
                    onChange={(e) => setAdvanceDays(e.target.value)}
                    className="w-24"
                    data-testid="input-advance-days"
                  />
                  <span className="text-sm text-muted-foreground">days before arrival</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={isSeasonal}
                    onCheckedChange={setIsSeasonal}
                    data-testid="switch-seasonal"
                  />
                  <Label className="cursor-pointer">Seasonal task</Label>
                </div>

                {isSeasonal && (
                  <div className="flex items-center gap-2">
                    <CalendarRange className="w-4 h-4 text-muted-foreground shrink-0" />
                    <Select value={seasonStart} onValueChange={setSeasonStart}>
                      <SelectTrigger className="w-[140px]" data-testid="select-season-start">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {months.map((m, i) => (
                          <SelectItem key={i} value={String(i + 1)}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-muted-foreground">to</span>
                    <Select value={seasonEnd} onValueChange={setSeasonEnd}>
                      <SelectTrigger className="w-[140px]" data-testid="select-season-end">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {months.map((m, i) => (
                          <SelectItem key={i} value={String(i + 1)}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <Button
                className="w-full"
                disabled={!title || createMutation.isPending}
                onClick={() => createMutation.mutate()}
                data-testid="button-save-task"
              >
                {createMutation.isPending ? "Adding..." : "Add Task"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {tasksLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <>
          {globalTasks.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Global Tasks (every trip)</span>
              </div>
              <div className="space-y-1">
                {globalTasks.map((task) => (
                  <TaskRow key={task.id} task={task} onDelete={() => deleteMutation.mutate(task.id)} />
                ))}
              </div>
            </div>
          )}

          {destTaskGroups.map(({ destination, tasks: dTasks }) => (
            <div key={destination.id}>
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: destination.color }}
                />
                <span className="text-sm font-medium text-muted-foreground">{destination.name}</span>
                <Badge variant="secondary" className="text-[10px]">
                  {dTasks.length}
                </Badge>
              </div>
              {dTasks.length > 0 ? (
                <div className="space-y-1">
                  {dTasks.map((task) => (
                    <TaskRow key={task.id} task={task} onDelete={() => deleteMutation.mutate(task.id)} />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground pl-5">No tasks</p>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function TaskRow({ task, onDelete }: { task: Task; onDelete: () => void }) {
  const { toast } = useToast();
  const [editingDays, setEditingDays] = useState(false);
  const [daysValue, setDaysValue]     = useState(String(task.advanceDays));
  const [notesOpen, setNotesOpen]     = useState(false);
  const [notesDraft, setNotesDraft]   = useState(task.notes ?? "");

  const updateMutation = useMutation({
    mutationFn: async (advanceDays: number) => {
      await apiRequest("PATCH", `/api/tasks/${task.id}`, { advanceDays });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setEditingDays(false);
      toast({ title: "Days updated" });
    },
  });

  const notesMutation = useMutation({
    mutationFn: async (notes: string) => {
      await apiRequest("PATCH", `/api/tasks/${task.id}`, { notes: notes.trim() || null });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setNotesOpen(false);
      toast({ title: "Notes saved" });
    },
  });

  const handleSaveDays = () => {
    const num = parseInt(daysValue);
    if (isNaN(num) || num < 0) return;
    updateMutation.mutate(num);
  };

  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];

  return (
    <>
    <div
      className="flex items-center justify-between gap-3 p-3 rounded-md bg-muted/50"
      data-testid={`task-item-${task.id}`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{task.title}</span>
          <button
            type="button"
            onClick={() => { setNotesDraft(task.notes ?? ""); setNotesOpen(true); }}
            title={task.notes ? "View / edit notes" : "Add notes"}
            className={`transition-colors ${task.notes ? "text-primary hover:text-primary/80" : "text-muted-foreground/30 hover:text-muted-foreground"}`}
          >
            <Info className="w-3.5 h-3.5" />
          </button>
          {editingDays ? (
            <div className="flex items-center gap-1">
              <Input
                type="number"
                min="0"
                value={daysValue}
                onChange={(e) => setDaysValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveDays();
                  if (e.key === "Escape") { setEditingDays(false); setDaysValue(String(task.advanceDays)); }
                }}
                className="w-16 h-7 text-xs"
                autoFocus
                data-testid={`input-edit-days-${task.id}`}
              />
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={handleSaveDays}
                disabled={updateMutation.isPending}
                data-testid={`button-save-days-${task.id}`}
              >
                <Check className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={() => { setEditingDays(false); setDaysValue(String(task.advanceDays)); }}
                data-testid={`button-cancel-days-${task.id}`}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <Badge
              variant="secondary"
              className="text-[10px] cursor-pointer"
              onClick={() => setEditingDays(true)}
              data-testid={`badge-advance-days-${task.id}`}
            >
              <Clock className="w-3 h-3 mr-1" />
              {task.advanceDays}d advance
            </Badge>
          )}
          {task.seasonStart !== null && task.seasonEnd !== null && (
            <Badge variant="secondary" className="text-[10px]">
              {months[task.seasonStart - 1]}-{months[task.seasonEnd - 1]}
            </Badge>
          )}
        </div>
      </div>
      <Button
        size="icon"
        variant="ghost"
        onClick={onDelete}
        data-testid={`button-delete-task-${task.id}`}
      >
        <Trash2 className="w-4 h-4 text-muted-foreground" />
      </Button>
    </div>

    <Dialog open={notesOpen} onOpenChange={(v) => { if (!v) setNotesOpen(false); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Info className="w-4 h-4 text-muted-foreground" />
            Notes — {task.title}
          </DialogTitle>
        </DialogHeader>
        <Textarea
          value={notesDraft}
          onChange={(e) => setNotesDraft(e.target.value)}
          rows={7}
          className="resize-none text-sm leading-relaxed"
          placeholder="Add notes, reference numbers, instructions…"
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => setNotesOpen(false)}>Cancel</Button>
          <Button onClick={() => notesMutation.mutate(notesDraft)} disabled={notesMutation.isPending}>
            Save notes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

function CategoryManager() {
  const { toast } = useToast();
  const [name, setName] = useState("");

  const { data: categories, isLoading } = useQuery<DeadlineCategory[]>({
    queryKey: ["/api/deadline-categories"],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/deadline-categories", { name: name.trim().toLowerCase() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deadline-categories"] });
      setName("");
      toast({ title: "Category added" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/deadline-categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/deadline-categories"] });
      toast({ title: "Category removed" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">Deadline Categories</h3>
      </div>

      <div className="flex gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. council tax"
          className="flex-1"
          onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) createMutation.mutate(); }}
          data-testid="input-category-name"
        />
        <Button
          onClick={() => createMutation.mutate()}
          disabled={!name.trim() || createMutation.isPending}
          data-testid="button-add-category"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : categories && categories.length > 0 ? (
        <div className="space-y-1.5">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center justify-between gap-3 px-3 py-2 rounded-md bg-muted/50"
              data-testid={`category-item-${cat.id}`}
            >
              <span className="text-sm capitalize">{cat.name}</span>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={() => deleteMutation.mutate(cat.id)}
                data-testid={`button-delete-category-${cat.id}`}
              >
                <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-6">No categories yet</p>
      )}
    </div>
  );
}

function PlaceManager() {
  const { toast } = useToast();
  const [newPlace, setNewPlace] = useState("");

  const { data: placesList, isLoading } = useQuery<Place[]>({
    queryKey: ["/api/places"],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/places", { name: newPlace.trim() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/places"] });
      setNewPlace("");
      toast({ title: "Place added" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/places/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/places"] });
      toast({ title: "Place removed" });
    },
  });

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Locations</h4>
      <div className="flex gap-2">
        <Input
          value={newPlace}
          onChange={(e) => setNewPlace(e.target.value)}
          placeholder="e.g. Singapore"
          className="flex-1 h-8 text-sm"
          onKeyDown={(e) => { if (e.key === "Enter" && newPlace.trim()) createMutation.mutate(); }}
        />
        <Button size="sm" disabled={!newPlace.trim() || createMutation.isPending} onClick={() => createMutation.mutate()}>
          <Plus className="w-3.5 h-3.5 mr-1" />Add
        </Button>
      </div>
      {isLoading ? <Skeleton className="h-20 w-full" /> : (
        <div className="flex flex-wrap gap-1.5">
          {(placesList ?? []).map((p) => (
            <div key={p.id} className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted/60 text-sm">
              <MapPin className="w-3 h-3 text-muted-foreground" />
              <span>{p.name}</span>
              <button type="button" onClick={() => deleteMutation.mutate(p.id)} className="ml-1 text-muted-foreground hover:text-destructive transition-colors">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          {(placesList ?? []).length === 0 && <p className="text-xs text-muted-foreground">No locations yet.</p>}
        </div>
      )}
    </div>
  );
}

function FriendManager() {
  const { toast } = useToast();
  const { data: friendsList, isLoading } = useQuery<Friend[]>({
    queryKey: ["/api/friends"],
  });
  const { data: placesList } = useQuery<Place[]>({
    queryKey: ["/api/places"],
  });

  // Add new friend
  const [addingOpen, setAddingOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newLocation, setNewLocation] = useState("__none__");
  const [newKeepInTouch, setNewKeepInTouch] = useState(true);

  // Edit existing friend
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editLocation, setEditLocation] = useState("__none__");
  const [editKeepInTouch, setEditKeepInTouch] = useState(true);

  // Multi-select bulk assign
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLocation, setBulkLocation] = useState("__none__");

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
    setBulkLocation("__none__");
  }

  const bulkMutation = useMutation({
    mutationFn: async () => {
      const loc = bulkLocation === "__none__" ? null : bulkLocation;
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          apiRequest("PATCH", `/api/friends/${id}`, { location: loc })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
      clearSelection();
      toast({ title: `${selectedIds.size} friend${selectedIds.size > 1 ? "s" : ""} assigned` });
    },
    onError: () => toast({ title: "Bulk assign failed", variant: "destructive" }),
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/friends", {
        name: newName.trim(),
        location: newLocation === "__none__" ? null : newLocation,
        keepInTouch: newKeepInTouch,
        lastSpoke: new Date().toISOString().slice(0, 7) + "-01",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
      setNewName(""); setNewLocation("__none__"); setNewKeepInTouch(true); setAddingOpen(false);
      toast({ title: "Friend added" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, name, location, keepInTouch }: { id: string; name: string; location: string; keepInTouch: boolean }) => {
      await apiRequest("PATCH", `/api/friends/${id}`, {
        name: name.trim(),
        location: location === "__none__" ? null : location,
        keepInTouch,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
      setEditingId(null);
      toast({ title: "Friend updated" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/friends/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
      toast({ title: "Friend removed" });
    },
  });

  if (isLoading) return <Skeleton className="h-32 w-full" />;

  const places = placesList ?? [];

  // Group by location for display
  const list = friendsList ?? [];
  const groups: Record<string, Friend[]> = {};
  for (const f of list) {
    const key = f.location?.trim() || "No location";
    if (!groups[key]) groups[key] = [];
    groups[key].push(f);
  }
  const sortedKeys = Object.keys(groups).sort((a, b) =>
    a === "No location" ? 1 : b === "No location" ? -1 : a.localeCompare(b)
  );

  return (
    <div className="space-y-6">
      <PlaceManager />

      <div className="border-t pt-4" />

      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Friends</h3>
        <Button size="sm" onClick={() => setAddingOpen(true)}>
          <Plus className="w-4 h-4 mr-1" />Add
        </Button>
      </div>

      {/* Bulk assign bar — appears when friends are selected */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-primary/10 border border-primary/20">
          <span className="text-sm font-medium text-primary shrink-0">
            {selectedIds.size} selected
          </span>
          <Select value={bulkLocation} onValueChange={setBulkLocation}>
            <SelectTrigger className="h-8 text-sm flex-1">
              <SelectValue placeholder="Assign to location…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— No location —</SelectItem>
              {places.map((p) => (
                <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            className="h-8 px-3 shrink-0"
            disabled={bulkMutation.isPending}
            onClick={() => bulkMutation.mutate()}
          >
            <Check className="w-3.5 h-3.5 mr-1" />
            Assign
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2 shrink-0"
            onClick={clearSelection}
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {/* Add dialog */}
      <Dialog open={addingOpen} onOpenChange={setAddingOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Friend</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Marco" />
            </div>
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Select value={newLocation} onValueChange={setNewLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— No location —</SelectItem>
                  {places.map((p) => (
                    <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={newKeepInTouch} onCheckedChange={setNewKeepInTouch} />
              <Label>Keep in touch</Label>
            </div>
            <Button className="w-full" disabled={!newName.trim() || addMutation.isPending} onClick={() => addMutation.mutate()}>
              {addMutation.isPending ? "Adding…" : "Add Friend"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {list.length === 0 && <p className="text-sm text-muted-foreground">No friends yet.</p>}

      {sortedKeys.map((loc) => {
        const groupFriends = groups[loc];
        const allGroupSelected = groupFriends.every((f) => selectedIds.has(f.id));
        return (
        <div key={loc}>
          <div className="flex items-center gap-2 mb-2">
            <Checkbox
              checked={allGroupSelected && groupFriends.length > 0}
              onCheckedChange={() => {
                setSelectedIds((prev) => {
                  const next = new Set(prev);
                  if (allGroupSelected) groupFriends.forEach((f) => next.delete(f.id));
                  else groupFriends.forEach((f) => next.add(f.id));
                  return next;
                });
              }}
            />
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{loc}</p>
            <span className="text-xs text-muted-foreground">({groupFriends.length})</span>
          </div>
          <div className="space-y-1.5">
            {groups[loc].map((f) => (
              <div key={f.id} className="p-2.5 rounded-md bg-muted/50 space-y-2">
                {editingId === f.id ? (
                  <div className="space-y-2">
                    <Input autoFocus value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name" className="h-8 text-sm" />
                    <Select value={editLocation} onValueChange={setEditLocation}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— No location —</SelectItem>
                        {places.map((p) => (
                          <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-2">
                      <Switch checked={editKeepInTouch} onCheckedChange={setEditKeepInTouch} />
                      <span className="text-xs">Keep in touch</span>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="h-7 px-3" disabled={updateMutation.isPending}
                        onClick={() => updateMutation.mutate({ id: f.id, name: editName, location: editLocation, keepInTouch: editKeepInTouch })}>
                        <Check className="w-3.5 h-3.5 mr-1" />Save
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditingId(null)}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedIds.has(f.id)}
                      onCheckedChange={() => toggleSelect(f.id)}
                      className="shrink-0"
                    />
                    <span className={`w-2 h-2 rounded-full shrink-0 ${f.keepInTouch ? "bg-green-500" : "bg-muted-foreground/40"}`} title={f.keepInTouch ? "Keep in touch" : "Not tracked"} />
                    <span className="flex-1 text-sm font-medium truncate">{f.name}</span>
                    <button type="button" onClick={() => { setEditingId(f.id); setEditName(f.name); setEditLocation(f.location ?? "__none__"); setEditKeepInTouch(f.keepInTouch ?? true); }}
                      className="text-muted-foreground hover:text-foreground transition-colors">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={() => deleteMutation.mutate(f.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        );
      })}
    </div>
  );
}

export default function Admin() {
  const { toast } = useToast();

  const emailMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/send-test-email");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Email sent", description: "Overdue deadlines summary sent to your inbox." });
    },
    onError: () => {
      toast({ title: "Failed to send", description: "Check server logs for details.", variant: "destructive" });
    },
  });

  const reseedMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/force-reseed");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Database reseeded", description: "All data has been reset to defaults." });
      queryClient.invalidateQueries();
    },
    onError: () => {
      toast({ title: "Reseed failed", description: "Check server logs for details.", variant: "destructive" });
    },
  });

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-3xl mx-auto p-6">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2" data-testid="text-page-title">
              <Settings className="w-6 h-6" />
              Admin Panel
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your destinations and configure tasks for each location
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (confirm("This will wipe all data and reseed from defaults. Are you sure?")) {
                  reseedMutation.mutate();
                }
              }}
              disabled={reseedMutation.isPending}
              className="shrink-0 gap-2"
              data-testid="button-force-reseed"
            >
              <RefreshCw className="w-4 h-4" />
              {reseedMutation.isPending ? "Reseeding…" : "Force reseed DB"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => emailMutation.mutate()}
              disabled={emailMutation.isPending}
              className="shrink-0 gap-2"
              data-testid="button-send-email"
            >
              <Mail className="w-4 h-4" />
              {emailMutation.isPending ? "Sending…" : "Send overdue email"}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="tasks" className="space-y-6">
          <TabsList>
            <TabsTrigger value="tasks" data-testid="tab-tasks">Tasks</TabsTrigger>
            <TabsTrigger value="destinations" data-testid="tab-destinations">Destinations</TabsTrigger>
            <TabsTrigger value="categories" data-testid="tab-categories">Categories</TabsTrigger>
            <TabsTrigger value="friends">Friends</TabsTrigger>
          </TabsList>

          <TabsContent value="tasks">
            <Card>
              <CardContent className="pt-6">
                <TaskManager />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="destinations">
            <Card>
              <CardContent className="pt-6">
                <DestinationManager />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="categories">
            <Card>
              <CardContent className="pt-6">
                <CategoryManager />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="friends">
            <Card>
              <CardContent className="pt-6">
                <FriendManager />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
