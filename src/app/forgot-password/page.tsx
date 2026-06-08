"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Loader2, TrendingDown, AlertCircle, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email.trim()) {
      setError("Vui lòng nhập địa chỉ email.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Có lỗi xảy ra khi yêu cầu đặt lại mật khẩu.");
      }

      setSuccess(
        "Yêu cầu thành công! Hướng dẫn đặt lại mật khẩu đã được gửi (Vui lòng kiểm tra terminal console logs để lấy link reset)."
      );
    } catch (err: any) {
      setError(err.message || "Lỗi kết nối máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-indigo-950/20 via-transparent to-transparent pointer-events-none -z-10" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-4">
        <Link href="/" className="inline-flex items-center space-x-2">
          <span className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <TrendingDown className="w-5 h-5 text-white" />
          </span>
          <span className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Shopee Radar
          </span>
        </Link>
        <h2 className="text-3xl font-extrabold tracking-tight">Khôi phục mật khẩu</h2>
        <p className="text-sm text-slate-400">
          Nhập địa chỉ email của bạn để bắt đầu quy trình khôi phục
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900/40 backdrop-blur-xl py-8 px-4 border border-slate-800/80 shadow-2xl rounded-2xl sm:px-10">
          {!success ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Địa chỉ Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@domain.com"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-200 text-sm transition-all"
                />
              </div>

              {error && (
                <div className="flex items-start space-x-2.5 p-4 bg-red-950/40 border border-red-900/50 rounded-xl text-red-300 text-xs">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center cursor-pointer shadow-xl shadow-indigo-600/20 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "Gửi yêu cầu đặt lại"
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6 text-center py-4">
              <div className="flex justify-center">
                <span className="w-12 h-12 rounded-full bg-emerald-950/40 border border-emerald-900/50 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                </span>
              </div>
              <h3 className="font-bold text-lg text-slate-200">Kiểm tra thông báo</h3>
              <p className="text-sm text-slate-400 leading-relaxed px-2">
                {success}
              </p>
              <div className="pt-2">
                <Link
                  href="/login"
                  className="inline-flex justify-center text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Quay lại đăng nhập
                </Link>
              </div>
            </div>
          )}

          {!success && (
            <div className="mt-6 pt-6 border-t border-slate-800/60 text-center">
              <span className="text-xs text-slate-400">
                Nhớ mật khẩu?{" "}
                <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
                  Quay lại đăng nhập
                </Link>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
