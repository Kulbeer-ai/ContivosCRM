import { Search, Filter, SortAsc, BarChart3, Download, Save, LayoutGrid, Table2, Plus, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Pipeline } from "@shared/schema";

interface DealsHeaderProps {
  pipelines: Pipeline[];
  selectedPipelineId: string | null;
  onPipelineChange: (id: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  viewMode: "board" | "table";
  onViewModeChange: (mode: "board" | "table") => void;
  onAddDeal: () => void;
  onOpenFilters: () => void;
  onExport: () => void;
}

export function DealsHeader({
  pipelines,
  selectedPipelineId,
  onPipelineChange,
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  onAddDeal,
  onOpenFilters,
  onExport,
}: DealsHeaderProps) {
  return (
    <div className="border-b border-border bg-card">
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-semibold">Deals</h1>
            
            <Select value={selectedPipelineId || ""} onValueChange={onPipelineChange}>
              <SelectTrigger className="w-[200px]" data-testid="select-pipeline">
                <SelectValue placeholder="Select pipeline" />
              </SelectTrigger>
              <SelectContent>
                {pipelines.map((pipeline) => (
                  <SelectItem key={pipeline.id} value={pipeline.id}>
                    {pipeline.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={onAddDeal} data-testid="button-add-deal">
            <Plus className="h-4 w-4 mr-2" />
            Add Deal
          </Button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search deals..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9"
              data-testid="input-search-deals"
            />
          </div>

          <div className="flex items-center rounded-md border border-input p-0.5">
            <Button
              variant={viewMode === "board" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => onViewModeChange("board")}
              className="h-7 px-2"
              data-testid="button-view-board"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "table" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => onViewModeChange("table")}
              className="h-7 px-2"
              data-testid="button-view-table"
            >
              <Table2 className="h-4 w-4" />
            </Button>
          </div>

          <Button variant="outline" size="sm" onClick={onOpenFilters} data-testid="button-filters">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" data-testid="button-sort">
                <SortAsc className="h-4 w-4 mr-2" />
                Sort
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Amount: High to Low</DropdownMenuItem>
              <DropdownMenuItem>Amount: Low to High</DropdownMenuItem>
              <DropdownMenuItem>Close Date: Nearest</DropdownMenuItem>
              <DropdownMenuItem>Close Date: Farthest</DropdownMenuItem>
              <DropdownMenuItem>Created: Newest</DropdownMenuItem>
              <DropdownMenuItem>Created: Oldest</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" size="sm" onClick={onExport} data-testid="button-export">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>
    </div>
  );
}
