import type { CreateProductRequest } from "@/types/brand";
import type { Product, SizeChartRow } from "@/types/product";

export interface BackendProductImage {
  imageUrl: string;
  imageType?: string;
  sortOrder?: number;
}

export interface BackendProductVariant {
  colorName?: string;
  colorHex?: string;
  sizeLabel?: string;
}

export interface BackendProductTag {
  tagType?: string;
  tagValue?: string;
}

export interface BackendSizeChart {
  sizeLabel: string;
  chestCm?: number;
  waistCm?: number;
  hipCm?: number;
  shoulderCm?: number;
  lengthCm?: number;
  inseamCm?: number;
  heightMinCm?: number;
  heightMaxCm?: number;
  weightMinKg?: number;
  weightMaxKg?: number;
  note?: string;
}

export interface BackendProduct {
  id: string;
  brandId: string;
  brandName: string;
  name: string;
  description?: string;
  category: string;
  price: number;
  material?: string;
  fitType?: Product["fitType"];
  purchaseUrl: string;
  stockStatus?: Product["stockStatus"];
  status: Product["status"];
  aiTryOnEligible: boolean;
  images?: BackendProductImage[];
  variants?: BackendProductVariant[];
  tags?: BackendProductTag[];
  sizeCharts?: BackendSizeChart[];
}

export function toBackendProductRequest(data: CreateProductRequest) {
  const colors = data.colors.filter(Boolean);
  const sizes = data.sizes.filter(Boolean);
  const variants: { colorName: string; sizeLabel: string }[] = [];
  for (const color of colors.length ? colors : ["Đen"]) {
    for (const size of sizes.length ? sizes : ["M"]) {
      variants.push({ colorName: color, sizeLabel: size });
    }
  }

  const styleTags = (data.styleTags || []).filter(Boolean);
  const occasionTags = (data.occasionTags || []).filter(Boolean);
  const tags = [
    ...styleTags.map((tagValue) => ({ tagType: "STYLE", tagValue })),
    ...occasionTags.map((tagValue) => ({ tagType: "OCCASION", tagValue })),
  ];

  const imageUrls = (data.images || []).map((u) => u.trim()).filter(Boolean);
  const images = imageUrls.map((imageUrl, index) => ({
    imageUrl,
    imageType: index === 0 ? "MAIN" : "DETAIL",
    sortOrder: index,
  }));

  const sizeCharts =
    data.sizeCharts && data.sizeCharts.length > 0
      ? data.sizeCharts
      : sizes.map((sizeLabel, index) => ({
          sizeLabel,
          chestCm: 88 + index * 4,
          waistCm: 70 + index * 3,
          hipCm: 92 + index * 3,
          heightMinCm: 150 + index * 5,
          heightMaxCm: 165 + index * 5,
          weightMinKg: 45 + index * 5,
          weightMaxKg: 60 + index * 5,
        }));

  return {
    name: data.name,
    description: data.description,
    category: data.category,
    price: data.price,
    material: data.material,
    fitType: data.fitType,
    purchaseUrl: data.purchaseUrl,
    variants,
    tags,
    images,
    sizeCharts,
  };
}

export function mapProduct(raw: BackendProduct): Product {
  const colors = [...new Set((raw.variants || []).map((v) => v.colorName).filter(Boolean))] as string[];
  const sizes = [...new Set((raw.variants || []).map((v) => v.sizeLabel).filter(Boolean))] as string[];
  const tags = raw.tags || [];

  const sizeCharts: SizeChartRow[] = (raw.sizeCharts || []).map((row) => ({
    sizeLabel: row.sizeLabel,
    chestCm: row.chestCm != null ? Number(row.chestCm) : undefined,
    waistCm: row.waistCm != null ? Number(row.waistCm) : undefined,
    hipCm: row.hipCm != null ? Number(row.hipCm) : undefined,
    shoulderCm: row.shoulderCm != null ? Number(row.shoulderCm) : undefined,
    heightMinCm: row.heightMinCm,
    heightMaxCm: row.heightMaxCm,
    weightMinKg: row.weightMinKg != null ? Number(row.weightMinKg) : undefined,
    weightMaxKg: row.weightMaxKg != null ? Number(row.weightMaxKg) : undefined,
  }));

  return {
    id: raw.id,
    brandId: raw.brandId,
    brandName: raw.brandName,
    name: raw.name,
    category: raw.category,
    price: Number(raw.price),
    images: (raw.images || []).map((img) => img.imageUrl),
    imageDetails: (raw.images || []).map((img) => ({
      url: img.imageUrl,
      type: img.imageType || "MAIN",
      sortOrder: img.sortOrder ?? 0,
    })),
    colors,
    sizes,
    sizeCharts,
    material: raw.material,
    fitType: raw.fitType || "REGULAR",
    styleTags: tags.filter((t) => t.tagType === "STYLE").map((t) => t.tagValue || ""),
    occasionTags: tags.filter((t) => t.tagType === "OCCASION").map((t) => t.tagValue || ""),
    purchaseUrl: raw.purchaseUrl,
    stockStatus: raw.stockStatus || "IN_STOCK",
    status: raw.status,
    aiTryOnEligible: raw.aiTryOnEligible,
    description: raw.description,
  };
}
