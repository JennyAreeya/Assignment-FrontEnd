import React from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useAllocationStore } from "../allocationStore";
import type { OrderLine } from "../../../shared/types/types";

function sumAllocated(
  subOrderId: string,
  allocations: { subOrderId: string; qty: number }[]
) {
  return allocations
    .filter((a) => a.subOrderId === subOrderId)
    .reduce((s, a) => s + a.qty, 0);
}

function fmtDate(v: unknown) {
  if (!v) return "-";
  const d = v instanceof Date ? v : new Date(String(v));
  if (Number.isNaN(d.getTime())) return String(v);

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(d); // => 23/01/2025
}


const typePriority: Record<string, number> = {
  EMERGENCY: 1,
  CLAIM: 2,
  OVERDUE: 3,
  DAILY: 4,
};

function getCreateDateMs(o: any) {
  const v = o.createDate ?? o.createdAt ?? o.createAt;
  const t = new Date(String(v ?? "")).getTime();
  return Number.isFinite(t) ? t : 0;
}

export function OrdersTable() {
  const orders = useAllocationStore((s) => s.orders);
  const allocations = useAllocationStore((s) => s.allocations);
  const selectedSubOrderId = useAllocationStore((s) => s.selectedSubOrderId);
  const setSelected = useAllocationStore((s) => s.setSelected);

  const filterText = useAllocationStore((s) => s.filterText);
  const filterType = useAllocationStore((s) => s.filterType);

  const visibleOrders = React.useMemo(() => {
    const q = filterText.trim().toLowerCase();

    const filtered = orders.filter((o) => {
      if (filterType !== "ALL" && o.type !== filterType) return false;
      if (!q) return true;

      return (
        o.orderId.toLowerCase().includes(q) ||
        o.subOrderId.toLowerCase().includes(q) ||
        o.customerId.toLowerCase().includes(q) ||
        o.itemId.toLowerCase().includes(q) ||
        (o.remark ?? "").toLowerCase().includes(q)
      );
    });

    // ✅ sort: Type priority -> FIFO createDate -> subOrderId
    return [...filtered].sort((a, b) => {
      const pa = typePriority[a.type] ?? 99;
      const pb = typePriority[b.type] ?? 99;
      if (pa !== pb) return pa - pb;

      const da = getCreateDateMs(a);
      const db = getCreateDateMs(b);
      if (da !== db) return da - db;

      return a.subOrderId.localeCompare(b.subOrderId);
    });
  }, [orders, filterText, filterType]);

  const parentRef = React.useRef<HTMLDivElement | null>(null);

  const rowVirtualizer = useVirtualizer({
    count: visibleOrders.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 44,
    overscan: 10,
  });

  // ความกว้างรวมของแถว (ปรับตามจำนวนคอลัมน์)
  const ROW_MIN_WIDTH = 1440;

  return (
    <div className="border rounded-xl overflow-hidden bg-white">
      <div className="bg-white px-3 py-2 text-sm font-semibold text-gray-900 border-b">
        Orders ({visibleOrders.length})
      </div>

      {/* ✅ ทำ horizontal scroll */}
      <div className="overflow-x-auto">
        <div style={{ minWidth: ROW_MIN_WIDTH }}>
          {/* ✅ Header row */}
          <div className="sticky top-0 z-10 bg-white border-b">
            <div className="px-3 h-11 flex items-center text-xs font-semibold text-gray-600 border-b">
              <div className="w-32 whitespace-nowrap">Order</div>
              <div className="w-32 whitespace-nowrap">Sub Order</div>
              <div className="w-28 whitespace-nowrap">Item ID</div>
              <div className="w-28 whitespace-nowrap">Warehouse ID</div>
              <div className="w-28 whitespace-nowrap">Supplier ID</div>
              <div className="w-32 text-right whitespace-nowrap tabular-nums">Request</div>
              <div className="w-32 whitespace-nowrap pl-3">Type</div>
              <div className="w-32 whitespace-nowrap">Create Date</div>
              <div className="w-28 whitespace-nowrap">Customer ID</div>
              <div className="flex-1 min-w-[240px] whitespace-nowrap">Remark</div>

              <div className="w-28 text-right whitespace-nowrap">Allocated</div>
              <div className="w-28 text-right whitespace-nowrap">Remaining</div>
            </div>
          </div>

          {/* ✅ Body (virtualized) */}
          <div ref={parentRef} className="h-[calc(100vh-190px)] overflow-y-auto overflow-x-hidden">
            <div
              style={{
                height: rowVirtualizer.getTotalSize(),
                position: "relative",
              }}
            >
              {rowVirtualizer.getVirtualItems().map((vRow) => {
                const o: OrderLine = visibleOrders[vRow.index];
                const allocated = sumAllocated(o.subOrderId, allocations);
                const remaining = Math.max(0, o.requestQty - allocated);
                const selected = selectedSubOrderId === o.subOrderId;

                // ถ้า type ของคุณใช้ createDate คนละชื่อ ให้เปลี่ยนบรรทัดนี้
                const createDate =
                  (o as any).createDate ?? (o as any).createdAt ?? (o as any).createAt;

                return (
                  <div
                    key={o.subOrderId}
                    onClick={() => setSelected(o.subOrderId)}
                    className={[
                      "absolute left-0 right-0 px-3",
                      "flex items-center text-sm cursor-pointer border-b",
                      selected ? "bg-blue-50" : "bg-white hover:bg-gray-50",
                    ].join(" ")}
                    style={{
                      transform: `translateY(${vRow.start}px)`,
                      height: vRow.size,
                    }}
                  >
                    <div className="w-32 font-medium text-gray-900 truncate">
                      {o.orderId}
                    </div>
                    <div className="w-32 font-medium text-gray-900 truncate">
                      {o.subOrderId}
                    </div>
                    <div className="w-28 text-gray-900 truncate">{o.itemId}</div>
                    <div className="w-28 text-gray-900 truncate">{o.warehouseId}</div>
                    <div className="w-28 text-gray-900 truncate">{o.supplierId}</div>

                    <div className="w-32 text-right font-semibold text-gray-900 tabular-nums">
                      {Number(o.requestQty)}
                    </div>

                    <div className="w-32 text-gray-900 truncate pl-3">{o.type}</div>

                    <div className="w-32 text-gray-900 truncate">
                      {fmtDate(createDate)}
                    </div>

                    <div className="w-28 text-gray-900 truncate">{o.customerId}</div>

                    <div className="flex-1 min-w-[240px] text-gray-800 truncate">
                      {o.remark ?? "-"}
                    </div>

                    <div className="w-28 text-right font-semibold text-gray-800">
                      {allocated.toFixed(0)}
                    </div>
                    <div className="w-28 text-right font-semibold text-gray-800">
                      {remaining.toFixed(0)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}