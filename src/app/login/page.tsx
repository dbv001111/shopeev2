"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, TrendingDown, AlertCircle, Eye, EyeOff, ShieldAlert } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setRateLimited(false);

    if (!username.trim() || !password) {
      setError("Vui lòng nhập đầy đủ tên tài khoản và mật khẩu.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password, rememberMe }),
      });

      const data = await res.json();

      if (res.status === 429) {
        setRateLimited(true);
        return;
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Tài khoản hoặc mật khẩu không chính xác.");
      }

      setSuccess("Đăng nhập thành công! Đang chuyển hướng...");
      setTimeout(() => {
        router.push("/");
        router.refresh();
      }, 1000);
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
        <h2 className="text-3xl font-extrabold tracking-tight">Chào mừng quay trở lại</h2>
        <p className="text-sm text-slate-400">
          Đăng nhập bằng tên tài khoản để tiếp tục theo dõi sản phẩm
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
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-[#EE4D2D] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#EE4D2D] text-slate-200 text-sm pr-12 transition-all"
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

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 bg-slate-950 border-slate-700 rounded cursor-pointer accent-[#EE4D2D]"
                />
                <label htmlFor="remember-me" className="ml-2 block text-xs text-slate-300 cursor-pointer">
                  Ghi nhớ đăng nhập (30 ngày)
                </label>
              </div>
              <div className="text-xs">
                <Link href="/forgot-password" className="font-semibold text-[#EE4D2D] hover:text-[#d84022] transition-colors">
                  Quên thông tin?
                </Link>
              </div>
            </div>

            {rateLimited && (
              <div className="flex items-start space-x-2.5 p-4 bg-orange-950/40 border border-orange-800/50 rounded-xl text-orange-300 text-xs">
                <ShieldAlert className="w-5 h-5 shrink-0" />
                <p>Tài khoản tạm bị khóa do nhập sai nhiều lần. Vui lòng thử lại sau 15 phút.</p>
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
                disabled={loading || rateLimited}
                className="w-full py-3 px-4 bg-[#EE4D2D] hover:bg-[#d84022] text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center cursor-pointer shadow-xl shadow-[#EE4D2D]/20 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Đăng nhập"
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-800/60 text-center">
            <span className="text-xs text-slate-400">
              Chưa có tài khoản?{" "}
              <Link href="/register" className="text-[#EE4D2D] hover:text-[#d84022] font-semibold transition-colors">
                Đăng ký ngay
              </Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
