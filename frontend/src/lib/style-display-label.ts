/** Map catalog English style keys to VN occasion language used on StyleResultsBoard. */
const STYLE_DISPLAY_LABELS: Record<string, string> = {
  "Office Chic": "Đi làm",
  Streetwear: "Đi chơi",
  Sporty: "Thể thao",
  "Korean Casual": "Hàn nhẹ",
  Minimal: "Tối giản",
  Romantic: "Hẹn hò",
  Vintage: "Vintage",
  Artistic: "Nghệ",
};

export function toStyleDisplayLabel(styleLabel?: string | null): string | undefined {
  if (!styleLabel) return undefined;
  const trimmed = styleLabel.trim();
  return STYLE_DISPLAY_LABELS[trimmed] ?? trimmed;
}

export function confidenceLabelVi(confidence?: string | null): string {
  switch ((confidence || "").toUpperCase()) {
    case "HIGH":
      return "Cao";
    case "MEDIUM":
      return "Trung bình";
    case "LOW":
      return "Thấp";
    default:
      return confidence || "—";
  }
}
