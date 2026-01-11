export type OrderType = "EMERGENCY" | "CLAIM" | "OVERDUE" | "DAILY";

export type OrderLine = {
  orderId: string;
  subOrderId: string;
  itemId: string;
  warehouseId: string; // WH-000 means any
  supplierId: string; // SP-000 means any
  requestQty: number;
  type: OrderType;
  createDate: string; // ISO string
  customerId: string;
  remark?: string;
};

export type Inventory = {
  itemId: string;
  warehouseId: string;
  supplierId: string;
  remainingQty: number;
};

export type PriceRule = {
  itemId: string;
  supplierId: string;
  baseUnitPrice: number; // base price for supplier+item
  // modifier by order type (e.g. 1.0 = same, 1.1 = +10%)
  typeMultiplier: Record<OrderType, number>;
};

export type CustomerCredit = {
  customerId: string;
  remainingCredit: number; // assume "money credit"
};

export type AllocationLine = {
  subOrderId: string;
  itemId: string;
  warehouseId: string;
  supplierId: string;
  qty: number;
  unitPrice: number;
  amount: number;
};

export type AllocationResult = {
  allocations: AllocationLine[];
  // updated snapshots after allocation
  inventory: Inventory[];
  credits: CustomerCredit[];
  // per order remaining request (after auto assignment)
  remainingRequestBySubOrderId: Record<string, number>;
  warnings: string[];
};
