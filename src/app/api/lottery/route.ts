import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    message: "Lottery API skeleton is ready.",
    timestamp: new Date().toISOString(),
  });
}
