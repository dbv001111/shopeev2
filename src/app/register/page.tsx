"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, TrendingDown, AlertCircle, Eye, EyeOff } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setError(null);
    setSuccess(null);

    // Client-side validations
    if (!username.trim() || !email.trim() || !password || !confirmPassword) {
      setValidationError("Vui lòng điền đầy đủ các trường thông tin.");
      return;
    }

    const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
    if (!usernameRegex.test(username.trim())) {
      setValidationError("Username chỉ được chứa chữ cái, số, dấu gạch dưới, gạch ngang và dài 3-20 ký tự.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setValidationError("Định dạng email khôi phục không hợp lệ.");
      return;
    }

    if (password.length < 6) {
      setValidationError("Mật khẩu phải chứa ít nhất 6 ký tự.");
      return;
    }

    if (password !== confirmPassword) {
      setValidationError("Xác nhận mật khẩu không khớp.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          username: username.trim(), 
          email: email.trim(), 
          password 
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Có lỗi xảy ra trong quá trình đăng ký.");
      }

      setSuccess("Đăng ký tài khoản thành công! Đang chuyển hướng đến trang đăng nhập...");
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Lỗi kết nối máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Background decoration with Shopee Orange tint */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-[#EE4D2D]/5 via-transparent to-transparent pointer-events-none -z-10" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#EE4D2D]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#EE4D2D]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-4">
        <Link href="/" className="inline-flex items-center space-x-2">
          <span className="w-10 h-10 rounded-xl bg-[#EE4D2D] flex items-center justify-center shadow-lg shadow-[#EE4D2D]/30">
            <TrendingDown className="w-5 h-5 text-white" />
          </span>
          <span className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            shopeev2
          </span>
        </Link>
        <h2 className="text-3xl font-extrabold tracking-tight">Tạo tài khoản mới</h2>
        <p className="text-sm text-slate-400">
          Đăng ký bằng username để theo dõi biến động giá và nhận thông báo tức thì
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900/40 backdrop-blur-xl py-8 px-4 border border-slate-800/80 shadow-2xl rounded-2xl sm:px-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Tên tài khoản (Username)
              </label>
              <input
                id="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="User_123"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-[#EE4D2D] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#EE4D2D] text-slate-200 text-sm transition-all"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Email khôi phục (Email)
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@domain.com"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-[#EE4D2D] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#EE4D2D] text-slate-200 text-sm transition-all"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Mật khẩu
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-[#EE4D2D] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#EE4D2D] text-slate-200 text-sm transition-all pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Xác nhận mật khẩu
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-[#EE4D2D] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#EE4D2D] text-slate-200 text-sm transition-all"
              />
            </div>

            {validationError && (
              <div className="flex items-start space-x-2.5 p-4 bg-red-950/40 border border-red-900/50 rounded-xl text-red-300 text-xs">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>{validationError}</p>
              </div>
            )}

            {error && (
              <div className="flex items-start space-x-2.5 p-4 bg-red-950/40 border border-red-900/50 rounded-xl text-red-300 text-xs">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {success && (
              <div className="p-4 bg-emerald-950/40 border border-emerald-900/50 rounded-xl text-emerald-300 text-xs font-medium flex items-center">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2.5 animate-ping" />
                {success}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-[#EE4D2D] hover:bg-[#d84022] text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center cursor-pointer shadow-xl shadow-[#EE4D2D]/20 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Đăng ký"
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-800/60 text-center">
            <span className="text-xs text-slate-400">
              Đã có tài khoản?{" "}
              <Link href="/login" className="text-[#EE4D2D] hover:text-[#d84022] font-semibold transition-colors">
                Đăng nhập ngay
              </Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
