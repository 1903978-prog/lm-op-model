import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { PackingList, PackingItem } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Trash2, Upload, Luggage, RotateCcw, ChevronDown, ChevronRight,
  CheckSquare, Square, Edit2, Check, X, Tag,
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
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const bracketMatch = trimmed.match(/^\[([^\]]+)\]\s*(.+)$/);
      if (bracketMatch) { result.push({ name: bracketMatch[2].trim(), category: bracketMatch[1].trim() }); continue; }
      const colonMatch = trimmed.match(/^([^:]{1,30}):\s*(.+)$/);
      if (colonMatch) { result.push({ name: colonMatch[2].trim(), category: colonMatch[1].trim() }); continue; }
      result.push({ name: trimmed, category: null });
    }
  }
  return result;
}

// ── ItemRow ───────────────────────────────────────────────────────────────────

function ItemRow({ item, listId }: { item: PackingItem; listId: string }) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(item.name);

  const toggleMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/packing-items/${item.id}`, { packed: !item.packed }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/packing-lists", listId, "items"] }),
  });

  const renameMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/packing-items/${item.id}`, { name: editName.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/packing-lists", listId, "items"] });
      setEditing(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/packing-items/${item.id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/packing-lists", listId, "items"] }),
  });

  function startEdit() { setEditName(item.name); setEditing(true); }

  return (
    <div className={`group flex items-start gap-2.5 px-2.5 py-1.5 rounded-md transition-colors ${item.packed ? "opacity-50" : "hover:bg-muted/40"}`}>
      <button onClick={() => toggleMutation.mutate()} className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary transition-colors">
        {item.packed ? <CheckSquare className="w-4 h-4 text-green-600" /> : <Square className="w-4 h-4" />}
      </button>

      {editing ? (
        <div className="flex-1 flex gap-1.5 items-center">
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") renameMutation.mutate(); if (e.key === "Escape") setEditing(false); }}
            className="h-7 text-sm flex-1"
            autoFocus
          />
          <button onClick={() => renameMutation.mutate()} className="text-green-600 hover:text-green-700 shrink-0"><Check className="w-4 h-4" /></button>
          <button onClick={() => setEditing(false)} className="text-muted-foreground hover:text-foreground shrink-0"><X className="w-4 h-4" /></button>
        </div>
      ) : (
        <span className={`flex-1 text-sm leading-snug ${item.packed ? "line-through text-muted-foreground" : ""}`}>
          {item.name}
        </span>
      )}

      {!editing && (
        <>
          <button onClick={startEdit} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => deleteMutation.mutate()} className="shrink-0 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </>
      )}
    </div>
  );
}

// ── CategoryGroup ─────────────────────────────────────────────────────────────

function CategoryGroup({
  category, items, listId, onRename,
}: {
  category: string;
  items: PackingItem[];
  listId: string;
  onRename: (oldCat: string, newCat: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(category);
  const [addingInline, setAddingInline] = useState(false);
  const [inlineName, setInlineName] = useState("");
  const { toast } = useToast();

  const packed = items.filter((i) => i.packed).length;

  const addMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", `/api/packing-lists/${listId}/items`, {
        name: inlineName.trim(),
        category: category === "General" ? null : category,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/packing-lists", listId, "items"] });
      setInlineName("");
      setAddingInline(false);
    },
    onError: () => toast({ title: "Failed to add item", variant: "destructive" }),
  });

  function commitRename() {
    const trimmed = draftName.trim();
    if (!trimmed || trimmed === category) { setEditingName(false); return; }
    onRename(category, trimmed);
    setEditingName(false);
  }

  return (
    <div className="mb-3">
      {/* Category header */}
      <div className="flex items-center gap-1 group/cat">
        <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-1.5 flex-1 py-1 rounded hover:bg-muted/30 transition-colors min-w-0">
          {open ? <ChevronDown className="w-3.5 h-3.5 text-primary shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-primary shrink-0" />}
          {editingName ? (
            <div className="flex items-center gap-1 flex-1" onClick={(e) => e.stopPropagation()}>
              <Input
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") { setEditingName(false); setDraftName(category); } }}
                className="h-6 text-xs font-semibold uppercase tracking-wider flex-1"
                autoFocus
              />
              <button onClick={commitRename} className="text-green-600 hover:text-green-700 shrink-0"><Check className="w-3.5 h-3.5" /></button>
              <button onClick={() => { setEditingName(false); setDraftName(category); }} className="text-muted-foreground hover:text-foreground shrink-0"><X className="w-3.5 h-3.5" /></button>
            </div>
          ) : (
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex-1 text-left truncate">
              {category}
            </span>
          )}
          <span className="text-xs text-muted-foreground shrink-0 font-normal normal-case tracking-normal mr-1">
            {packed}/{items.length}
          </span>
        </button>

        {!editingName && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover/cat:opacity-100 transition-opacity">
            <button
              onClick={() => { setDraftName(category); setEditingName(true); setOpen(true); }}
              title="Rename category"
              className="p-1 text-muted-foreground hover:text-foreground rounded transition-colors"
            >
              <Tag className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => { setAddingInline((v) => !v); setOpen(true); }}
              title="Add item here"
              className="p-1 text-muted-foreground hover:text-primary rounded transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Items */}
      {open && (
        <div className="mt-0.5 ml-1">
          {items.map((item) => <ItemRow key={item.id} item={item} listId={listId} />)}

          {/* Inline add within category */}
          {addingInline && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5">
              <Square className="w-4 h-4 text-muted-foreground/40 shrink-0" />
              <Input
                autoFocus
                placeholder={`Add to ${category}…`}
                value={inlineName}
                onChange={(e) => setInlineName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && inlineName.trim()) addMutation.mutate();
                  if (e.key === "Escape") { setAddingInline(false); setInlineName(""); }
                }}
                className="h-7 text-sm flex-1"
              />
              <button onClick={() => { if (inlineName.trim()) addMutation.mutate(); }} className="text-green-600 hover:text-green-700 shrink-0"><Check className="w-4 h-4" /></button>
              <button onClick={() => { setAddingInline(false); setInlineName(""); }} className="text-muted-foreground hover:text-foreground shrink-0"><X className="w-4 h-4" /></button>
            </div>
          )}

          {/* Show + button at bottom when not inline adding */}
          {!addingInline && (
            <button
              onClick={() => setAddingInline(true)}
              className="ml-6 mt-0.5 flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors opacity-0 group-hover/cat:opacity-100 py-0.5"
            >
              <Plus className="w-3 h-3" /> Add item
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── CategorySelect ─────────────────────────────────────────────────────────────

const NEW_CAT_KEY = "__new__";
const NO_CAT_KEY  = "__none__";

function CategorySelect({
  value, onChange, categories,
}: {
  value: string;
  onChange: (v: string) => void;
  categories: string[];
}) {
  const [showNew, setShowNew] = useState(false);
  const [newVal, setNewVal] = useState("");

  if (showNew) {
    return (
      <div className="flex gap-1 w-44">
        <Input
          autoFocus
          placeholder="Category name…"
          value={newVal}
          onChange={(e) => setNewVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { onChange(newVal.trim() || ""); setShowNew(false); }
            if (e.key === "Escape") { setShowNew(false); }
          }}
          className="h-8 text-sm flex-1"
        />
        <button onClick={() => { onChange(newVal.trim()); setShowNew(false); }} className="text-green-600 hover:text-green-700"><Check className="w-4 h-4" /></button>
        <button onClick={() => setShowNew(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
      </div>
    );
  }

  return (
    <Select
      value={value || NO_CAT_KEY}
      onValueChange={(v) => {
        if (v === NEW_CAT_KEY) { setNewVal(""); setShowNew(true); }
        else onChange(v === NO_CAT_KEY ? "" : v);
      }}
    >
      <SelectTrigger className="h-8 text-sm w-44">
        <SelectValue placeholder="Category…" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NO_CAT_KEY}>— No category —</SelectItem>
        {categories.map((cat) => (
          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
        ))}
        <SelectItem value={NEW_CAT_KEY}>＋ New category…</SelectItem>
      </SelectContent>
    </Select>
  );
}

// ── AddItemRow ─────────────────────────────────────────────────────────────────

function AddItemRow({ listId, categories }: { listId: string; categories: string[] }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
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
      <CategorySelect value={category} onChange={setCategory} categories={categories} />
      <Button size="sm" className="h-8 px-3" disabled={!name.trim() || addMutation.isPending} onClick={() => addMutation.mutate()}>
        <Plus className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}

// ── ListPane ──────────────────────────────────────────────────────────────────

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
      await Promise.all(items.filter((i) => i.packed).map((i) => apiRequest("PATCH", `/api/packing-items/${i.id}`, { packed: false })));
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

  // Rename all items in a category to a new category name
  async function renameCategory(oldCat: string, newCat: string) {
    const toRename = items.filter((i) => (i.category ?? "General") === oldCat);
    await Promise.all(
      toRename.map((i) =>
        apiRequest("PATCH", `/api/packing-items/${i.id}`, { category: newCat === "General" ? null : newCat })
      )
    );
    queryClient.invalidateQueries({ queryKey: ["/api/packing-lists", listId, "items"] });
    toast({ title: `Category renamed to "${newCat}"` });
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseUploadedFile(text, file.name);
      if (parsed.length === 0) { toast({ title: "No items found in file", variant: "destructive" }); return; }
      bulkMutation.mutate(parsed);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  const categories = Array.from(new Set(items.map((i) => i.category ?? "General"))).sort();
  const packed = items.filter((i) => i.packed).length;
  const total = items.length;
  const pct = total > 0 ? Math.round((packed / total) * 100) : 0;

  const filteredItems = activeCategory ? items.filter((i) => (i.category ?? "General") === activeCategory) : items;
  const grouped = categories.reduce<Record<string, PackingItem[]>>((acc, cat) => {
    acc[cat] = filteredItems.filter((i) => (i.category ?? "General") === cat);
    return acc;
  }, {});

  if (isLoading) return <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Loading…</div>;

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-w-0">
      {/* Progress + actions */}
      <div className="px-5 pt-4 pb-3 shrink-0 border-b">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">
            {packed} / {total} packed{total > 0 && <span className="ml-1.5 text-xs">({pct}%)</span>}
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => resetMutation.mutate()} disabled={packed === 0 || resetMutation.isPending}>
              <RotateCcw className="w-3 h-3" /> Reset all
            </Button>
            <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => fileRef.current?.click()} disabled={bulkMutation.isPending}>
              <Upload className="w-3 h-3" /> Import file
            </Button>
            <input ref={fileRef} type="file" accept=".txt,.csv" className="hidden" onChange={handleFileUpload} />
          </div>
        </div>
        {total > 0 && (
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>

      {/* Category filter pills */}
      {categories.length > 1 && (
        <div className="px-5 py-2 flex items-center gap-1.5 flex-wrap border-b shrink-0">
          <button onClick={() => setActiveCategory(null)} className={`px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${activeCategory === null ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
            All
          </button>
          {categories.map((cat) => {
            const ci = items.filter((i) => (i.category ?? "General") === cat);
            const cp = ci.filter((i) => i.packed).length;
            return (
              <button key={cat} onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                className={`px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${activeCategory === cat ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                {cat} {cp}/{ci.length}
              </button>
            );
          })}
        </div>
      )}

      {/* Add item row */}
      <div className="px-5 pt-3 shrink-0">
        <AddItemRow listId={listId} categories={categories} />
      </div>

      {/* Items grouped by category */}
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
              <CategoryGroup key={cat} category={cat} items={its} listId={listId} onRename={renameCategory} />
            ))
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PackingPage() {
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newListName, setNewListName] = useState("");

  const { data: lists = [] } = useQuery<PackingList[]>({ queryKey: ["/api/packing-lists"] });

  const { data: allItems = [] } = useQuery<PackingItem[]>({
    queryKey: ["/api/packing-items-all"],
    queryFn: async () => {
      const results = await Promise.all(
        (lists as PackingList[]).map((l) => fetch(`/api/packing-lists/${l.id}/items`).then((r) => r.json() as Promise<PackingItem[]>))
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
    const its = allItems.filter((i) => i.listId === listId);
    return { total: its.length, packed: its.filter((i) => i.packed).length };
  }

  return (
    <div className="h-full flex overflow-hidden">
      {/* Left panel */}
      <div className="w-64 flex-shrink-0 border-r bg-muted/10 flex flex-col overflow-hidden">
        <div className="px-3 pt-4 pb-3 shrink-0">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">Packing Lists</h2>
          <div className="flex gap-1.5">
            <Input placeholder="New list name…" value={newListName} onChange={(e) => setNewListName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && newListName.trim()) createMutation.mutate(); }}
              className="h-8 text-sm flex-1" />
            <Button size="sm" className="h-8 px-2.5 shrink-0" disabled={!newListName.trim() || createMutation.isPending} onClick={() => createMutation.mutate()}>
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
              <div key={list.id} onClick={() => setSelectedId(list.id)}
                className={`group flex items-center gap-2 px-2.5 py-2.5 rounded-md cursor-pointer transition-colors ${active ? "bg-primary text-primary-foreground" : "hover:bg-muted/60 text-foreground"}`}>
                <Luggage className={`w-4 h-4 shrink-0 ${active ? "text-primary-foreground" : "text-muted-foreground"}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{list.name}</div>
                  {total > 0 && <div className={`text-xs mt-0.5 ${active ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{packed}/{total} · {pct}%</div>}
                  {total > 0 && (
                    <div className={`mt-1 h-1 rounded-full overflow-hidden ${active ? "bg-primary-foreground/30" : "bg-muted"}`}>
                      <div className={`h-full rounded-full transition-all ${active ? "bg-primary-foreground" : "bg-green-500"}`} style={{ width: `${pct}%` }} />
                    </div>
                  )}
                </div>
                <button onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(list.id); }}
                  className={`shrink-0 transition-colors opacity-0 group-hover:opacity-100 ${active ? "hover:text-red-300 text-primary-foreground/60" : "hover:text-destructive text-muted-foreground"}`}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
          {lists.length === 0 && <div className="px-2 py-6 text-center text-xs text-muted-foreground">No lists yet. Create one above.</div>}
        </div>
      </div>

      {/* Right panel */}
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
