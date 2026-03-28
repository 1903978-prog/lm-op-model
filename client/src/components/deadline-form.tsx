import { useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertDeadlineSchema } from "@shared/schema";
import type { DeadlineCategory } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DialogFooter } from "@/components/ui/dialog";
import { ChevronDown } from "lucide-react";

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const FREQUENCIES = [
  "annual",
  "every_2_years",
  "every_3_years",
  "every_4_years",
  "one-off",
];

export const CATEGORIES = [
  "car insurance",
  "car inspection",
  "car tax",
  "company filing",
  "insurance",
  "property insurance",
  "property tax",
  "tax",
  "utility admin",
  "waste tax",
];

export const formSchema = insertDeadlineSchema.extend({
  name: z.string().min(1, "Name is required"),
});

export type FormValues = z.infer<typeof formSchema>;

export const emptyForm: FormValues = {
  name: "",
  category: "",
  country: "",
  frequency: "",
  day: undefined,
  month: undefined,
  year: new Date().getFullYear(),
  lastDone: "",
  reminderDaysBefore: undefined,
  notes: "",
  autoPayment: false,
};

// Step-by-step Day → Month → Year picker (for deadline due date)
const PICKER_YEARS = Array.from({ length: 7 }, (_, i) => new Date().getFullYear() - 1 + i);

export function DayMonthPicker({
  day,
  month,
  year,
  onDayChange,
  onMonthChange,
  onYearChange,
  testId,
}: {
  day: number | undefined;
  month: number | undefined;
  year: number | undefined;
  onDayChange: (d: number | undefined) => void;
  onMonthChange: (m: number | undefined) => void;
  onYearChange: (y: number | undefined) => void;
  testId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"day" | "month" | "year">("day");

  function handleOpen(o: boolean) {
    setOpen(o);
    if (o) setStep("day");
  }

  function pickDay(d: number) {
    onDayChange(d);
    setStep("month");
  }

  function pickMonth(m: number) {
    onMonthChange(m);
    // Clamp day if it exceeds the max days for the selected month
    if (day !== undefined) {
      const maxDay = new Date(displayYear, m, 0).getDate(); // day 0 of next month = last day of this month
      if (day > maxDay) onDayChange(maxDay);
    }
    setStep("year");
  }

  function pickYear(y: number) {
    onYearChange(y);
    setOpen(false);
    setStep("day");
  }

  const currentYear = new Date().getFullYear();
  const displayYear = year ?? currentYear;

  const label = day && month
    ? `${day} ${MONTHS[month - 1]} ${displayYear}`
    : day
    ? `Day ${day} — pick month`
    : "Select day, month & year";

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between font-normal text-left"
          data-testid={testId}
        >
          <span className={day || month ? "" : "text-muted-foreground"}>{label}</span>
          <ChevronDown className="w-4 h-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        {step === "day" && (
          <>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Day</p>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => pickDay(d)}
                  className={`text-xs py-1.5 rounded border text-center transition-colors ${
                    day === d
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-input hover:bg-muted"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </>
        )}
        {step === "month" && (
          <>
            <div className="flex items-center gap-2 mb-2">
              <button type="button" onClick={() => setStep("day")} className="text-xs text-muted-foreground underline">
                ← Day {day}
              </button>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Month</p>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {MONTHS.map((m, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => pickMonth(i + 1)}
                  className={`text-xs py-1.5 rounded border text-center transition-colors ${
                    month === i + 1
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-input hover:bg-muted"
                  }`}
                >
                  {m.slice(0, 3)}
                </button>
              ))}
            </div>
          </>
        )}
        {step === "year" && (
          <>
            <div className="flex items-center gap-2 mb-2">
              <button type="button" onClick={() => setStep("month")} className="text-xs text-muted-foreground underline">
                ← {day} {month ? MONTHS[month - 1].slice(0, 3) : ""}
              </button>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Year</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {PICKER_YEARS.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => pickYear(y)}
                  className={`text-sm py-2 rounded border text-center transition-colors ${
                    displayYear === y
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-input hover:bg-muted"
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          </>
        )}
        {(day || month) && (
          <button
            type="button"
            onClick={() => { onDayChange(undefined); onMonthChange(undefined); onYearChange(undefined); setOpen(false); }}
            className="w-full text-xs text-muted-foreground underline text-center mt-2"
          >
            Clear
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

// Step-by-step Month → Year picker (for "last done" date)
export function DayMonthYearPicker({
  value,
  onChange,
  testId,
}: {
  value: string;
  onChange: (val: string) => void;
  testId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"month" | "year">("month");
  const [pendingMonth, setPendingMonth] = useState<number | null>(null);

  const years = [2024, 2025, 2026, 2027];

  const selMonth = value ? Number(value.slice(5, 7)) : null;
  const selYear  = value ? Number(value.slice(0, 4)) : null;

  function handleOpen(o: boolean) {
    setOpen(o);
    if (o) {
      setStep("month");
      setPendingMonth(selMonth);
    }
  }

  function pickMonth(m: number) {
    setPendingMonth(m);
    setStep("year");
  }

  function pickYear(y: number) {
    const m = pendingMonth ?? 1;
    onChange(`${y}-${String(m).padStart(2, "0")}-01`);
    setOpen(false);
    setStep("month");
  }

  const label = selMonth && selYear
    ? `${MONTHS[selMonth - 1]} ${selYear}`
    : "Select month & year";

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between font-normal text-left"
          data-testid={testId}
        >
          <span className={value ? "" : "text-muted-foreground"}>{label}</span>
          <ChevronDown className="w-4 h-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        {step === "month" && (
          <>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Month</p>
            <div className="grid grid-cols-3 gap-1">
              {MONTHS.map((m, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => pickMonth(i + 1)}
                  className={`text-xs py-1.5 rounded border text-center transition-colors ${
                    pendingMonth === i + 1
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-input hover:bg-muted"
                  }`}
                >
                  {m.slice(0, 3)}
                </button>
              ))}
            </div>
          </>
        )}
        {step === "year" && (
          <>
            <div className="flex items-center gap-2 mb-2">
              <button type="button" onClick={() => setStep("month")} className="text-xs text-muted-foreground underline">
                ← {MONTHS[(pendingMonth ?? 1) - 1]?.slice(0, 3)}
              </button>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Year</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {years.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => pickYear(y)}
                  className={`text-sm py-2 rounded border text-center transition-colors ${
                    selYear === y
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-input hover:bg-muted"
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          </>
        )}
        {value && (
          <button
            type="button"
            onClick={() => { onChange(""); setOpen(false); }}
            className="w-full text-xs text-muted-foreground underline text-center mt-2"
          >
            Clear
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

// Keep old name as alias for any remaining references
export const MonthYearPicker = DayMonthYearPicker;

export function DeadlineForm({
  defaultValues,
  onSubmit,
  isPending,
}: {
  defaultValues: FormValues;
  onSubmit: (data: FormValues) => void;
  isPending: boolean;
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const { data: categoryRows } = useQuery<DeadlineCategory[]>({
    queryKey: ["/api/deadline-categories"],
  });
  const categoryList = categoryRows?.map((c) => c.name) ?? CATEGORIES;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Car insurance renewal" data-testid="input-deadline-name" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ""}>
                  <FormControl>
                    <SelectTrigger data-testid="select-deadline-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categoryList.map((c) => (
                      <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="country"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Country</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Italy" data-testid="input-deadline-country" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="frequency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Frequency</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ""}>
                  <FormControl>
                    <SelectTrigger data-testid="select-deadline-frequency">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {FREQUENCIES.map((f) => (
                      <SelectItem key={f} value={f}>{f.replace(/_/g, " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="day"
            render={({ field: dayField }) => (
              <FormField
                control={form.control}
                name="month"
                render={({ field: monthField }) => (
                  <FormField
                    control={form.control}
                    name="year"
                    render={({ field: yearField }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Due date (day, month &amp; year)</FormLabel>
                        <FormControl>
                          <DayMonthPicker
                            day={dayField.value ?? undefined}
                            month={monthField.value ?? undefined}
                            year={yearField.value ?? new Date().getFullYear()}
                            onDayChange={(d) => dayField.onChange(d)}
                            onMonthChange={(m) => monthField.onChange(m)}
                            onYearChange={(y) => yearField.onChange(y)}
                            testId="picker-deadline-day-month"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              />
            )}
          />

          <FormField
            control={form.control}
            name="lastDone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last done</FormLabel>
                <FormControl>
                  <MonthYearPicker
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    testId="picker-deadline-last-done"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem className="col-span-2">
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea placeholder="Any additional notes..." data-testid="input-deadline-notes" {...field} value={field.value ?? ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <DialogFooter>
          <Button type="submit" disabled={isPending} data-testid="button-deadline-submit">
            {isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
