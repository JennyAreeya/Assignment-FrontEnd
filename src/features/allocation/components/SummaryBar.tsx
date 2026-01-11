import React from "react";
import { useAllocationStore } from "../allocationStore";

function sum(n: number[]) {
  return n.reduce((a, b) => a + b, 0);
}

export function SummaryBar() {
  const orders = useAllocationStore((s) => s.orders);
  const inventory = useAllocationStore((s) => s.inventory);
  const credits = useAllocationStore((s) => s.credits);
  const allocations = useAllocationStore((s) => s.allocations);

  const computed = React.useMemo(() => {
    const totalRequest = sum(orders.map((o) => o.requestQty));
    const totalAllocatedQty = sum(allocations.map((a) => a.qty));
    const totalStockRemaining = sum(inventory.map((i) => i.remainingQty));
    const totalCreditRemaining = sum(credits.map((c) => c.remainingCredit));
    const shortage = Math.max(0, totalRequest - totalAllocatedQty);

    return { totalRequest, totalAllocatedQty, totalStockRemaining, totalCreditRemaining, shortage };
  }, [orders, allocations, inventory, credits]);

  const card = "bg-white border rounded-xl p-3";
  const label = "text-xs text-gray-700 font-medium";
  const value = "text-lg font-bold text-gray-900";

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
      <div className={card}>
        <div className={label}>Total Request</div>
        <div className={value}>{computed.totalRequest.toFixed(2)}</div>
      </div>
      <div className={card}>
        <div className={label}>Total Allocated</div>
        <div className={value}>{computed.totalAllocatedQty.toFixed(2)}</div>
      </div>
      <div className={card}>
        <div className={label}>Stock Remaining</div>
        <div className={value}>{computed.totalStockRemaining.toFixed(2)}</div>
      </div>
      <div className={card}>
        <div className={label}>Credit Remaining</div>
        <div className={value}>{computed.totalCreditRemaining.toFixed(2)}</div>
      </div>
      <div className={card}>
        <div className={label}>Shortage</div>
        <div className={`text-lg font-bold ${computed.shortage > 0 ? "text-red-600" : "text-green-700"}`}>
          {computed.shortage.toFixed(2)}
        </div>
      </div>
    </div>
  );
}
