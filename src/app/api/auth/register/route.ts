import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import bcrypt from "bcryptjs";
import { sanitizeInput, validateUsername, validateEmail } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Sanitize and validate inputs
    const username = sanitizeInput(body.username);
    const email = sanitizeInput(body.email);
    const { password } = body;

    if (!username || !email || !password) {
      return NextResponse.json(
        { error: "Username, email và mật khẩu là bắt buộc." },
        { status: 400 }
      );
    }

    if (!validateUsername(username)) {
      return NextResponse.json(
        { error: "Username chỉ được chứa chữ cái, số, dấu gạch dưới, gạch ngang và dài 3-20 ký tự." },
        { status: 400 }
      );
    }

    if (!validateEmail(email)) {
      return NextResponse.json(
        { error: "Định dạng email khôi phục không hợp lệ." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Mật khẩu phải có ít nhất 6 ký tự." },
        { status: 400 }
      );
    }

    const lowerUsername = username.toLowerCase();
    const lowerEmail = email.toLowerCase();

    // Check if username or email already exists
    const existingUser = await db.user.findFirst({
      where: {
        OR: [
          { username: lowerUsername },
          { email: lowerEmail }
        ]
      }
    });

    if (existingUser) {
      if (existingUser.username === lowerUsername) {
        return NextResponse.json(
          { error: "Username này đã được sử dụng." },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: "Email này đã được đăng ký." },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await db.user.create({
      data: {
        username: lowerUsername,
        email: lowerEmail,
        password: hashedPassword,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Đăng ký tài khoản thành công.",
      userId: user.id,
    });
  } catch (error: any) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Đã xảy ra lỗi trong quá trình đăng ký." },
      { status: 500 }
    );
  }
}
