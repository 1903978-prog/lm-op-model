import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Destination, Trip } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useState } from "react";
import { Plane, MapPin, Calendar, ArrowLeft, Plus, Check, X, Trash2, Pencil } from "lucide-react";
import { Link } from "wouter";

const PRESET_COLORS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b",
  "#8b5cf6", "#ec4899", "#06b6d4", "#f97316",
  "#6366f1", "#14b8a6",
];

export default function NewTrip() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [destinationId, setDestinationId] = useState("");
  const [arrivalDate, setArrivalDate] = useState("");
  const [notes, setNotes] = useState("");

  const [addingDest, setAddingDest] = useState(false);
  const [newDestName, setNewDestName] = useState("");
  const [newDestColor, setNewDestColor] = useState(PRESET_COLORS[0]);

  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [editingDate, setEditingDate] = useState("");

  const { data: destinations, isLoading } = useQuery<Destination[]>({
    queryKey: ["/api/destinations"],
  });

  const { data: trips } = useQuery<Trip[]>({
    queryKey: ["/api/trips"],
  });

  const deleteTripMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/trips/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
      toast({ title: "Trip deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateTripMutation = useMutation({
    mutationFn: async ({ id, arrivalDate }: { id: string; arrivalDate: string }) => {
      await apiRequest("PATCH", `/api/trips/${id}`, { arrivalDate });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
      setEditingTripId(null);
      toast({ title: "Date updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/trips", {
        destinationId,
        arrivalDate,
        notes: notes || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trips"] });
      toast({ title: "Trip planned!", description: "Your task checklist has been generated." });
      setLocation("/");
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const addDestMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/destinations", {
        name: newDestName.trim(),
        icon: "MapPin",
        color: newDestColor,
      });
      return res.json() as Promise<Destination>;
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["/api/destinations"] });
      setDestinationId(created.id);
      setAddingDest(false);
      setNewDestName("");
      setNewDestColor(PRESET_COLORS[0]);
      toast({ title: "Destination added", description: `"${created.name}" is now available.` });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const selectedDest = destinations?.find((d) => d.id === destinationId);

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-xl mx-auto p-6">
        <Link href="/">
          <Button variant="ghost" className="mb-4 -ml-2" data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Plan a Trip</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Select your destination and arrival date to generate your task checklist
          </p>
        </div>

        {/* Existing Trips */}
        {trips && trips.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="w-4 h-4" />
                Existing Trips
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {trips.map((trip) => {
                const dest = destinations?.find((d) => d.id === trip.destinationId);
                return (
                  <div key={trip.id} className="flex items-center gap-3 p-3 rounded-md border">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: dest?.color ?? "#888" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{dest?.name ?? "Unknown"}</p>
                      {editingTripId === trip.id ? (
                        <div className="flex items-center gap-2 mt-1">
                          <Input
                            type="date"
                            value={editingDate}
                            onChange={(e) => setEditingDate(e.target.value)}
                            className="h-7 text-xs w-36"
                          />
                          <Button
                            size="sm"
                            className="h-7 px-2"
                            disabled={!editingDate || updateTripMutation.isPending}
                            onClick={() => updateTripMutation.mutate({ id: trip.id, arrivalDate: editingDate })}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2"
                            onClick={() => setEditingTripId(null)}
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">{trip.arrivalDate}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={() => { setEditingTripId(trip.id); setEditingDate(trip.arrivalDate); }}
                        title="Edit date"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => deleteTripMutation.mutate(trip.id)}
                        title="Delete trip"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Plane className="w-4 h-4" />
              Trip Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="destination">Destination</Label>
              {isLoading ? (
                <Skeleton className="h-9 w-full" />
              ) : (
                <Select value={destinationId} onValueChange={setDestinationId}>
                  <SelectTrigger data-testid="select-destination">
                    <SelectValue placeholder="Select a destination" />
                  </SelectTrigger>
                  <SelectContent>
                    {destinations?.map((dest) => (
                      <SelectItem key={dest.id} value={dest.id} data-testid={`option-dest-${dest.id}`}>
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
              )}

              {/* Add new destination inline */}
              {!addingDest ? (
                <button
                  type="button"
                  onClick={() => setAddingDest(true)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
                  data-testid="button-add-destination"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add new destination
                </button>
              ) : (
                <div className="mt-2 p-3 border rounded-lg bg-muted/20 space-y-3" data-testid="form-new-destination">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">New destination</p>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Name</Label>
                    <Input
                      autoFocus
                      placeholder="e.g. Japan"
                      value={newDestName}
                      onChange={(e) => setNewDestName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newDestName.trim()) addDestMutation.mutate();
                        if (e.key === "Escape") { setAddingDest(false); setNewDestName(""); }
                      }}
                      className="h-8 text-sm"
                      data-testid="input-new-dest-name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Color</Label>
                    <div className="flex items-center gap-2 flex-wrap">
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setNewDestColor(c)}
                          className="w-6 h-6 rounded-full border-2 transition-all"
                          style={{
                            backgroundColor: c,
                            borderColor: newDestColor === c ? "#1e293b" : "transparent",
                            transform: newDestColor === c ? "scale(1.2)" : "scale(1)",
                          }}
                          data-testid={`color-swatch-${c}`}
                        />
                      ))}
                      <input
                        type="color"
                        value={newDestColor}
                        onChange={(e) => setNewDestColor(e.target.value)}
                        className="w-6 h-6 rounded cursor-pointer border border-border"
                        title="Custom color"
                        data-testid="input-dest-color"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      className="h-7 px-3 gap-1 text-xs"
                      disabled={!newDestName.trim() || addDestMutation.isPending}
                      onClick={() => addDestMutation.mutate()}
                      data-testid="button-confirm-new-dest"
                    >
                      <Check className="w-3.5 h-3.5" />
                      {addDestMutation.isPending ? "Adding…" : "Add"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() => { setAddingDest(false); setNewDestName(""); }}
                      data-testid="button-cancel-new-dest"
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {selectedDest && (
              <div
                className="flex items-center gap-3 p-3 rounded-md"
                style={{ backgroundColor: selectedDest.color + "10" }}
              >
                <MapPin className="w-5 h-5" style={{ color: selectedDest.color }} />
                <div>
                  <p className="text-sm font-medium">{selectedDest.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Tasks will be auto-generated based on this destination
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="arrival-date">Arrival Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="arrival-date"
                  type="date"
                  value={arrivalDate}
                  onChange={(e) => setArrivalDate(e.target.value)}
                  className="pl-10"
                  data-testid="input-arrival-date"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes for this trip..."
                className="resize-none"
                data-testid="input-notes"
              />
            </div>

            <Button
              className="w-full"
              disabled={!destinationId || !arrivalDate || createMutation.isPending}
              onClick={() => createMutation.mutate()}
              data-testid="button-create-trip"
            >
              {createMutation.isPending ? "Creating..." : "Plan Trip & Generate Checklist"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
