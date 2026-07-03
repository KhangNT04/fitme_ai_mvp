import type { TryOnItem } from "@/types/tryon";

export type TryOnItemRole =
  | "TOP"
  | "BOTTOM"
  | "OUTERWEAR"
  | "SHOES"
  | "ACCESSORY"
  | "ONE_PIECE";

export function mapCategoryToRole(category: string): TryOnItemRole {
  const lower = category.toLowerCase();
  if (lower.includes("quần") || lower.includes("bottom") || lower.includes("chân")) {
    return "BOTTOM";
  }
  if (lower.includes("giày") || lower.includes("shoe")) {
    return "SHOES";
  }
  if (lower.includes("áo khoác") || lower.includes("khoác") || lower.includes("outer")) {
    return "OUTERWEAR";
  }
  if (lower.includes("váy") || lower.includes("dress") || lower.includes("one")) {
    return "ONE_PIECE";
  }
  if (lower.includes("phụ kiện") || lower.includes("access")) {
    return "ACCESSORY";
  }
  return "TOP";
}

export const TRY_ON_ROLE_LABELS: Record<TryOnItemRole, string> = {
  TOP: "áo / top",
  BOTTOM: "quần / váy",
  OUTERWEAR: "áo khoác",
  SHOES: "giày",
  ACCESSORY: "phụ kiện",
  ONE_PIECE: "váy / đầm",
};

function rolesToReplaceWhenAdding(role: TryOnItemRole): TryOnItemRole[] {
  if (role === "ONE_PIECE") {
    return ["ONE_PIECE", "TOP", "BOTTOM"];
  }
  if (role === "TOP" || role === "BOTTOM") {
    return [role, "ONE_PIECE"];
  }
  return [role];
}

export type TryOnAddItemResult = "added" | "replaced" | "unchanged";

/** Items that would be removed when adding `incoming` (empty if duplicate or no conflict). */
export function getTryOnItemsToReplace(
  items: TryOnItem[],
  incoming: TryOnItem,
): TryOnItem[] {
  if (items.some((item) => item.productId === incoming.productId)) {
    return [];
  }
  const rolesToReplace = new Set(rolesToReplaceWhenAdding(mapCategoryToRole(incoming.category)));
  return items.filter((item) => rolesToReplace.has(mapCategoryToRole(item.category)));
}

export function buildTryOnReplaceConfirmMessage(
  replacing: TryOnItem[],
  incoming: TryOnItem,
): { title: string; description: string } {
  const roleLabel = TRY_ON_ROLE_LABELS[mapCategoryToRole(incoming.category)];
  if (replacing.length === 1) {
    const current = replacing[0];
    const currentRoleLabel = TRY_ON_ROLE_LABELS[mapCategoryToRole(current.category)];
    return {
      title: `Thay ${roleLabel}?`,
      description: `Bạn đã chọn "${current.name}" (${currentRoleLabel}). Bạn có muốn thay bằng "${incoming.name}" không?`,
    };
  }
  const names = replacing.map((item) => `"${item.name}"`).join(", ");
  return {
    title: "Thay món trong outfit?",
    description: `Bạn đã chọn ${names}. Thêm "${incoming.name}" sẽ thay các món này. Bạn có muốn tiếp tục không?`,
  };
}

export function mergeTryOnSelection(
  items: TryOnItem[],
  incoming: TryOnItem,
): { items: TryOnItem[]; result: TryOnAddItemResult } {
  if (items.some((item) => item.productId === incoming.productId)) {
    return { items, result: "unchanged" };
  }

  const rolesToReplace = new Set(rolesToReplaceWhenAdding(mapCategoryToRole(incoming.category)));
  const filtered = items.filter(
    (item) => !rolesToReplace.has(mapCategoryToRole(item.category)),
  );
  const result: TryOnAddItemResult = filtered.length < items.length ? "replaced" : "added";

  return {
    items: [...filtered, incoming],
    result,
  };
}
