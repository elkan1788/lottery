"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useState } from "react";

import { savePrizeAction } from "@/app/admin/actions";
import {
  initialPrizeFormState,
  type PrizeFormState,
} from "@/lib/lottery/admin";
import type { PrizeListItem } from "@/lib/lottery/types";

function FieldError({
  state,
  field,
}: {
  state: PrizeFormState;
  field: keyof NonNullable<PrizeFormState["issues"]>;
}) {
  const message = state.issues?.[field]?.[0];

  if (!message) {
    return null;
  }

  return <p className="mt-2 text-xs text-amber-200">{message}</p>;
}

export function PrizeForm({
  editingPrize,
}: {
  editingPrize: PrizeListItem | null;
}) {
  const isLocalUploadEnabled = process.env.NODE_ENV === "development";
  const [state, formAction, pending] = useActionState(
    savePrizeAction,
    initialPrizeFormState,
  );
  const [imageUrl, setImageUrl] = useState(editingPrize?.imageUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setUploading(true);
    setUploadMessage("");

    try {
      const uploadFormData = new FormData();
      uploadFormData.append("imageFile", file);

      const response = await fetch("/api/admin/prize-upload", {
        method: "POST",
        body: uploadFormData,
      });

      const payload = (await response.json()) as { imageUrl?: string; message?: string };

      if (!response.ok || !payload.imageUrl) {
        setUploadMessage(payload.message || "图片上传失败，请稍后再试。");
        return;
      }

      setImageUrl(payload.imageUrl);
      setUploadMessage("图片上传成功，请提交表单保存奖品。");
    } catch {
      setUploadMessage("图片上传失败，请稍后再试。");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  return (
    <form action={formAction} className="mt-6 grid gap-5 md:grid-cols-2">
      <input type="hidden" name="id" defaultValue={editingPrize?.id ?? ""} />

      <label className="block">
        <span className="mb-2 block text-sm text-white/70">奖品名称</span>
        <input
          name="name"
          defaultValue={editingPrize?.name ?? ""}
          className="w-full rounded-md border border-white/12 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/60"
        />
        <FieldError state={state} field="name" />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm text-white/70">等级</span>
        <input
          name="tier"
          type="number"
          min="1"
          defaultValue={editingPrize?.tier ?? 1}
          className="w-full rounded-md border border-white/12 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/60"
        />
        <FieldError state={state} field="tier" />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm text-white/70">中奖权重</span>
        <input
          name="probabilityWeight"
          type="number"
          min="1"
          defaultValue={editingPrize?.probabilityWeight ?? 1}
          className="w-full rounded-md border border-white/12 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/60"
        />
        <FieldError state={state} field="probabilityWeight" />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm text-white/70">库存</span>
        <input
          name="stock"
          type="number"
          min="0"
          defaultValue={editingPrize?.stock ?? 0}
          className="w-full rounded-md border border-white/12 bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/60"
        />
        <FieldError state={state} field="stock" />
      </label>

      <label className="block md:col-span-2">
        <span className="mb-2 block text-sm text-white/70">奖品图片路径</span>
        {imageUrl ? (
          <div className="mb-3 flex items-center gap-3 rounded-md border border-white/10 bg-black/20 p-3">
            <Image
              src={imageUrl}
              alt={editingPrize?.name || "奖品图片"}
              width={64}
              height={64}
              className="h-16 w-16 rounded-md object-cover"
            />
            <p className="text-xs text-white/55">{imageUrl}</p>
          </div>
        ) : null}
        {isLocalUploadEnabled ? (
          <>
            <input
              name="imageFile"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="mb-3 w-full rounded-md border border-dashed border-white/16 bg-black/20 px-4 py-3 text-sm text-white outline-none transition file:mr-4 file:rounded-md file:border-0 file:bg-cyan-300/12 file:px-3 file:py-2 file:text-sm file:text-cyan-100"
            />
            {uploadMessage ? (
              <p className={`mb-3 text-xs ${uploadMessage.includes("成功") ? "text-cyan-200" : "text-amber-200"}`}>
                {uploadMessage}
              </p>
            ) : null}
            {uploading ? <p className="mb-3 text-xs text-white/60">图片上传中...</p> : null}
          </>
        ) : null}
        <input
          name="imageUrl"
          type="text"
          value={imageUrl}
          onChange={(event) => setImageUrl(event.target.value)}
          placeholder="/uploads/prizes/example.jpg"
          className="w-full rounded-md border border-white/12 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-cyan-300/60"
        />
        <p className="mt-2 text-xs text-white/50">
          {isLocalUploadEnabled
            ? "本地可上传图片生成路径；部署前需将 public/uploads/prizes 中的新图片随代码提交。"
            : "图片需先放入 public/uploads/prizes 并随代码部署，线上访问路径为 /uploads/prizes/文件名。"}
        </p>
        <FieldError state={state} field="imageUrl" />
      </label>

      <label className="flex items-center gap-3 text-sm text-white/80 md:col-span-2">
        <input
          name="isActive"
          type="checkbox"
          defaultChecked={editingPrize?.isActive ?? true}
          className="h-4 w-4 rounded border-white/20 bg-black/20"
        />
        上架并参与抽奖
      </label>

      <div className="flex gap-3 md:col-span-2">
        <button
          type="submit"
          disabled={pending || uploading}
          className="rounded-md bg-[linear-gradient(135deg,rgba(255,215,106,0.95),rgba(255,77,184,0.95))] px-5 py-3 text-sm font-semibold text-[#1f0721] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? "提交中..." : editingPrize ? "保存修改" : "新增奖品"}
        </button>
        {editingPrize ? (
          <Link
            href="/admin/prizes"
            className="rounded-md border border-white/12 px-5 py-3 text-sm text-white/80"
          >
            取消编辑
          </Link>
        ) : null}
      </div>

      {state.message ? (
        <p
          className={`text-sm md:col-span-2 ${
            state.status === "error" ? "text-amber-200" : "text-cyan-200"
          }`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
