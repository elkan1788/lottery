"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { clearAdminSession, createAdminSession, validateAdminCredentials } from "@/lib/auth/session";
import {
  prizeFormSchema,
  type PrizeFormState,
} from "@/lib/lottery/admin";
import {
  clearAllWinners,
  createLotteryTables,
  createPrize,
  getPrizeById,
  getWinnerTierStats,
  updatePrize,
  updatePrizeStocksByTier,
} from "@/lib/lottery/service";

const initializeStocksSchema = z.object({
  tiers: z.array(
    z.object({
      tier: z.coerce.number().int().min(1),
      stock: z.coerce.number().int().min(0).max(100000),
    }),
  ),
});

export async function loginAdminAction(
  _prevState: { message?: string },
  formData: FormData,
) {
  const username = String(formData.get("username") || "");
  const password = String(formData.get("password") || "");

  if (!validateAdminCredentials({ username, password })) {
    return { message: "账号或密码不正确，请重新输入。" };
  }

  await createAdminSession();
  redirect("/admin/prizes");
}

export async function logoutAdminAction() {
  await clearAdminSession();
  redirect("/admin/login");
}

export async function createLotteryTablesAction() {
  await createLotteryTables();
  revalidatePath("/admin/setup");
}

export async function initializePrizeStocksAction(
  _prevState: { status: "idle" | "success" | "error"; message?: string } | undefined,
  formData: FormData,
) {
  const rawTiers = formData.getAll("tiers").map((value) => {
    try {
      return JSON.parse(String(value));
    } catch {
      return null;
    }
  });

  const parsed = initializeStocksSchema.safeParse({
    tiers: rawTiers.filter(Boolean),
  });

  if (!parsed.success || parsed.data.tiers.length === 0) {
    return {
      status: "error" as const,
      message: "奖品库存初始化参数无效，请检查后重试。",
    };
  }

  const updatedCount = await updatePrizeStocksByTier(parsed.data.tiers);
  revalidatePath("/admin/prizes");
  revalidatePath("/admin/setup");

  return {
    status: "success" as const,
    message: `库存初始化完成，已更新 ${updatedCount} 条奖品记录。`,
  };
}

export async function clearWinnersAction(
  _prevState: { status: "idle" | "success" | "error"; message?: string } | undefined,
  formData: FormData,
) {
  if (String(formData.get("confirm")) !== "CLEAR_WINNERS") {
    return {
      status: "error" as const,
      message: "未通过二次确认，中奖名单未清空。",
    };
  }

  const stats = await getWinnerTierStats();

  if (stats.length === 0) {
    return {
      status: "idle" as const,
      message: "当前没有中奖名单可清空。",
    };
  }

  const result = await clearAllWinners();
  revalidatePath("/admin/winners");
  revalidatePath("/admin/setup");

  return {
    status: "success" as const,
    message: `中奖名单已清空，共删除 ${result.count} 条记录。`,
  };
}

export async function savePrizeAction(
  _prevState: PrizeFormState,
  formData: FormData,
): Promise<PrizeFormState> {
  const parsed = prizeFormSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    tier: formData.get("tier"),
    probabilityWeight: formData.get("probabilityWeight"),
    stock: formData.get("stock"),
    imageUrl: formData.get("imageUrl"),
    isActive: formData.get("isActive") === "on",
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "表单信息未通过校验，请检查后再提交。",
      editingId: String(formData.get("id") || "") || null,
      issues: parsed.error.flatten().fieldErrors,
    };
  }

  const { id, ...payload } = parsed.data;

  if (id) {
    const existingPrize = await getPrizeById(id);

    if (!existingPrize) {
      return {
        status: "error",
        message: "未找到要编辑的奖品。",
      };
    }

    await updatePrize(id, payload);
  } else {
    await createPrize(payload);
  }

  revalidatePath("/admin/prizes");
  redirect("/admin/prizes");
}
