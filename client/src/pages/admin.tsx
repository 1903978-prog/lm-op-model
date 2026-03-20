import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Destination, Task, DeadlineCategory } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
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
  const [daysValue, setDaysValue] = useState(String(task.advanceDays));

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
    <div
      className="flex items-center justify-between gap-3 p-3 rounded-md bg-muted/50"
      data-testid={`task-item-${task.id}`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{task.title}</span>
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
        </Tabs>
      </div>
    </div>
  );
}
