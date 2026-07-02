import { z } from "zod";

export const prizeFormSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  name: z.string().trim().min(1, "请输入奖品名称").max(60, "奖品名称不能超过 60 个字符"),
  tier: z.coerce.number().int().min(1, "等级至少为 1").max(99, "等级不能超过 99"),
  probabilityWeight: z.coerce.number().int().min(1, "权重至少为 1").max(100000, "权重过大"),
  stock: z.coerce.number().int().min(0, "库存不能小于 0").max(100000, "库存过大"),
  imageUrl: z
    .string()
    .trim()
    .max(500, "图片地址不能超过 500 个字符")
    .optional()
    .transform((value) => value || null),
  isActive: z.boolean(),
});

export type PrizeFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  issues?: Partial<Record<keyof z.infer<typeof prizeFormSchema>, string[]>>;
  editingId?: string | null;
};

export const initialPrizeFormState: PrizeFormState = {
  status: "idle",
  editingId: null,
};
