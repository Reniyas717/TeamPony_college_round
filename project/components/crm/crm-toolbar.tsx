import * as React from "react";
import { ContactFilters, Contact } from "@/lib/validations/crm";
import { Button } from "@/components/ui/button";
import { SearchNormal1, FilterAdd } from "iconsax-react";

export function CrmToolbar({
  filters,
  onFiltersChange,
  onAddClick
}: {
  filters: ContactFilters;
  onFiltersChange: (filters: ContactFilters) => void;
  onAddClick: () => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sticky top-0 z-10 bg-background/95 backdrop-blur py-2 border-b border-border/40">
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <div className="relative w-full sm:w-72">
          <SearchNormal1 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search contacts..."
            className="w-full h-10 pl-9 pr-3 rounded-sm border border-input bg-card text-base focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background transition-shadow"
            value={filters.search || ""}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          />
        </div>
        
        <select 
          className="h-10 px-3 py-2 rounded-sm border border-input bg-card text-base focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          value={filters.stage || ""}
          onChange={(e) => onFiltersChange({ ...filters, stage: e.target.value as Contact['stage'] || undefined })}
        >
          <option value="">All Stages</option>
          <option value="lead">Lead</option>
          <option value="qualified">Qualified</option>
          <option value="proposal">Proposal</option>
          <option value="negotiation">Negotiation</option>
          <option value="won">Won</option>
          <option value="lost">Lost</option>
        </select>
        
        <Button variant="outline" size="icon" title="More Filters" className="hidden sm:inline-flex">
          <FilterAdd size="20" />
        </Button>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto">
        <Button onClick={onAddClick} className="w-full sm:w-auto">
          Add contact
        </Button>
      </div>
    </div>
  );
}
