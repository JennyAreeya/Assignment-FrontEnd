import React from "react";
import { useAllocationStore } from "../allocationStore";

export function FiltersBar() {
  const filterText = useAllocationStore((s) => s.filterText);
  const filterType = useAllocationStore((s) => s.filterType);
  const setFilterText = useAllocationStore((s) => s.setFilterText);
  const setFilterType = useAllocationStore((s) => s.setFilterType);

  return (
    <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
      <div className="flex gap-2 items-center w-full sm:w-auto text-gray-500">
        <input
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          placeholder="Search: order / suborder / customer / item / remark"
          className="w-full sm:w-[420px] px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-black/10"
        />
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as any)}
          className="px-3 py-2 border rounded-lg text-sm bg-white text-gray-500"
        >
          <option value="ALL">All Types</option>
          <option value="EMERGENCY">EMERGENCY</option>
          <option value="CLAIM">CLAIM</option>
          <option value="OVERDUE">OVERDUE</option>
          <option value="DAILY">DAILY</option>
        </select>
      </div>
    </div>
  );
}