export type OrdersCollectOptions = {
  includeItems?: boolean;
  onPage?: (rawOrders: Record<string, unknown>[]) => void;
};

export type VtexCollectContext = {
  dateFrom: string;
  dateTo: string;
  siteUrl: string;
  ordersOptions?: OrdersCollectOptions;
};
