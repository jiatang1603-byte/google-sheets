export interface RatingMetrics {
  taste: number | null;             // 1. 口感與風味
  stability: number | null;         // 2. 品質穩定度
  freshness: number | null;         // 3. 新鮮度表現
  packaging: number | null;         // 4. 外包裝完整性
  delivery: number | null;          // 1. 交貨準時性
  fulfillment: number | null;       // 2. 訂單達成率
  responseSpeed: number | null;     // 1. 業務/客服回應速度
  serviceEfficiency: number | null; // 2. 售後問題處理
  pricing: number | null;           // 3. 價格合理性
}

export interface SurveyResponse {
  id: number;
  timestamp: string;
  customerName: string;
  contact: string;
  frequency: string;
  ratings: RatingMetrics;
  comments: string;
}

export type CategoryKey = keyof RatingMetrics;

export interface CategorySpec {
  key: CategoryKey;
  label: string;
  group: "quality" | "logistic" | "service";
  description: string;
}

export const CATEGORIES: CategorySpec[] = [
  { key: "taste", label: "口感與風味", group: "quality", description: "Q彈度、風味是否穩定" },
  { key: "stability", label: "品質穩定度", group: "quality", description: "不同批次的產品是否保持一致" },
  { key: "freshness", label: "新鮮度表現", group: "quality", description: "產品色澤、氣味及保存狀態" },
  { key: "packaging", label: "外包裝完整性", group: "quality", description: "封口、標示、有無破損" },
  { key: "delivery", label: "交貨準時性", group: "logistic", description: "是否在約定時間內送達" },
  { key: "fulfillment", label: "訂單達成率", group: "logistic", description: "有無缺貨、漏單或品項錯誤" },
  { key: "responseSpeed", label: "客服回應速度", group: "service", description: "諮詢、訂貨處理是否迅速" },
  { key: "serviceEfficiency", label: "售後問題處理", group: "service", description: "異常品質反映後的處理效率" },
  { key: "pricing", label: "價格合理性", group: "service", description: "相較於市場行情與品質之性價比" },
];
