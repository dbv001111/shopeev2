import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import crypto from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email là bắt buộc." },
        { status: 400 }
      );
    }

    const lowerEmail = email.toLowerCase().trim();

    // Check if user exists
    const user = await db.user.findUnique({
      where: { email: lowerEmail },
    });

    if (!user) {
      console.log(`[Forgot Password] Request for non-existent email: ${lowerEmail}`);
      return NextResponse.json({
        success: true,
        message: "Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi.",
      });
    }

    // Generate random hex reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    // Save token to database
    await db.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    // Mock sending email - print link to console
    const origin = req.headers.get("origin") || "http://localhost:3000";
    const resetUrl = `${origin}/reset-password?token=${resetToken}`;
    console.log("==========================================");
    console.log(`[MOCK EMAIL SERVICE] Send forgot password email to: ${lowerEmail}`);
    console.log(`Reset link: ${resetUrl}`);
    console.log("==========================================");

    return NextResponse.json({
      success: true,
      message: "Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi.",
    });
  } catch (error: any) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi xử lý yêu cầu quên mật khẩu." },
      { status: 500 }
    );
  }
}
