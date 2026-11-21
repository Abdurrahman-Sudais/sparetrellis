import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WAREHOUSES } from "@/data/catalogue";
import { Warehouse, CalendarRange } from "lucide-react";

export function WarehouseSelect({ value, onChange, className = "w-[210px]" }: { value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className} aria-label="Warehouse">
        <span className="flex items-center gap-2 truncate">
          <Warehouse className="h-4 w-4 text-steel-500" />
          <SelectValue />
        </span>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All warehouses</SelectItem>
        {WAREHOUSES.map((w) => (
          <SelectItem key={w.id} value={w.id}>
            {w.code} · {w.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export const DATE_RANGES = [
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "180", label: "Last 6 months" },
  { value: "all", label: "All time" },
];

export function DateRangeSelect({ value, onChange, className = "w-[170px]" }: { value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className} aria-label="Date range">
        <span className="flex items-center gap-2 truncate">
          <CalendarRange className="h-4 w-4 text-steel-500" />
          <SelectValue />
        </span>
      </SelectTrigger>
      <SelectContent>
        {DATE_RANGES.map((d) => (
          <SelectItem key={d.value} value={d.value}>
            {d.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
