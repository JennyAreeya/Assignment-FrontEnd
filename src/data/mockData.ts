import type { CustomerCredit, Inventory, OrderLine, PriceRule } from "../shared/types/types";

const TYPES = ["EMERGENCY", "CLAIM", "OVERDUE", "DAILY"] as const;
type OrderType = (typeof TYPES)[number];

// ---------- deterministic RNG (ทำให้ได้ผลซ้ำเดิมทุกครั้ง) ----------
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function pick<T>(rng: () => number, arr: readonly T[]) {
  return arr[Math.floor(rng() * arr.length)];
}
function pad(n: number, len = 4) {
  return String(n).padStart(len, "0");
}
function chance(rng: () => number, p: number) {
  return rng() < p;
}

// ---------- main generator ----------
export function generateMockData(orderCount = 5000, seed = 12345) {
  const rng = mulberry32(seed);

  const ITEM_COUNT = 20;
  const WH_COUNT = 5;
  const SP_COUNT = 5;
  const CUSTOMER_COUNT = 200;

  const items = Array.from({ length: ITEM_COUNT }, (_, i) => `Item-${pad(i + 1, 3)}`);
  const warehouses = Array.from({ length: WH_COUNT }, (_, i) => `WH-${pad(i + 1, 3)}`);
  const suppliers = Array.from({ length: SP_COUNT }, (_, i) => `SP-${pad(i + 1, 3)}`);
  const customers = Array.from({ length: CUSTOMER_COUNT }, (_, i) => `CT-${pad(i + 1, 4)}`);

  // ----- Price rules: ทุก item x supplier มีราคา -----
  const mockPriceRules: PriceRule[] = [];
  for (const itemId of items) {
    for (const supplierId of suppliers) {
      const baseUnitPrice = Math.round((50 + rng() * 450) * 100) / 100; // 50.00 - 500.00
      mockPriceRules.push({
        itemId,
        supplierId,
        baseUnitPrice,
        typeMultiplier: {
          EMERGENCY: 1.25,
          CLAIM: 1.0,
          OVERDUE: 1.0,
          DAILY: 1.0,
        },
      });
    }
  }

  // ----- Inventory: stock กระจายทุก item x warehouse x supplier -----
  const mockInventory: Inventory[] = [];
  for (const itemId of items) {
    for (const warehouseId of warehouses) {
      for (const supplierId of suppliers) {
        // ทำให้มี stock เยอะพอสำหรับ 5000 orders
        const remainingQty = Math.floor(200 + rng() * 3000); // 200 - 3200
        mockInventory.push({ itemId, warehouseId, supplierId, remainingQty });
      }
    }
  }

  // ----- Credits: ต่อ customer -----
  const mockCredits: CustomerCredit[] = customers.map((customerId) => ({
    customerId,
    remainingCredit: Math.round((20000 + rng() * 200000) * 100) / 100, // 20k - 220k
  }));

  // ----- Orders 5000 รายการ -----
  // สร้าง orderId ให้ “หนึ่ง order มีหลาย subOrder ได้” เพื่อเหมือนโจทย์จริง
  const mockOrders: OrderLine[] = [];
  const start = new Date("2025-01-01T00:00:00Z").getTime();

  // สัดส่วน type (ปรับได้)
  const typeBag: OrderType[] = [
    ...Array(10).fill("DAILY"),
    ...Array(4).fill("OVERDUE"),
    ...Array(3).fill("CLAIM"),
    ...Array(3).fill("EMERGENCY"),
  ];

  for (let i = 0; i < orderCount; i++) {
    const orderGroup = Math.floor(i / 2) + 1; // เฉลี่ย 2 subOrders ต่อ 1 order
    const orderId = `ORDER-${pad(orderGroup, 4)}`;
    const subOrderId = `${orderId}-${pad((i % 2) + 1, 3)}`; // 001 / 002

    const type = pick(rng, typeBag);
    const itemId = pick(rng, items);
    const customerId = pick(rng, customers);

    // WH-000/SP-000 บางส่วนไว้ทดสอบ logic ANY
    const warehouseId = chance(rng, 0.12) ? "WH-000" : pick(rng, warehouses);
    const supplierId = chance(rng, 0.12) ? "SP-000" : pick(rng, suppliers);

    // request qty แบบจำนวนเต็ม
    const requestQty =
      type === "EMERGENCY"
        ? Math.floor(50 + rng() * 400) // 50-450
        : Math.floor(5 + rng() * 120); // 5-125

    const createDate = new Date(start + i * 60_000).toISOString(); // เพิ่มทีละ 1 นาที

    const remark = chance(rng, 0.08) ? "Special for VIP" : "";

    mockOrders.push({
      orderId,
      subOrderId,
      itemId,
      warehouseId,
      supplierId,
      requestQty,
      type,
      createDate,
      customerId,
      remark,
    });
  }

  return { mockOrders, mockInventory, mockCredits, mockPriceRules };
}

// Mock data 5000 รายการ สำหรับใช้ในระบบ
export const { mockOrders, mockInventory, mockCredits, mockPriceRules } = generateMockData(5000, 99999);


//#region Assignment mock data
// export const mockOrders: OrderLine[] = [
//   // ORDER-0001 (2 sub orders)  CUSTOMER CT-0001
//   {
//     orderId: "ORDER-0001",
//     subOrderId: "ORDER-0001-001",
//     itemId: "Item-1",
//     warehouseId: "WH-001",
//     supplierId: "SP-001",
//     requestQty: 11,
//     type: "DAILY",
//     createDate: "2025-01-01T00:00:00Z", // 1/1/25
//     customerId: "CT-0001",
//     remark: "",
//   },
//   {
//     orderId: "ORDER-0001",
//     subOrderId: "ORDER-0001-002",
//     itemId: "Item-2",
//     warehouseId: "WH-002",
//     supplierId: "SP-000", // any supplier
//     requestQty: 20,
//     type: "DAILY",
//     createDate: "2025-01-01T00:00:00Z", // 01/01/2025
//     customerId: "CT-0001",
//     remark: "",
//   },

//   // ORDER-0002 (2 sub orders)  CUSTOMER CT-0002
//   {
//     orderId: "ORDER-0002",
//     subOrderId: "ORDER-0002-001",
//     itemId: "Item-1",
//     warehouseId: "WH-001",
//     supplierId: "SP-002",
//     requestQty: 300,
//     type: "EMERGENCY",
//     createDate: "2025-01-03T00:00:00Z", // 03/01/2025
//     customerId: "CT-0002",
//     remark: "Special for VIP",
//   },
//   {
//     orderId: "ORDER-0002",
//     subOrderId: "ORDER-0002-002",
//     itemId: "Item-2",
//     warehouseId: "WH-000", // any warehouse
//     supplierId: "SP-000",   // any supplier
//     requestQty: 100,
//     type: "EMERGENCY",
//     createDate: "2025-01-03T00:00:00Z",
//     customerId: "CT-0002",
//     remark: "Special for VIP",
//   },
// ];

// export const mockInventory: Inventory[] = [
//   // ให้มี stock กระจาย
//   { itemId: "Item-1", warehouseId: "WH-001", supplierId: "SP-001", remainingQty: 50 },
//   { itemId: "Item-1", warehouseId: "WH-001", supplierId: "SP-002", remainingQty: 350 },
//   { itemId: "Item-2", warehouseId: "WH-002", supplierId: "SP-001", remainingQty: 80 },
//   { itemId: "Item-2", warehouseId: "WH-002", supplierId: "SP-002", remainingQty: 120 },
//   { itemId: "Item-2", warehouseId: "WH-000", supplierId: "SP-002", remainingQty: 0 }, // optional
// ];

// export const mockCredits: CustomerCredit[] = [
//   { customerId: "CT-0001", remainingCredit: 2000 },
//   { customerId: "CT-0002", remainingCredit: 50000},
// ];

// /**
//  * ตาราง Price Rules :
//  * - baseUnitPrice = ราคา (Price)
//  * - typeMultiplier = % ของ Price Tier
//  *   EMERGENCY 125% => 1.25
//  *   CLAIM 0%       => 0
//  *   OVERDUE 100%   => 1.0
//  *   DAILY 100%     => 1.0
//  */
// export const mockPriceRules: PriceRule[] = [
//   // Item-1 / SP-001 => 123.49
//   {
//     itemId: "Item-1",
//     supplierId: "SP-001",
//     baseUnitPrice: 123.49,
//     typeMultiplier: { EMERGENCY: 1.25, CLAIM: 0.0, OVERDUE: 1.0, DAILY: 1.0 },
//   },
//   // Item-1 / SP-002 => 99.75
//   {
//     itemId: "Item-1",
//     supplierId: "SP-002",
//     baseUnitPrice: 99.75,
//     typeMultiplier: { EMERGENCY: 1.25, CLAIM: 0.0, OVERDUE: 1.0, DAILY: 1.0 },
//   },

//   // เพิ่ม Item-2 ด้วย (กันระบบหาราคาไม่เจอเวลา order เป็น Item-2)
//   {
//     itemId: "Item-2",
//     supplierId: "SP-001",
//     baseUnitPrice: 110.0,
//     typeMultiplier: { EMERGENCY: 1.25, CLAIM: 0.0, OVERDUE: 1.0, DAILY: 1.0 },
//   },
//   {
//     itemId: "Item-2",
//     supplierId: "SP-002",
//     baseUnitPrice: 95.0,
//     typeMultiplier: { EMERGENCY: 1.25, CLAIM: 0.0, OVERDUE: 1.0, DAILY: 1.0 },
//   },
// ];
//#endregion Assignment mock data

//#region Old mock data
// export const mockOrders: OrderLine[] = [
//   {
//     orderId: "ORD-001",
//     subOrderId: "ORD-001-01",
//     itemId: "SALMON",
//     warehouseId: "WH-001",
//     supplierId: "SP-001",
//     requestQty: 120,
//     type: "EMERGENCY",
//     createDate: "2026-01-01T08:00:00Z",
//     customerId: "CUST-A",
//     remark: "Special for VIP",
//   },
//   {
//     orderId: "ORD-002",
//     subOrderId: "ORD-002-01",
//     itemId: "SALMON",
//     warehouseId: "WH-000", // any warehouse
//     supplierId: "SP-001",
//     requestQty: 200,
//     type: "CLAIM",
//     createDate: "2026-01-02T09:10:00Z",
//     customerId: "CUST-B",
//   },
//   {
//     orderId: "ORD-003",
//     subOrderId: "ORD-003-01",
//     itemId: "SALMON",
//     warehouseId: "WH-002",
//     supplierId: "SP-000", // any supplier
//     requestQty: 180,
//     type: "OVERDUE",
//     createDate: "2026-01-03T10:20:00Z",
//     customerId: "CUST-A",
//   },
//   {
//     orderId: "ORD-004",
//     subOrderId: "ORD-004-01",
//     itemId: "SALMON",
//     warehouseId: "WH-000",
//     supplierId: "SP-000",
//     requestQty: 350,
//     type: "DAILY",
//     createDate: "2026-01-04T11:30:00Z",
//     customerId: "CUST-C",
//     remark: "Special for VIP",
//   },
// ];

// export const mockInventory: Inventory[] = [
//   { itemId: "SALMON", warehouseId: "WH-001", supplierId: "SP-001", remainingQty: 150 },
//   { itemId: "SALMON", warehouseId: "WH-002", supplierId: "SP-001", remainingQty: 120 },
//   { itemId: "SALMON", warehouseId: "WH-002", supplierId: "SP-002", remainingQty: 300 },
//   { itemId: "SALMON", warehouseId: "WH-003", supplierId: "SP-002", remainingQty: 180 },
// ];

// export const mockCredits: CustomerCredit[] = [
//   { customerId: "CUST-A", remainingCredit: 2000 },
//   { customerId: "CUST-B", remainingCredit: 1200 },
//   { customerId: "CUST-C", remainingCredit: 5000 },
// ];

// export const mockPriceRules: PriceRule[] = [
//   {
//     itemId: "SALMON",
//     supplierId: "SP-001",
//     baseUnitPrice: 10,
//     typeMultiplier: { EMERGENCY: 1.1, CLAIM: 1.0, OVERDUE: 0.98, DAILY: 1.0 },
//   },
//   {
//     itemId: "SALMON",
//     supplierId: "SP-002",
//     baseUnitPrice: 9.5,
//     typeMultiplier: { EMERGENCY: 1.12, CLAIM: 1.0, OVERDUE: 0.97, DAILY: 1.0 },
//   },
// ];
//#endregion Old mock data