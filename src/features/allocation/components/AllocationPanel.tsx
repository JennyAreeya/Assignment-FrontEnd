import React from "react";
import { useAllocationStore } from "../allocationStore";

export function AllocationPanel() {
  const selected = useAllocationStore((s) => s.selectedSubOrderId);
  const orders = useAllocationStore((s) => s.orders);
  const editingAllocations = useAllocationStore((s) => s.editingAllocations); // ใหม่ (ใช้ของใน panel ที่ยังไม่ Apply)
  const manualWarehouseId = useAllocationStore((s) => s.manualWarehouseId);
  const manualSupplierId = useAllocationStore((s) => s.manualSupplierId);
  const getManualCandidates = useAllocationStore((s) => s.getManualCandidates);

  const validateSelectedDetailed = useAllocationStore((s) => s.validateSelectedDetailed);
  const applyManual = useAllocationStore((s) => s.applyManual);
  const updateLineQty = useAllocationStore((s) => s.updateLineQty);  

  const order = React.useMemo(() => {
    return orders.find((o) => o.subOrderId === selected);
  }, [orders, selected]);

  const lines = editingAllocations; // store ทำให้เป็นของ selected อยู่แล้ว

  const candidates = React.useMemo(() => getManualCandidates(), [getManualCandidates, selected, manualWarehouseId, manualSupplierId]);

  // const whLabel = manualWarehouseId === "WH-000" ? "Any" : manualWarehouseId;
  // const spLabel = manualSupplierId === "SP-000" ? "Any" : manualSupplierId;

  // เลือก candidate “ตัวที่ตรงกับสิ่งที่ user เลือก”
  // - ถ้าเลือก Any => เอาตัวแรก (เพราะ candidates ถูก sort ให้ stock เยอะสุดอยู่แล้ว)
  const picked = React.useMemo(() => {
    if (candidates.length === 0) return null;

    const whIsAny = manualWarehouseId === "WH-000";
    const spIsAny = manualSupplierId === "SP-000";

    // ถ้าเลือกเจาะจงทั้งคู่ -> หา exact match
    if (!whIsAny && !spIsAny) {
      return candidates.find(
        (c) => c.warehouseId === manualWarehouseId && c.supplierId === manualSupplierId
      ) ?? null;
    }

    // มี Any -> ใช้ตัวแรก (ดีที่สุดตาม sort)
    return candidates[0];
  }, [candidates, manualWarehouseId, manualSupplierId]);

  const errors2 = React.useMemo(() => validateSelectedDetailed(), [validateSelectedDetailed, selected, lines]);
  const [applyToast, setApplyToast] = React.useState<string | null>(null); // state สำหรับ toast

  const credits = useAllocationStore((s) => s.credits);

  // credit ของ customer ปัจจุบัน
  const credit = React.useMemo(() => {
    if (!order) return undefined;
    return credits.find((c) => c.customerId === order.customerId);
  }, [credits, order]);

  React.useEffect(() => {
    setApplyToast(null);
  }, [selected]);

  if (!selected || !order) {
    return (
      <div className="border rounded-xl p-4 text-sm text-gray-800">
        Select an order to view allocation details.
      </div>
    );
  }

  return (
    <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
      <div className="bg-gray-50 px-3 py-2 border-b">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-sm font-semibold text-gray-900">Allocation Detail</div>
            <div className="text-xs text-orange-600">
              {order.orderId} / {order.subOrderId} • {order.type} • {order.customerId}
            </div>
          </div>

          <button
            onClick={() => useAllocationStore.setState({ selectedSubOrderId: undefined })}
            className="px-2 py-1 text-sm rounded-lg border bg-white hover:bg-gray-50"
            aria-label="Close"
            title="Close"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="p-3 space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="p-3 rounded-lg bg-white border">
            <div className="text-xs text-gray-700 font-semibold">Item</div>
            <div className="font-semibold text-orange-600">{order.itemId}</div>
          </div>
          <div className="p-3 rounded-lg bg-white border">
            <div className="text-xs text-gray-700 font-semibold">Request Qty</div>
            <div className="font-semibold text-orange-600">{order.requestQty}</div>
          </div>
          <div className="p-3 rounded-lg bg-white border">
            <div className="text-xs text-gray-700">Warehouse</div>
            <div className="font-semibold text-orange-600">{order.warehouseId}</div>
          </div>
          <div className="p-3 rounded-lg bg-white border">
            <div className="text-xs text-gray-700 font-semibold">Supplier</div>
            <div className="font-semibold text-orange-600">{order.supplierId}</div>
          </div>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-3 py-2 text-sm font-semibold border-b text-gray-500">Allocated Lines</div>

          {lines.length === 0 ? (
            <div className="p-3 text-sm text-gray-800">No allocations yet. Click “Auto-Assign”.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left bg-white border-b">
                <tr>
                  <th className="px-3 py-2 text-gray-500">Warehouse</th>
                  <th className="px-3 py-2 text-gray-500">Supplier</th>
                  <th className="px-3 py-2 text-gray-500 text-right">Qty</th>
                  <th className="px-3 py-2 text-gray-500 text-right">Unit Price</th>
                  <th className="px-3 py-2 text-gray-500 text-right">Amount</th>
                  <th className="px-3 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l, idx) => (
                  <tr key={idx} className="border-b last:border-b-0">
                    <td className="px-3 py-2 text-green-500">{l.warehouseId}</td>
                    <td className="px-3 py-2 text-green-500">{l.supplierId}</td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        min={0}
                        step={1}
                        defaultValue={String(Math.trunc(l.qty))}
                        className="qty-input w-24 px-2 py-1 border rounded-md text-right text-green-500"
                        inputMode="numeric"
                        onBlur={(e) => {
                          const n = parseInt((e.currentTarget as HTMLInputElement).value, 10);
                          updateLineQty(selected, idx, Number.isFinite(n) ? n : 0);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
                        }}
                      />

                    </td>
                    <td className="px-3 py-2 text-green-500 text-right">{l.unitPrice.toFixed(2)}</td>
                    <td className="px-3 py-2 text-green-500 text-right">{l.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="border rounded-lg p-3 bg-white">
          <div className="mt-2 text-xs text-gray-700">
            Warehouse/Supplier:{" "}
            {picked ? (
              <span className="ml-2 text-gray-600">
                <b>{picked.warehouseId}/{picked.supplierId}</b> ={" "}
                <b>{picked.remainingQty.toFixed(0)}</b>
              </span>
            ) : (
              <span className="ml-2 text-gray-500">(No candidate)</span>
            )}
          </div>


          <div className="mt-2 text-xs text-gray-700 space-y-1">
            <div>
              Remaining Credit:{" "}
              <span className="font-semibold text-green-700">
                {credit ? credit.remainingCredit.toFixed(2) : "-"}
              </span>
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              onClick={() => {
                const ok = applyManual();
                if (ok) {
                  setApplyToast("Apply Success");
                  window.setTimeout(() => setApplyToast(null), 2000);
                }
              }}
              className="px-3 py-2 rounded-lg bg-white border text-sm font-semibold hover:bg-gray-50"
            >
              Apply
            </button>
          </div>

          {applyToast && (
            <div className="mx-3 mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              {applyToast}
            </div>
          )}
          {errors2.length > 0 && (
            <div className="mt-3 p-2 rounded-lg bg-red-50 border">
              <div className="text-sm font-semibold text-red-700">Validation</div>
              <ul className="list-disc pl-5 text-sm text-red-700">
                {errors2.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
