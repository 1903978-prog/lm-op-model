import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { PackingList, PackingItem } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Trash2, Upload, Luggage, RotateCcw, ChevronDown, ChevronRight, CheckSquare, Square,
} from "lucide-react";

// ── helpers ───────────────────────────────────────────────────────────────────

function parseUploadedFile(text: string, filename: string): { name: string; category: string | null }[] {
  const isCsv = filename.toLowerCase().endsWith(".csv");
  const lines = text.split(/\r?\n/);
  const result: { name: string; category: string | null }[] = [];

  if (isCsv) {
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.toLowerCase().startsWith("name") || trimmed.toLowerCase().startsWith("item")) continue;
      const [name, cat] = trimmed.split(",").map((s) => s.trim());
      if (name) result.push({ name, category: cat || null });
    }
  } else {
    // Plain text: [Category] item  or  Category: item  or  just item
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const bracketMatch = trimmed.match(/^\[([^\]]+)\]\s*(.+)$/);
      if (bracketMatch) {
        result.push({ name: bracketMatch[2].trim(), category: bracketMatch[1].trim() });
        continue;
      }
      const colonMatch = trimmed.match(/^([^:]{1,30}):\s*(.+)$/);
      if (colonMatch) {
        result.push({ name: colonMatch[2].trim(), category: colonMatch[1].trim() });
        continue;
      }
      result.push({ name: trimmed, category: null });
    }
  }
  return result;
}

// ── sub-components ────────────────────────────────────────────────────────────

function ItemRow({ item, listId }: { item: PackingItem; listId: string }) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(item.name);

  const toggleMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/packing-items/${item.id}`, { packed: !item.packed }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/packing-lists", listId, "items"] }),
  });

  const renameMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/packing-items/${item.id}`, { name: editName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/packing-lists", listId, "items"] });
      setEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/packing-items/${item.id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/packing-lists", listId, "items"] }),
  });

  return (
    <div className={`group flex items-start gap-2.5 px-2.5 py-2 rounded-md transition-colors ${item.packed ? "opacity-50" : "hover:bg-muted/40"}`}>
      <button
        onClick={() => toggleMutation.mutate()}
        className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary transition-colors"
      >
        {item.packed
          ? <CheckSquare className="w-4 h-4 text-green-600" />
          : <Square className="w-4 h-4" />}
      </button>

      {editing ? (
        <div className="flex-1 flex gap-1.5">
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") renameMutation.mutate();
              if (e.key === "Escape") setEditing(false);
            }}
            className="h-7 text-sm"
            autoFocus
          />
          <Button size="sm" className="h-7 px-2 text-xs" onClick={() => renameMutation.mutate()}>Save</Button>
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditing(false)}>Cancel</Button>
        </div>
      ) : (
        <span
          className={`flex-1 text-sm leading-snug cursor-pointer ${item.packed ? "line-through text-muted-foreground" : ""}`}
          onDoubleClick={() => { setEditName(item.name); setEditing(true); }}
          title="Double-click to edit"
        >
          {item.name}
        </span>
      )}

      <button
        onClick={() => deleteMutation.mutate()}
        className="shrink-0 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function CategoryGroup({
  category,
  items,
  listId,
  defaultOpen = true,
}: {
  category: string;
  items: PackingItem[];
  listId: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const packed = items.filter((i) => i.packed).length;

  return (
    <div className="mb-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors rounded hover:bg-muted/30"
      >
        {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        <span className="flex-1 text-left">{category}</span>
        <span className="font-normal normal-case tracking-normal">
          {packed}/{items.length}
        </span>
      </button>
      {open && (
        <div className="mt-0.5 ml-1">
          {items.map((item) => (
            <ItemRow key={item.id} item={item} listId={listId} />
          ))}
        </div>
      )}
    </div>
  );
}

function AddItemRow({ listId, defaultCategory }: { listId: string; defaultCategory?: string }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState(defaultCategory ?? "");
  const { toast } = useToast();

  const addMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", `/api/packing-lists/${listId}/items`, {
        name: name.trim(),
        category: category.trim() || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/packing-lists", listId, "items"] });
      setName("");
    },
    onError: () => toast({ title: "Failed to add item", variant: "destructive" }),
  });

  return (
    <div className="flex gap-2 mb-4">
      <Input
        placeholder="New item…"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) addMutation.mutate(); }}
        className="flex-1 h-8 text-sm"
      />
      <Input
        placeholder="Category (optional)"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) addMutation.mutate(); }}
        className="w-40 h-8 text-sm"
      />
      <Button
        size="sm"
        className="h-8 px-3"
        disabled={!name.trim() || addMutation.isPending}
        onClick={() => addMutation.mutate()}
      >
        <Plus className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}

// ── main pane ─────────────────────────────────────────────────────────────────

function ListPane({ listId }: { listId: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const { data: items = [], isLoading } = useQuery<PackingItem[]>({
    queryKey: ["/api/packing-lists", listId, "items"],
    queryFn: () => fetch(`/api/packing-lists/${listId}/items`).then((r) => r.json()),
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      await Promise.all(
        items.filter((i) => i.packed).map((i) =>
          apiRequest("PATCH", `/api/packing-items/${i.id}`, { packed: false })
        )
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/packing-lists", listId, "items"] }),
  });

  const bulkMutation = useMutation({
    mutationFn: (newItems: { name: string; category: string | null }[]) =>
      apiRequest("POST", `/api/packing-lists/${listId}/items/bulk`, { items: newItems }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/packing-lists", listId, "items"] });
      toast({ title: "Items imported successfully" });
    },
    onError: () => toast({ title: "Import failed", variant: "destructive" }),
  });

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseUploadedFile(text, file.name);
      if (parsed.length === 0) {
        toast({ title: "No items found in file", variant: "destructive" });
        return;
      }
      bulkMutation.mutate(parsed);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  const categories = Array.from(new Set(items.map((i) => i.category ?? "General"))).sort();
  const packed = items.filter((i) => i.packed).length;
  const total = items.length;
  const pct = total > 0 ? Math.round((packed / total) * 100) : 0;

  const filteredItems = activeCategory
    ? items.filter((i) => (i.category ?? "General") === activeCategory)
    : items;

  const grouped = categories.reduce<Record<string, PackingItem[]>>((acc, cat) => {
    acc[cat] = filteredItems.filter((i) => (i.category ?? "General") === cat);
    return acc;
  }, {});

  if (isLoading) {
    return <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>;
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-w-0">
      {/* Progress bar + actions */}
      <div className="px-5 pt-4 pb-3 shrink-0 border-b">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">
            {packed} / {total} packed
            {total > 0 && <span className="ml-1.5 text-xs">({pct}%)</span>}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={() => resetMutation.mutate()}
              disabled={packed === 0 || resetMutation.isPending}
            >
              <RotateCcw className="w-3 h-3" />
              Reset all
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={() => fileRef.current?.click()}
              disabled={bulkMutation.isPending}
            >
              <Upload className="w-3 h-3" />
              Import file
            </Button>
            <input ref={fileRef} type="file" accept=".txt,.csv" className="hidden" onChange={handleFileUpload} />
          </div>
        </div>
        {total > 0 && (
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </div>

      {/* Category filter pills */}
      {categories.length > 1 && (
        <div className="px-5 py-2 flex items-center gap-1.5 flex-wrap border-b shrink-0">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${
              activeCategory === null
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            All
          </button>
          {categories.map((cat) => {
            const catItems = items.filter((i) => (i.category ?? "General") === cat);
            const catPacked = catItems.filter((i) => i.packed).length;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${
                  activeCategory === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat} {catPacked}/{catItems.length}
              </button>
            );
          })}
        </div>
      )}

      {/* Add item */}
      <div className="px-5 pt-3 shrink-0">
        <AddItemRow listId={listId} />
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto px-5 pb-6">
        {total === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-center">
            <Luggage className="w-10 h-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No items yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Add items above or import a .txt / .csv file.</p>
          </div>
        ) : (
          Object.entries(grouped)
            .filter(([, its]) => its.length > 0)
            .map(([cat, its]) => (
              <CategoryGroup key={cat} category={cat} items={its} listId={listId} />
            ))
        )}
      </div>
    </div>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function PackingPage() {
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newListName, setNewListName] = useState("");

  const { data: lists = [] } = useQuery<PackingList[]>({
    queryKey: ["/api/packing-lists"],
  });

  const { data: allItems = [] } = useQuery<PackingItem[]>({
    queryKey: ["/api/packing-items-all"],
    queryFn: async () => {
      // fetch counts for all lists at once
      const results = await Promise.all(
        (lists as PackingList[]).map((l) =>
          fetch(`/api/packing-lists/${l.id}/items`).then((r) => r.json() as Promise<PackingItem[]>)
        )
      );
      return results.flat();
    },
    enabled: lists.length > 0,
  });

  const createMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/packing-lists", { name: newListName.trim() }),
    onSuccess: (res) => {
      res.json().then((created: PackingList) => {
        queryClient.invalidateQueries({ queryKey: ["/api/packing-lists"] });
        setNewListName("");
        setSelectedId(created.id);
      });
    },
    onError: () => toast({ title: "Failed to create list", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/packing-lists/${id}`),
    onSuccess: (_res, id) => {
      queryClient.invalidateQueries({ queryKey: ["/api/packing-lists"] });
      if (selectedId === id) setSelectedId(null);
    },
    onError: () => toast({ title: "Failed to delete list", variant: "destructive" }),
  });

  const selectedList = lists.find((l) => l.id === selectedId);

  function getListStats(listId: string) {
    const items = allItems.filter((i) => i.listId === listId);
    const packed = items.filter((i) => i.packed).length;
    return { total: items.length, packed };
  }

  return (
    <div className="h-full flex overflow-hidden">
      {/* Left panel — list of packing lists */}
      <div className="w-64 flex-shrink-0 border-r bg-muted/10 flex flex-col overflow-hidden">
        <div className="px-3 pt-4 pb-3 shrink-0">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Packing Lists
          </h2>
          <div className="flex gap-1.5">
            <Input
              placeholder="New list name…"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && newListName.trim()) createMutation.mutate(); }}
              className="h-8 text-sm flex-1"
            />
            <Button
              size="sm"
              className="h-8 px-2.5 shrink-0"
              disabled={!newListName.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5">
          {lists.map((list) => {
            const { total, packed } = getListStats(list.id);
            const pct = total > 0 ? Math.round((packed / total) * 100) : 0;
            const active = selectedId === list.id;
            return (
              <div
                key={list.id}
                onClick={() => setSelectedId(list.id)}
                className={`group flex items-center gap-2 px-2.5 py-2.5 rounded-md cursor-pointer transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted/60 text-foreground"
                }`}
              >
                <Luggage className={`w-4 h-4 shrink-0 ${active ? "text-primary-foreground" : "text-muted-foreground"}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{list.name}</div>
                  {total > 0 && (
                    <div className={`text-xs mt-0.5 ${active ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      {packed}/{total} · {pct}%
                    </div>
                  )}
                  {total > 0 && (
                    <div className={`mt-1 h-1 rounded-full overflow-hidden ${active ? "bg-primary-foreground/30" : "bg-muted"}`}>
                      <div
                        className={`h-full rounded-full transition-all ${active ? "bg-primary-foreground" : "bg-green-500"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(list.id); }}
                  className={`shrink-0 transition-colors opacity-0 group-hover:opacity-100 ${
                    active ? "hover:text-red-300 text-primary-foreground/60" : "hover:text-destructive text-muted-foreground"
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}

          {lists.length === 0 && (
            <div className="px-2 py-6 text-center text-xs text-muted-foreground">
              No lists yet. Create one above.
            </div>
          )}
        </div>
      </div>

      {/* Right panel — items in selected list */}
      {selectedList ? (
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <div className="px-5 pt-4 pb-0 shrink-0">
            <h1 className="text-xl font-bold tracking-tight">{selectedList.name}</h1>
          </div>
          <ListPane key={selectedList.id} listId={selectedList.id} />
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 text-muted-foreground">
          <Luggage className="w-14 h-14 opacity-20" />
          <p className="text-sm">Select a list on the left to view and edit items.</p>
        </div>
      )}
    </div>
  );
}
