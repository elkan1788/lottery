import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { isAdminAuthenticated } from "@/lib/auth/session";

async function savePrizeImage(file: File) {
  if (!file || file.size === 0) {
    throw new Error("MISSING_IMAGE_FILE");
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("INVALID_IMAGE_FILE");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("IMAGE_TOO_LARGE");
  }

  const extension = file.name.includes(".") ? file.name.split(".").pop() : "png";
  const fileName = `${randomUUID()}.${extension || "png"}`;
  const relativePath = `/uploads/prizes/${fileName}`;
  const absoluteDir = path.join(process.cwd(), "public", "uploads", "prizes");
  const absolutePath = path.join(absoluteDir, fileName);
  const buffer = Buffer.from(await file.arrayBuffer());

  await mkdir(absoluteDir, { recursive: true });
  await writeFile(absolutePath, buffer);

  return relativePath;
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ message: "请先登录后台。" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("imageFile");

  if (!(file instanceof File)) {
    return NextResponse.json({ message: "请选择要上传的图片。" }, { status: 400 });
  }

  try {
    const imageUrl = await savePrizeImage(file);

    return NextResponse.json({ imageUrl });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_IMAGE_FILE") {
      return NextResponse.json({ message: "请上传图片格式的文件。" }, { status: 400 });
    }

    if (error instanceof Error && error.message === "IMAGE_TOO_LARGE") {
      return NextResponse.json({ message: "图片大小不能超过 5MB。" }, { status: 400 });
    }

    if (error instanceof Error && error.message === "MISSING_IMAGE_FILE") {
      return NextResponse.json({ message: "请选择要上传的图片。" }, { status: 400 });
    }

    throw error;
  }
}
