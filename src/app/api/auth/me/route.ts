import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { authenticated: false, error: "Chưa đăng nhập." },
        { status: 401 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: session.userId,
        email: session.email,
        username: session.username,
      },
    });
  } catch (error: any) {
    console.error("Get session error:", error);
    return NextResponse.json(
      { authenticated: false, error: "Đã xảy ra lỗi khi lấy thông tin phiên làm việc." },
      { status: 500 }
    );
  }
}
