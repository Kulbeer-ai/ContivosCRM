import { useState } from "react";
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Stage, CrmUser, Company } from "@shared/schema";

export interface FilterValues {
  ownerId?: string;
  stageId?: string;
  companyId?: string;
  amountMin?: string;
  amountMax?: string;
  closeDateStart?: string;
  closeDateEnd?: string;
}

interface FilterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stages: Stage[];
  users: CrmUser[];
  companies: Company[];
  filters: FilterValues;
  onApply: (filters: FilterValues) => void;
}

export function FilterDialog({
  open,
  onOpenChange,
  stages,
  users,
  companies,
  filters,
  onApply,
}: FilterDialogProps) {
  const [localFilters, setLocalFilters] = useState<FilterValues>(filters);

  const handleApply = () => {
    onApply(localFilters);
    onOpenChange(false);
  };

  const handleClear = () => {
    const emptyFilters: FilterValues = {};
    setLocalFilters(emptyFilters);
    onApply(emptyFilters);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Filter Deals</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Owner</Label>
            <Select
              value={localFilters.ownerId || "all"}
              onValueChange={(value) =>
                setLocalFilters({ ...localFilters, ownerId: value === "all" ? undefined : value })
              }
            >
              <SelectTrigger data-testid="filter-owner">
                <SelectValue placeholder="All owners" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All owners</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.firstName} {user.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Stage</Label>
            <Select
              value={localFilters.stageId || "all"}
              onValueChange={(value) =>
                setLocalFilters({ ...localFilters, stageId: value === "all" ? undefined : value })
              }
            >
              <SelectTrigger data-testid="filter-stage">
                <SelectValue placeholder="All stages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All stages</SelectItem>
                {stages.map((stage) => (
                  <SelectItem key={stage.id} value={stage.id}>
                    {stage.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Company</Label>
            <Select
              value={localFilters.companyId || "all"}
              onValueChange={(value) =>
                setLocalFilters({ ...localFilters, companyId: value === "all" ? undefined : value })
              }
            >
              <SelectTrigger data-testid="filter-company">
                <SelectValue placeholder="All companies" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All companies</SelectItem>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Amount Range</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="Min"
                value={localFilters.amountMin || ""}
                onChange={(e) =>
                  setLocalFilters({ ...localFilters, amountMin: e.target.value })
                }
                data-testid="filter-amount-min"
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="number"
                placeholder="Max"
                value={localFilters.amountMax || ""}
                onChange={(e) =>
                  setLocalFilters({ ...localFilters, amountMax: e.target.value })
                }
                data-testid="filter-amount-max"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Close Date Range</Label>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={localFilters.closeDateStart || ""}
                onChange={(e) =>
                  setLocalFilters({ ...localFilters, closeDateStart: e.target.value })
                }
                data-testid="filter-date-start"
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="date"
                value={localFilters.closeDateEnd || ""}
                onChange={(e) =>
                  setLocalFilters({ ...localFilters, closeDateEnd: e.target.value })
                }
                data-testid="filter-date-end"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClear}>
            Clear All
          </Button>
          <Button onClick={handleApply} data-testid="button-apply-filters">
            Apply Filters
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
