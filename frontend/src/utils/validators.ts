import { z } from "zod";

export const bodyProfileSchema = z.object({
  heightCm: z.number({ error: "Nhập chiều cao" }).min(100, "Chiều cao tối thiểu 100cm").max(230, "Chiều cao tối đa 230cm"),
  weightKg: z.number({ error: "Nhập cân nặng" }).min(25, "Cân nặng tối thiểu 25kg").max(250, "Cân nặng tối đa 250kg"),
  fitPreference: z.enum(["SLIM", "REGULAR", "RELAXED", "OVERSIZE", "UNSURE"]),
  skinTone: z.enum(["FAIR", "MEDIUM", "TAN", "DEEP", "UNSURE"]),
  goals: z.array(z.string()).min(1, "Chọn ít nhất 1 mục tiêu"),
});

export const styleProfileSchema = z.object({
  primaryStyle: z.string().min(1, "Chọn phong cách chính"),
  secondaryStyles: z.array(z.string()),
  riskLevel: z.enum(["SAFE", "BALANCED", "BOLD", "EXPERIMENTAL"]),
  artisticMode: z.boolean(),
  preferredColors: z.array(z.string()).min(1, "Chọn ít nhất 1 màu ưa thích"),
  avoidedColors: z.array(z.string()),
});

export const occasionSchema = z.object({
  occasion: z.string().min(1, "Chọn hoàn cảnh"),
  desiredVibe: z.string().min(1, "Chọn vibe mong muốn"),
  budgetMin: z.number().optional(),
  budgetMax: z.number().optional(),
  wardrobeMode: z.enum(["NEW_ITEMS_ONLY", "MIX_WARDROBE_AND_BRAND", "USE_WARDROBE_FIRST", "NO_WARDROBE_DATA"]),
});

export const loginSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
});

export const registerSchema = z.object({
  fullName: z.string().min(2, "Họ tên tối thiểu 2 ký tự"),
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Mật khẩu không khớp",
  path: ["confirmPassword"],
});

export const tryOnInputSchema = z.object({
  heightCm: z.number().min(100).max(250),
  weightKg: z.number().min(30).max(200),
  fitPreference: z.string().min(1),
  skinTone: z.string().min(1),
  occasion: z.string().min(1),
  desiredVibe: z.string().min(1),
  usualSize: z.string().min(1, "Nhập size thường mặc"),
  inputMode: z.enum(["USER_PHOTO", "AVATAR", "OUTFIT_BOARD_ONLY"]),
});

export const brandOnboardingSchema = z.object({
  name: z.string().min(2, "Tên thương hiệu tối thiểu 2 ký tự"),
  ownerName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  shopeeUrl: z.string().optional(),
  tiktokShopUrl: z.string().optional(),
  instagram: z.string().optional(),
  productCategory: z.string().min(1),
  description: z.string().optional(),
});

export type BodyProfileForm = z.infer<typeof bodyProfileSchema>;
export type StyleProfileForm = z.infer<typeof styleProfileSchema>;
export type OccasionForm = z.infer<typeof occasionSchema>;
export type LoginForm = z.infer<typeof loginSchema>;
export type RegisterForm = z.infer<typeof registerSchema>;
export type TryOnInputForm = z.infer<typeof tryOnInputSchema>;
export type BrandOnboardingForm = z.infer<typeof brandOnboardingSchema>;
