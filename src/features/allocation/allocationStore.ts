import { create } from "zustand";
import type {
  AllocationLine,
  CustomerCredit,
  Inventory,
  OrderLine,
  PriceRule,
} from "../../shared/types/types";
import { autoAssign } from "./allocationEngine";
import { bankersRound, clampNonNeg } from "../../shared/utils/bankersRound";

// --- helpers (pure) ---------------------------------------------------------
function refundInventory(inventory: Inventory[], lines: AllocationLine[]) {
  const inv = inventory.map((x) => ({ ...x }));
  for (const l of lines) {
    const idx = inv.findIndex(
      (x) => x.itemId === l.itemId && x.warehouseId === l.warehouseId && x.supplierId === l.supplierId
    );
    if (idx >= 0) {
      inv[idx].remainingQty = bankersRound(inv[idx].remainingQty + l.qty, 2);
    } else {
      // กันกรณี line ใช้ source ที่ไม่มี record inventory เดิม
      inv.push({ itemId: l.itemId, warehouseId: l.warehouseId, supplierId: l.supplierId, remainingQty: l.qty });
    }
  }
  return inv;
}

function refundCredit(credits: CustomerCredit[], customerId: string, amount: number) {
  const next = credits.map((x) => ({ ...x }));
  const idx = next.findIndex((c) => c.customerId === customerId);
  if (idx >= 0) next[idx].remainingCredit = bankersRound(next[idx].remainingCredit + amount, 2);
  return next;
}

function sumQty(lines: AllocationLine[]) {
  return bankersRound(lines.reduce((s, a) => s + a.qty, 0), 2);
}
function sumAmount(lines: AllocationLine[]) {
  return bankersRound(lines.reduce((s, a) => s + a.amount, 0), 2);
}
function keyOf(l: { itemId: string; warehouseId: string; supplierId: string }) {
  return `${l.itemId}__${l.warehouseId}__${l.supplierId}`;
}


// ----------------------------------------------------------------------------
type State = {
  orders: OrderLine[];
  inventory: Inventory[];
  credits: CustomerCredit[];
  priceRules: PriceRule[];

  // committed: ใช้คำนวณในตาราง Orders
  allocations: AllocationLine[];

  // editing: ใช้ใน Allocation panel เท่านั้น (ยังไม่กระทบตาราง Orders จนกด Apply)
  editingAllocations: AllocationLine[];

  // warnings: string[];
  selectedSubOrderId?: string;

  filterText: string;
  filterType: "ALL" | "EMERGENCY" | "CLAIM" | "OVERDUE" | "DAILY";
  setFilterText: (v: string) => void;
  setFilterType: (v: State["filterType"]) => void;

  setSelected: (subOrderId?: string) => void;
  runAuto: () => void;

  baselineInventory: Inventory[];
  baselineCredits: CustomerCredit[];
  reset: () => void;


  manualWarehouseId: string;
  manualSupplierId: string;

  getManualCandidates: () => { warehouseId: string; supplierId: string; remainingQty: number }[];
  updateLineQty: (subOrderId: string, index: number, qty: number) => void;
  applyManual: () => boolean;

  validateSelectedDetailed: () => string[];
};

export const useAllocationStore = create<State>((set, get) => ({
  orders: [],
  inventory: [],
  credits: [],
  priceRules: [],

  allocations: [],
  editingAllocations: [],
  // warnings: [],

  selectedSubOrderId: undefined,

  filterText: "",
  filterType: "ALL",
  setFilterText: (v) => set({ filterText: v }),
  setFilterType: (v) => set({ filterType: v }),

  setSelected: (subOrderId) => {
    const { allocations } = get();
    const edit = subOrderId ? allocations.filter((a) => a.subOrderId === subOrderId) : [];
    set({
      selectedSubOrderId: subOrderId,
      editingAllocations: edit.map((x) => ({ ...x })),
      // warnings: [],
      // manualQty: "",
      manualWarehouseId: "WH-000",
      manualSupplierId: "SP-000",
    });
  },

  runAuto: () => {
    const { orders, inventory, credits, priceRules, selectedSubOrderId } = get();
    const result = autoAssign({ orders, inventory, credits, priceRules });

    const nextAlloc = result.allocations;
    const nextEdit = selectedSubOrderId ? nextAlloc.filter((a) => a.subOrderId === selectedSubOrderId) : [];

    set({
      allocations: nextAlloc,
      inventory: result.inventory,
      credits: result.credits,
      // warnings: result.warnings,
      editingAllocations: nextEdit.map((x) => ({ ...x })),
    });
  },

  baselineInventory: [],
  baselineCredits: [],
  reset: () => {
    const { baselineInventory, baselineCredits, selectedSubOrderId, allocations } = get();
    const nextInv = baselineInventory.map((x) => ({ ...x }));
    const nextCr = baselineCredits.map((x) => ({ ...x }));
    const nextAlloc: AllocationLine[] = [];

    const nextEdit = selectedSubOrderId ? allocations.filter((a) => a.subOrderId === selectedSubOrderId) : [];

    set({
      inventory: nextInv,
      credits: nextCr,
      allocations: nextAlloc,
      editingAllocations: nextEdit.map((x) => ({ ...x })),
      // warnings: [],
    });
  },

  // validateSelected: () => {
  //   const { selectedSubOrderId, orders, editingAllocations } = get();
  //   if (!selectedSubOrderId) return [];

  //   const order = orders.find((o) => o.subOrderId === selectedSubOrderId);
  //   if (!order) return [];

  //   const totalQty = sumQty(editingAllocations);
  //   const errs: string[] = [];
  //   if (totalQty > order.requestQty + 1e-9) errs.push("Allocated qty exceeds request qty.");
  //   return errs;
  // },

  manualWarehouseId: "WH-000",
  manualSupplierId: "SP-000",
  // manualQty: "",

  // setManualWarehouseId: (v) => set({ manualWarehouseId: v }),
  // setManualSupplierId: (v) => set({ manualSupplierId: v }),
  // setManualQty: (v) => set({ manualQty: v }),

  getManualCandidates: () => {
    const { selectedSubOrderId, orders, inventory, allocations, manualWarehouseId, manualSupplierId } = get();
    if (!selectedSubOrderId) return [];

    const order = orders.find((o) => o.subOrderId === selectedSubOrderId);
    if (!order) return [];

    // ✅ ทำ effective inventory = inventory ปัจจุบัน + refund ของ committed lines ของ suborder นี้
    const committed = allocations.filter((a) => a.subOrderId === selectedSubOrderId);
    const invEffective = refundInventory(inventory, committed);

    const whAny = order.warehouseId === "WH-000";
    const spAny = order.supplierId === "SP-000";

    return invEffective
      .filter((inv) => inv.itemId === order.itemId && inv.remainingQty > 0)
      .filter((inv) => (whAny ? true : inv.warehouseId === order.warehouseId))
      .filter((inv) => (spAny ? true : inv.supplierId === order.supplierId))
      .filter((inv) => (manualWarehouseId === "WH-000" ? true : inv.warehouseId === manualWarehouseId))
      .filter((inv) => (manualSupplierId === "SP-000" ? true : inv.supplierId === manualSupplierId))
      .map((inv) => ({ warehouseId: inv.warehouseId, supplierId: inv.supplierId, remainingQty: inv.remainingQty }))
      .sort((a, b) => b.remainingQty - a.remainingQty);
  },

  updateLineQty: (_subOrderId, index, qty) => {
    const { editingAllocations } = get();
    const next = editingAllocations.map((l, i) => {
      if (i !== index) return l;

      // บังคับจำนวนเต็ม
      const q = Math.max(0, Math.floor(qty));
      const amount = bankersRound(q * l.unitPrice, 2);
      return { ...l, qty: q, amount };
    });

    const cleaned = next.filter((l) => l.qty > 0);
    set({ editingAllocations: cleaned });
  },


  validateSelectedDetailed: () => {
    const { selectedSubOrderId, orders, inventory, credits, allocations, editingAllocations } = get();
    if (!selectedSubOrderId) return [];

    const order = orders.find((o) => o.subOrderId === selectedSubOrderId);
    if (!order) return [];

    const errs: string[] = [];

    // request cap
    const totalQty = sumQty(editingAllocations);
    if (totalQty > order.requestQty + 1e-9) errs.push("Allocated qty exceeds request qty.");

    // ✅ effective snapshots (refund ของ committed)
    const committed = allocations.filter((a) => a.subOrderId === selectedSubOrderId);
    const invEffective = refundInventory(inventory, committed);
    const committedAmount = sumAmount(committed);

    const credit = credits.find((c) => c.customerId === order.customerId);
    if (!credit) errs.push(`Missing credit for ${order.customerId}`);
    const effectiveCredit = credit ? bankersRound(credit.remainingCredit + committedAmount, 2) : 0;

    // stock check (aggregate by source)
    const usedBySource = new Map<string, number>();
    for (const l of editingAllocations) {
      const k = keyOf(l);
      usedBySource.set(k, bankersRound((usedBySource.get(k) ?? 0) + l.qty, 2));
    }
    for (const [k, used] of usedBySource.entries()) {
      const [itemId, warehouseId, supplierId] = k.split("__");
      const inv = invEffective.find((x) => x.itemId === itemId && x.warehouseId === warehouseId && x.supplierId === supplierId);
      const stock = inv ? inv.remainingQty : 0;
      if (!inv) errs.push(`No inventory for ${warehouseId}/${supplierId}`);
      else if (used > stock + 1e-9) errs.push(`Exceeds stock at ${warehouseId}/${supplierId}. Stock: ${stock.toFixed(2)}`);
    }

    // credit check
    const totalAmount = sumAmount(editingAllocations);
    if (credit && totalAmount > effectiveCredit + 1e-9) {
      errs.push(`Exceeds credit. Remaining credit: ${effectiveCredit.toFixed(2)}`);
    }

    return errs;
  },

  applyManual: () => {
    const { selectedSubOrderId, orders, allocations, editingAllocations, inventory, credits } = get();
    if (!selectedSubOrderId) return false;

    const order = orders.find((o) => o.subOrderId === selectedSubOrderId);
    if (!order) return false;

    const errs = get().validateSelectedDetailed();
    if (errs.length > 0) {
      // set({ warnings: errs });
      return false;
    }

    // ✅ refund committed lines ก่อน
    const committed = allocations.filter((a) => a.subOrderId === selectedSubOrderId);
    const committedAmount = sumAmount(committed);

    let invNext = refundInventory(inventory, committed);
    let crNext = refundCredit(credits, order.customerId, committedAmount);

    // ✅ แล้วค่อย apply editing lines ใหม่
    const usedBySource = new Map<string, number>();
    for (const l of editingAllocations) {
      const k = keyOf(l);
      usedBySource.set(k, bankersRound((usedBySource.get(k) ?? 0) + l.qty, 2));
    }

    // deduct inventory
    invNext = invNext.map((x) => ({ ...x }));
    for (const [k, used] of usedBySource.entries()) {
      const [itemId, warehouseId, supplierId] = k.split("__");
      const idx = invNext.findIndex((x) => x.itemId === itemId && x.warehouseId === warehouseId && x.supplierId === supplierId);
      if (idx >= 0) invNext[idx].remainingQty = bankersRound(clampNonNeg(invNext[idx].remainingQty - used), 2);
    }

    // deduct credit
    const totalAmount = sumAmount(editingAllocations);
    const cidx = crNext.findIndex((c) => c.customerId === order.customerId);
    if (cidx >= 0) crNext[cidx].remainingCredit = bankersRound(clampNonNeg(crNext[cidx].remainingCredit - totalAmount), 2);

    // replace committed allocations ของ suborder นี้
    const nextAllocations = allocations
      .filter((a) => a.subOrderId !== selectedSubOrderId)
      .concat(editingAllocations.map((x) => ({ ...x })));

  set({
    allocations: nextAllocations,
    inventory: invNext,
    credits: crNext,
    editingAllocations: editingAllocations.map((x) => ({ ...x })),
  });

  return true;
  },
}));