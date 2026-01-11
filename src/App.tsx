import React from "react";
import { OrdersTable } from "./features/allocation/components/OrdersTable";
import { AllocationPanel } from "./features/allocation/components/AllocationPanel";
import { useAllocationStore } from "./features/allocation/allocationStore";
import { mockCredits, mockInventory, mockOrders, mockPriceRules } from "./data/mockData";
import { FiltersBar } from "./features/allocation/components/FiltersBar";
import { SummaryBar } from "./features/allocation/components/SummaryBar";

export default function App() {
  const runAuto = useAllocationStore((s) => s.runAuto);
  const reset = useAllocationStore((s) => s.reset);
  const selected = useAllocationStore((s) => s.selectedSubOrderId);


  // load mock data and auto-assign on initial load
  React.useEffect(() => {
  useAllocationStore.setState({
    orders: mockOrders,
    inventory: mockInventory,
    credits: mockCredits,
    priceRules: mockPriceRules,
    baselineInventory: mockInventory.map((x) => ({ ...x })),
    baselineCredits: mockCredits.map((x) => ({ ...x })),
  });

  // ✅ auto-assign on page load
  useAllocationStore.getState().runAuto();
}, []);


  return (
    <div className="min-h-screen w-full bg-gray-100">
      <div className="w-full max-w-none p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xl font-bold text-orange-600">Salmon Allocation</div>
            <FiltersBar />
            {/* <SummaryBar /> */}
          </div>

          <div className="flex gap-2">
            <button
              onClick={reset}
              className="px-4 py-2 rounded-lg bg-black text-white text-sm font-semibold hover:opacity-90">
              Reset
            </button>
            <button
              onClick={runAuto}
              className="px-4 py-2 rounded-lg bg-black text-white text-sm font-semibold hover:opacity-90">
              Auto-Assign
            </button>
          </div>
        </div>

        <div className="relative">
          <OrdersTable />

          {selected && (
            <div className="fixed inset-0 z-50">
              {/* backdrop */}
              <div
                className="absolute inset-0 bg-black/30"
                onClick={() => useAllocationStore.setState({ selectedSubOrderId: undefined })}
              />

              {/* right drawer */}
              <div className="absolute right-0 top-0 h-full w-[92vw] sm:w-[560px] lg:w-[720px] xl:w-[820px]
                bg-gray-100 p-4 overflow-auto shadow-2xl">
                <AllocationPanel />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
