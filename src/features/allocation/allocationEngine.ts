import type {
  AllocationLine,
  AllocationResult,
  CustomerCredit,
  Inventory,
  OrderLine,
  OrderType,
  PriceRule,
} from "../../shared/types/types";
import { bankersRound, clampNonNeg, toCents, fromCents } from "../../shared/utils/bankersRound";

const typePriority: Record<OrderType, number> = {
  EMERGENCY: 1,
  CLAIM: 2,
  OVERDUE: 3,
  DAILY: 4,
};

function sortOrders(orders: OrderLine[]) {
  return [...orders].sort((a, b) => {
    const pa = typePriority[a.type];
    const pb = typePriority[b.type];
    if (pa !== pb) return pa - pb;

    const da = new Date(a.createDate).getTime();
    const db = new Date(b.createDate).getTime();
    if (da !== db) return da - db; // FIFO

    return a.subOrderId.localeCompare(b.subOrderId);
  });
}

function findUnitPrice(order: OrderLine, priceRules: PriceRule[], supplierId: string): number {
  const rule = priceRules.find((r) => r.itemId === order.itemId && r.supplierId === supplierId);
  if (!rule) return 0;
  const raw = rule.baseUnitPrice * rule.typeMultiplier[order.type];
  return bankersRound(raw, 2);
}

function buildCandidates(order: OrderLine, inventory: Inventory[]) {
  const whAny = order.warehouseId === "WH-000";
  const spAny = order.supplierId === "SP-000";

  const filtered = inventory.filter((inv) => {
    if (inv.itemId !== order.itemId) return false;
    if (!whAny && inv.warehouseId !== order.warehouseId) return false;
    if (!spAny && inv.supplierId !== order.supplierId) return false;
    return inv.remainingQty > 0;
  });

  return filtered.sort((a, b) => b.remainingQty - a.remainingQty);
}

export function autoAssign(params: {
  orders: OrderLine[];
  inventory: Inventory[];
  credits: CustomerCredit[];
  priceRules: PriceRule[];
}): AllocationResult {
  const warnings: string[] = [];
  const allocations: AllocationLine[] = [];

  const inv = params.inventory.map((x) => ({ ...x }));
  const credits = params.credits.map((x) => ({ ...x }));

  const remainingRequestBySubOrderId: Record<string, number> = {};
  const sorted = sortOrders(params.orders);

  for (const order of sorted) {
    // qty เป็นจำนวนเต็ม
    let reqRemaining = Math.max(0, Math.floor(order.requestQty));
    remainingRequestBySubOrderId[order.subOrderId] = reqRemaining;

    const credit = credits.find((c) => c.customerId === order.customerId);
    if (!credit) {
      warnings.push(`Missing credit for customer ${order.customerId} (subOrder ${order.subOrderId})`);
      continue;
    }

    // credit เป็นสตางค์
    let creditCents = toCents(credit.remainingCredit);

    const candidates = buildCandidates(order, inv);
    if (candidates.length === 0) {
      warnings.push(`No inventory candidates for subOrder ${order.subOrderId}`);
      continue;
    }

    for (const src of candidates) {
      if (reqRemaining <= 0) break;

      const srcQty = Math.max(0, Math.floor(src.remainingQty));
      if (srcQty <= 0) continue;

      const unitPrice = findUnitPrice(order, params.priceRules, src.supplierId);
      if (unitPrice <= 0) {
        warnings.push(`Missing price rule for item ${order.itemId}, supplier ${src.supplierId}`);
        continue;
      }

      const priceCents = toCents(unitPrice);
      if (priceCents <= 0) continue;

      // max qty by credit (จำนวนเต็ม)
      const maxByCredit = Math.floor(creditCents / priceCents);

      // allocQty เป็นจำนวนเต็ม
      const allocQty = Math.min(reqRemaining, srcQty, maxByCredit);
      if (allocQty <= 0) continue;

      const amountCents = allocQty * priceCents;
      const amount = fromCents(amountCents);

      // apply
      src.remainingQty = clampNonNeg(srcQty - allocQty); // เก็บเป็น int
      creditCents = clampNonNeg(creditCents - amountCents);
      credit.remainingCredit = fromCents(creditCents);

      reqRemaining = reqRemaining - allocQty;

      allocations.push({
        subOrderId: order.subOrderId,
        itemId: order.itemId,
        warehouseId: src.warehouseId,
        supplierId: src.supplierId,
        qty: allocQty,        // int
        unitPrice,            // 2 decimals
        amount,               // 2 decimals
      });

      remainingRequestBySubOrderId[order.subOrderId] = reqRemaining;
      if (creditCents <= 0) break;
    }

    if (reqRemaining > 0) {
      warnings.push(`SubOrder ${order.subOrderId} not fully allocated. Remaining request: ${reqRemaining}`);
    }
  }

  return { allocations, inventory: inv, credits, remainingRequestBySubOrderId, warnings };
}




// import type {
//   AllocationLine,
//   AllocationResult,
//   CustomerCredit,
//   Inventory,
//   OrderLine,
//   OrderType,
//   PriceRule,
// } from "../../shared/types/types";
// import { bankersRound, clampNonNeg, safeQtyByCredit } from "../../shared/utils/bankersRound";

// const typePriority: Record<OrderType, number> = {
//   EMERGENCY: 1,
//   CLAIM: 2,
//   OVERDUE: 3,
//   DAILY: 4,
// };

// function sortOrders(orders: OrderLine[]) {
//   return [...orders].sort((a, b) => {
//     const pa = typePriority[a.type];
//     const pb = typePriority[b.type];
//     if (pa !== pb) return pa - pb;
//     const da = new Date(a.createDate).getTime();
//     const db = new Date(b.createDate).getTime();
//     if (da !== db) return da - db; // FIFO
//     // stable tie-breaker
//     return a.subOrderId.localeCompare(b.subOrderId);
//   });
// }

// function findUnitPrice(order: OrderLine, priceRules: PriceRule[], supplierId: string): number {
//   const rule = priceRules.find((r) => r.itemId === order.itemId && r.supplierId === supplierId);
//   if (!rule) return 0;
//   const raw = rule.baseUnitPrice * rule.typeMultiplier[order.type];
//   return bankersRound(raw, 2);
// }

// function inventoryMatches(order: OrderLine, inv: Inventory, supplierId: string, warehouseId: string) {
//   if (inv.itemId !== order.itemId) return false;
//   return inv.supplierId === supplierId && inv.warehouseId === warehouseId;
// }

// function buildCandidates(order: OrderLine, inventory: Inventory[]) {
//   const whAny = order.warehouseId === "WH-000";
//   const spAny = order.supplierId === "SP-000";

//   const filtered = inventory.filter((inv) => {
//     if (inv.itemId !== order.itemId) return false;
//     if (!whAny && inv.warehouseId !== order.warehouseId) return false;
//     if (!spAny && inv.supplierId !== order.supplierId) return false;
//     return inv.remainingQty > 0;
//   });

//   // if WH-000 or SP-000 => prioritize larger remaining stock
//   // (requirement says for WH-000 / SP-000 pick from the most remaining stock source)
//   return filtered.sort((a, b) => b.remainingQty - a.remainingQty);
// }

// export function autoAssign(params: {
//   orders: OrderLine[];
//   inventory: Inventory[];
//   credits: CustomerCredit[];
//   priceRules: PriceRule[];
// }): AllocationResult {
//   const warnings: string[] = [];
//   const allocations: AllocationLine[] = [];

//   // clone mutable snapshots
//   const inv = params.inventory.map((x) => ({ ...x }));
//   const credits = params.credits.map((x) => ({ ...x }));

//   const remainingRequestBySubOrderId: Record<string, number> = {};
//   const sorted = sortOrders(params.orders);

//   for (const order of sorted) {
//     let reqRemaining = order.requestQty;
//     remainingRequestBySubOrderId[order.subOrderId] = reqRemaining;

//     const credit = credits.find((c) => c.customerId === order.customerId);
//     if (!credit) {
//       warnings.push(`Missing credit for customer ${order.customerId} (subOrder ${order.subOrderId})`);
//       continue;
//     }

//     const candidates = buildCandidates(order, inv);
//     if (candidates.length === 0) {
//       warnings.push(`No inventory candidates for subOrder ${order.subOrderId}`);
//       continue;
//     }

//     for (const src of candidates) {
//       if (reqRemaining <= 0) break;
//       if (src.remainingQty <= 0) continue;

//       // determine unit price based on supplier of the chosen source
//       const unitPrice = findUnitPrice(order, params.priceRules, src.supplierId);
//       if (unitPrice <= 0) {
//         warnings.push(`Missing price rule for item ${order.itemId}, supplier ${src.supplierId}`);
//         continue;
//       }
//       // credit is money -> max qty = credit / unitPrice
//       const maxByCreditRaw = unitPrice > 0 ? credit.remainingCredit / unitPrice : 0;

//       // cap ตาม request/stock/credit (ยังไม่ปัด)
//       const maxQtyRaw = Math.min(reqRemaining, src.remainingQty, maxByCreditRaw);

//       // เลือก qty ที่ “หลังปัด amount แล้ว” ไม่เกินเครดิต (banker’s)
//       const allocQty = safeQtyByCredit(clampNonNeg(maxQtyRaw), unitPrice, credit.remainingCredit);
//       if (allocQty <= 0) continue;

//       const amount = bankersRound(allocQty * unitPrice, 2);

//       // apply (กันติดลบ + ปัดแบบ banker’s)
//       src.remainingQty = bankersRound(clampNonNeg(src.remainingQty - allocQty), 2);
//       credit.remainingCredit = bankersRound(clampNonNeg(credit.remainingCredit - amount), 2);
//       reqRemaining = bankersRound(clampNonNeg(reqRemaining - allocQty), 2);

//       allocations.push({
//         subOrderId: order.subOrderId,
//         itemId: order.itemId,
//         warehouseId: src.warehouseId,
//         supplierId: src.supplierId,
//         qty: allocQty,
//         unitPrice,
//         amount,
//       });

//       remainingRequestBySubOrderId[order.subOrderId] = reqRemaining;

//       // stop if credit exhausted
//       if (credit.remainingCredit <= 0) break;
//     }

//     if (reqRemaining > 0) {
//       // not fully allocated (stock or credit)
//       warnings.push(`SubOrder ${order.subOrderId} not fully allocated. Remaining request: ${reqRemaining}`);
//     }
//   }

//   return { allocations, inventory: inv, credits, remainingRequestBySubOrderId, warnings };
// }
