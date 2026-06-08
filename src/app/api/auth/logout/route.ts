import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await clearSessionCookie();
    return NextResponse.json({
      success: true,
      message: "Đăng xuất thành công.",
    });
  } catch (error: any) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi đăng xuất." },
      { status: 500 }
    );
  }
}
