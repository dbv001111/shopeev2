"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Loader2, TrendingDown, AlertCircle, CheckCircle2, User, KeyRound, HelpCircle, ShieldAlert } from "lucide-react";

type RecoveryMode = "forgot-username" | "forgot-password" | "forgot-both";

interface TabProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function Tab({ active, onClick, icon, label }: TabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 flex flex-col items-center gap-1.5 py-3 px-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
        active
          ? "bg-[#EE4D2D] text-white shadow-lg shadow-[#EE4D2D]/20"
          : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/60"
      }`}
    >
      {icon}
      <span className="leading-tight text-center">{label}</span>
    </button>
  );
}

export default function ForgotPasswordPage() {
  const [mode, setMode] = useState<RecoveryMode>("forgot-username");

  // Forgot Username state
  const [fuEmail, setFuEmail] = useState("");

  // Forgot Password state
  const [fpUsername, setFpUsername] = useState("");
  const [fpEmail, setFpEmail] = useState("");

  // Forgot Both state
  const [fbEmail, setFbEmail] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const resetState = () => {
    setError(null);
    setSuccess(null);
    setRateLimited(false);
  };

  const handleModeChange = (newMode: RecoveryMode) => {
    setMode(newMode);
    resetState();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetState();

    let payload: Record<string, string> = { action: mode };

    if (mode === "forgot-username") {
      if (!fuEmail.trim()) { setError("Vui lòng nhập email."); return; }
      payload.email = fuEmail.trim();
    } else if (mode === "forgot-password") {
      if (!fpUsername.trim() || !fpEmail.trim()) { setError("Vui lòng nhập đầy đủ username và email."); return; }
      payload.username = fpUsername.trim();
      payload.email = fpEmail.trim();
    } else if (mode === "forgot-both") {
      if (!fbEmail.trim()) { setError("Vui lòng nhập email."); return; }
      payload.email = fbEmail.trim();
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.status === 429) {
        setRateLimited(true);
        return;
      }
      if (!res.ok || !data.success) throw new Error(data.error || "Có lỗi xảy ra.");

      const messages: Record<RecoveryMode, string> = {
        "forgot-username": "Yêu cầu thành công! Nếu email tồn tại, tên tài khoản đã được gửi vào console logs.",
        "forgot-password": "Yêu cầu thành công! Nếu thông tin khớp, link đặt lại mật khẩu đã được ghi vào console logs.",
        "forgot-both": "Yêu cầu thành công! Nếu email tồn tại, toàn bộ thông tin khôi phục đã được ghi vào console logs.",
      };
      setSuccess(messages[mode]);
    } catch (err: any) {
      setError(err.message || "Lỗi kết nối máy chủ.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
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
        <h2 className="text-3xl font-extrabold tracking-tight">Trung tâm khôi phục</h2>
        <p className="text-sm text-slate-400">
          Chọn phương thức khôi phục phù hợp với tình huống của bạn
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900/40 backdrop-blur-xl py-8 px-4 border border-slate-800/80 shadow-2xl rounded-2xl sm:px-10 space-y-6">

          {/* Recovery Mode Tabs */}
          <div className="flex gap-2 p-1.5 bg-slate-950/60 rounded-2xl border border-slate-800/60">
            <Tab
              active={mode === "forgot-username"}
              onClick={() => handleModeChange("forgot-username")}
              icon={<User className="w-4 h-4" />}
              label="Quên Username"
            />
            <Tab
              active={mode === "forgot-password"}
              onClick={() => handleModeChange("forgot-password")}
              icon={<KeyRound className="w-4 h-4" />}
              label="Quên Mật Khẩu"
            />
            <Tab
              active={mode === "forgot-both"}
              onClick={() => handleModeChange("forgot-both")}
              icon={<HelpCircle className="w-4 h-4" />}
              label="Quên Cả Hai"
            />
          </div>

          {/* Mode Description */}
          <div className="bg-slate-950/40 border border-slate-800/50 rounded-xl p-3.5 text-xs text-slate-400 leading-relaxed">
            {mode === "forgot-username" && (
              <><span className="text-[#EE4D2D] font-semibold">Quên Username:</span> Nhập email đã đăng ký — hệ thống sẽ tra cứu tên tài khoản liên kết.</>
            )}
            {mode === "forgot-password" && (
              <><span className="text-[#EE4D2D] font-semibold">Quên Mật Khẩu:</span> Nhập đúng cả username lẫn email — hệ thống sẽ tạo link đặt lại mật khẩu.</>
            )}
            {mode === "forgot-both" && (
              <><span className="text-[#EE4D2D] font-semibold">Quên Cả Hai:</span> Nhập email — hệ thống sẽ gửi toàn bộ thông tin khôi phục kèm link reset mật khẩu.</>
            )}
          </div>

          {!success ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Forgot Username: Email only */}
              {mode === "forgot-username" && (
                <div>
                  <label htmlFor="fu-email" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Email đã đăng ký
                  </label>
                  <input
                    id="fu-email"
                    type="email"
                    required
                    value={fuEmail}
                    onChange={(e) => setFuEmail(e.target.value)}
                    placeholder="example@domain.com"
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-[#EE4D2D] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#EE4D2D] text-slate-200 text-sm transition-all"
                  />
                </div>
              )}

              {/* Forgot Password: Username + Email */}
              {mode === "forgot-password" && (
                <>
                  <div>
                    <label htmlFor="fp-username" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Tên tài khoản (Username)
                    </label>
                    <input
                      id="fp-username"
                      type="text"
                      required
                      value={fpUsername}
                      onChange={(e) => setFpUsername(e.target.value)}
                      placeholder="User_123"
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-[#EE4D2D] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#EE4D2D] text-slate-200 text-sm transition-all"
                    />
                  </div>
                  <div>
                    <label htmlFor="fp-email" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Email đã đăng ký
                    </label>
                    <input
                      id="fp-email"
                      type="email"
                      required
                      value={fpEmail}
                      onChange={(e) => setFpEmail(e.target.value)}
                      placeholder="example@domain.com"
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-[#EE4D2D] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#EE4D2D] text-slate-200 text-sm transition-all"
                    />
                  </div>
                </>
              )}

              {/* Forgot Both: Email only */}
              {mode === "forgot-both" && (
                <div>
                  <label htmlFor="fb-email" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Email đã đăng ký
                  </label>
                  <input
                    id="fb-email"
                    type="email"
                    required
                    value={fbEmail}
                    onChange={(e) => setFbEmail(e.target.value)}
                    placeholder="example@domain.com"
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-[#EE4D2D] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#EE4D2D] text-slate-200 text-sm transition-all"
                  />
                </div>
              )}

              {rateLimited && (
                <div className="flex items-start space-x-2.5 p-4 bg-orange-950/40 border border-orange-800/50 rounded-xl text-orange-300 text-xs">
                  <ShieldAlert className="w-5 h-5 shrink-0" />
                  <p>Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau 15 phút.</p>
                </div>
              )}

              {error && (
                <div className="flex items-start space-x-2.5 p-4 bg-red-950/40 border border-red-900/50 rounded-xl text-red-300 text-xs">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || rateLimited}
                className="w-full py-3 px-4 bg-[#EE4D2D] hover:bg-[#d84022] text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center cursor-pointer shadow-xl shadow-[#EE4D2D]/20 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Gửi yêu cầu khôi phục"}
              </button>
            </form>
          ) : (
            <div className="space-y-5 text-center py-2">
              <div className="flex justify-center">
                <span className="w-14 h-14 rounded-full bg-emerald-950/40 border border-emerald-900/50 flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                </span>
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-lg text-slate-200">Yêu cầu đã được ghi nhận</h3>
                <p className="text-xs text-slate-400 leading-relaxed px-2">{success}</p>
              </div>
              <button
                onClick={() => { setSuccess(null); resetState(); }}
                className="text-xs font-semibold text-[#EE4D2D] hover:text-[#d84022] transition-colors"
              >
                Gửi yêu cầu khác
              </button>
            </div>
          )}

          <div className="pt-4 border-t border-slate-800/60 text-center">
            <span className="text-xs text-slate-400">
              Nhớ thông tin?{" "}
              <Link href="/login" className="text-[#EE4D2D] hover:text-[#d84022] font-semibold transition-colors">
                Quay lại đăng nhập
              </Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
