import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import crypto from "crypto";
import { sanitizeInput, validateEmail, validateUsername } from "@/lib/security";
import { checkRateLimit, incrementRateLimit, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = sanitizeInput(body.action);

    const ip = getClientIp(req);
    const rateLimitKeyIp = `recovery_ip_${ip}`;

    // Apply Rate Limiting
    if (!checkRateLimit(rateLimitKeyIp)) {
      return NextResponse.json(
        { error: "Bạn đã thực hiện quá nhiều yêu cầu khôi phục. Vui lòng thử lại sau 15 phút." },
        { status: 429 }
      );
    }

    if (action === "forgot-username") {
      const email = sanitizeInput(body.email);

      if (!email || !validateEmail(email)) {
        incrementRateLimit(rateLimitKeyIp);
        return NextResponse.json(
          { error: "Định dạng email khôi phục không hợp lệ." },
          { status: 400 }
        );
      }

      const lowerEmail = email.toLowerCase();
      const user = await db.user.findUnique({
        where: { email: lowerEmail },
      });

      if (user) {
        console.log("==========================================");
        console.log(`[MOCK EMAIL SERVICE] Account recovery requested for Email: ${lowerEmail}`);
        console.log(`Your associated username is: ${user.username}`);
        console.log("==========================================");
      } else {
        console.log(`[Forgot Username] Email not found: ${lowerEmail}`);
      }

      return NextResponse.json({
        success: true,
        message: "Nếu email tồn tại trong hệ thống, thông tin tài khoản đã được gửi.",
      });
    }

    if (action === "forgot-password") {
      const username = sanitizeInput(body.username);
      const email = sanitizeInput(body.email);

      if (!username || !email || !validateUsername(username) || !validateEmail(email)) {
        incrementRateLimit(rateLimitKeyIp);
        return NextResponse.json(
          { error: "Username và email không hợp lệ." },
          { status: 400 }
        );
      }

      const lowerUsername = username.toLowerCase();
      const lowerEmail = email.toLowerCase();

      const user = await db.user.findFirst({
        where: {
          username: lowerUsername,
          email: lowerEmail,
        },
      });

      if (user) {
        const resetToken = crypto.randomBytes(32).toString("hex");
        const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour expiry

        await db.user.update({
          where: { id: user.id },
          data: {
            resetToken,
            resetTokenExpiry,
          },
        });

        const origin = req.headers.get("origin") || "http://localhost:3000";
        const resetUrl = `${origin}/reset-password?token=${resetToken}`;
        console.log("==========================================");
        console.log(`[MOCK EMAIL SERVICE] Password recovery for username: ${user.username}`);
        console.log(`Reset link: ${resetUrl}`);
        console.log("==========================================");
      } else {
        console.log(`[Forgot Password] Username and email mismatch: ${lowerUsername} / ${lowerEmail}`);
      }

      return NextResponse.json({
        success: true,
        message: "Nếu thông tin khớp với tài khoản, hướng dẫn đặt lại mật khẩu đã được gửi.",
      });
    }

    if (action === "forgot-both") {
      const email = sanitizeInput(body.email);

      if (!email || !validateEmail(email)) {
        incrementRateLimit(rateLimitKeyIp);
        return NextResponse.json(
          { error: "Định dạng email khôi phục không hợp lệ." },
          { status: 400 }
        );
      }

      const lowerEmail = email.toLowerCase();
      const user = await db.user.findUnique({
        where: { email: lowerEmail },
      });

      if (user) {
        const resetToken = crypto.randomBytes(32).toString("hex");
        const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour expiry

        await db.user.update({
          where: { id: user.id },
          data: {
            resetToken,
            resetTokenExpiry,
          },
        });

        const origin = req.headers.get("origin") || "http://localhost:3000";
        const resetUrl = `${origin}/reset-password?token=${resetToken}`;
        console.log("==========================================");
        console.log(`[MOCK EMAIL SERVICE] Full credentials recovery requested for Email: ${lowerEmail}`);
        console.log(`Associated Username: ${user.username}`);
        console.log(`Password reset link: ${resetUrl}`);
        console.log("==========================================");
      } else {
        console.log(`[Forgot Both] Email not found: ${lowerEmail}`);
      }

      return NextResponse.json({
        success: true,
        message: "Nếu email tồn tại trong hệ thống, thông tin khôi phục chi tiết đã được gửi.",
      });
    }

    return NextResponse.json(
      { error: "Yêu cầu khôi phục không hợp lệ." },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi khi xử lý yêu cầu khôi phục." },
      { status: 500 }
    );
  }
}
