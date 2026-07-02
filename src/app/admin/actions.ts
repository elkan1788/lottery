"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { clearAdminSession, createAdminSession, validateAdminCredentials } from "@/lib/auth/session";
import {
  prizeFormSchema,
  type PrizeFormState,
} from "@/lib/lottery/admin";
import { createPrize, getPrizeById, updatePrize } from "@/lib/lottery/service";

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
    imageUrl: formData.get("currentImageUrl"),
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
