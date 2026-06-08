import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import bcrypt from "bcryptjs";
import { createSessionCookie } from "@/lib/auth";
import { sanitizeInput, validateUsername } from "@/lib/security";
import { checkRateLimit, incrementRateLimit, resetRateLimit, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Sanitize and validate inputs
    const username = sanitizeInput(body.username);
    const { password, rememberMe } = body;

    const ip = getClientIp(req);
    const rateLimitKeyIp = `login_ip_${ip}`;
    const rateLimitKeyUser = `login_user_${username.toLowerCase()}`;

    // Apply Rate Limiting
    if (!checkRateLimit(rateLimitKeyIp) || (username && !checkRateLimit(rateLimitKeyUser))) {
      return NextResponse.json(
        { error: "Tài khoản của bạn đã bị khóa tạm thời do nhập sai nhiều lần. Vui lòng thử lại sau 15 phút." },
        { status: 429 }
      );
    }

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username và mật khẩu là bắt buộc." },
        { status: 400 }
      );
    }

    if (!validateUsername(username)) {
      incrementRateLimit(rateLimitKeyIp);
      return NextResponse.json(
        { error: "Tên tài khoản hoặc mật khẩu không chính xác." },
        { status: 400 }
      );
    }

    const lowerUsername = username.toLowerCase();

    // Find user by username only
    const user = await db.user.findUnique({
      where: { username: lowerUsername },
    });

    if (!user) {
      incrementRateLimit(rateLimitKeyIp);
      incrementRateLimit(rateLimitKeyUser);
      return NextResponse.json(
        { error: "Tên tài khoản hoặc mật khẩu không chính xác." },
        { status: 400 }
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      incrementRateLimit(rateLimitKeyIp);
      incrementRateLimit(rateLimitKeyUser);
      return NextResponse.json(
        { error: "Tên tài khoản hoặc mật khẩu không chính xác." },
        { status: 400 }
      );
    }

    // Reset rate limits on successful authentication
    resetRateLimit(rateLimitKeyIp);
    resetRateLimit(rateLimitKeyUser);

    // Create secure session cookie (Strict, httpOnly, Secure)
    await createSessionCookie(user.id, user.email, user.username, !!rememberMe);

    return NextResponse.json({
      success: true,
      message: "Đăng nhập thành công.",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi trong quá trình đăng nhập." },
      { status: 500 }
    );
  }
}
