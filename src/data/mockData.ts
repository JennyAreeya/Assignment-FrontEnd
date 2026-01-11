import type { CustomerCredit, Inventory, OrderLine, PriceRule } from "../shared/types/types";
//#region Assignment mock data
export const mockOrders: OrderLine[] = [
  // ORDER-0001 (2 sub orders)  CUSTOMER CT-0001
  {
    orderId: "ORDER-0001",
    subOrderId: "ORDER-0001-001",
    itemId: "Item-1",
    warehouseId: "WH-001",
    supplierId: "SP-001",
    requestQty: 11,
    type: "DAILY",
    createDate: "2025-01-01T00:00:00Z", // 1/1/25
    customerId: "CT-0001",
    remark: "",
  },
  {
    orderId: "ORDER-0001",
    subOrderId: "ORDER-0001-002",
    itemId: "Item-2",
    warehouseId: "WH-002",
    supplierId: "SP-000", // any supplier
    requestQty: 20,
    type: "DAILY",
    createDate: "2025-01-01T00:00:00Z", // 01/01/2025
    customerId: "CT-0001",
    remark: "",
  },

  // ORDER-0002 (2 sub orders)  CUSTOMER CT-0002
  {
    orderId: "ORDER-0002",
    subOrderId: "ORDER-0002-001",
    itemId: "Item-1",
    warehouseId: "WH-001",
    supplierId: "SP-002",
    requestQty: 300,
    type: "EMERGENCY",
    createDate: "2025-01-03T00:00:00Z", // 03/01/2025
    customerId: "CT-0002",
    remark: "Special for VIP",
  },
  {
    orderId: "ORDER-0002",
    subOrderId: "ORDER-0002-002",
    itemId: "Item-2",
    warehouseId: "WH-000", // any warehouse
    supplierId: "SP-000",   // any supplier
    requestQty: 100,
    type: "EMERGENCY",
    createDate: "2025-01-03T00:00:00Z",
    customerId: "CT-0002",
    remark: "Special for VIP",
  },
];

export const mockInventory: Inventory[] = [
  // ให้มี stock กระจาย
  { itemId: "Item-1", warehouseId: "WH-001", supplierId: "SP-001", remainingQty: 50 },
  { itemId: "Item-1", warehouseId: "WH-001", supplierId: "SP-002", remainingQty: 350 },
  { itemId: "Item-2", warehouseId: "WH-002", supplierId: "SP-001", remainingQty: 80 },
  { itemId: "Item-2", warehouseId: "WH-002", supplierId: "SP-002", remainingQty: 120 },
  { itemId: "Item-2", warehouseId: "WH-000", supplierId: "SP-002", remainingQty: 0 }, // optional
];

export const mockCredits: CustomerCredit[] = [
  { customerId: "CT-0001", remainingCredit: 2000 },
  { customerId: "CT-0002", remainingCredit: 50000},
];

/**
 * ตาราง Price Rules :
 * - baseUnitPrice = ราคา (Price)
 * - typeMultiplier = % ของ Price Tier
 *   EMERGENCY 125% => 1.25
 *   CLAIM 0%       => 0
 *   OVERDUE 100%   => 1.0
 *   DAILY 100%     => 1.0
 */
export const mockPriceRules: PriceRule[] = [
  // Item-1 / SP-001 => 123.49
  {
    itemId: "Item-1",
    supplierId: "SP-001",
    baseUnitPrice: 123.49,
    typeMultiplier: { EMERGENCY: 1.25, CLAIM: 0.0, OVERDUE: 1.0, DAILY: 1.0 },
  },
  // Item-1 / SP-002 => 99.75
  {
    itemId: "Item-1",
    supplierId: "SP-002",
    baseUnitPrice: 99.75,
    typeMultiplier: { EMERGENCY: 1.25, CLAIM: 0.0, OVERDUE: 1.0, DAILY: 1.0 },
  },

  // เพิ่ม Item-2 ด้วย (กันระบบหาราคาไม่เจอเวลา order เป็น Item-2)
  {
    itemId: "Item-2",
    supplierId: "SP-001",
    baseUnitPrice: 110.0,
    typeMultiplier: { EMERGENCY: 1.25, CLAIM: 0.0, OVERDUE: 1.0, DAILY: 1.0 },
  },
  {
    itemId: "Item-2",
    supplierId: "SP-002",
    baseUnitPrice: 95.0,
    typeMultiplier: { EMERGENCY: 1.25, CLAIM: 0.0, OVERDUE: 1.0, DAILY: 1.0 },
  },
];
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