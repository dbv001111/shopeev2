"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  Bell,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  Loader2,
  Calendar,
  DollarSign,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { subscribeUserToPush } from "@/lib/swRegister";

interface HistoryItem {
  id: string;
  price: number;
  recorded_at: string;
}

interface SerializedProduct {
  id: string;
  itemid: string;
  shopid: string;
  name: string;
  image: string;
  original_url: string;
  current_price: number;
  created_at: string;
  updated_at: string;
  price_history: HistoryItem[];
}

interface ProductDetailClientProps {
  product: SerializedProduct;
}

export default function ProductDetailClient({ product }: ProductDetailClientProps) {
  const [targetPrice, setTargetPrice] = useState<string>("");
  const [submittingAlert, setSubmittingAlert] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [chartMounted, setChartMounted] = useState(false);

  const [currentUser, setCurrentUser] = useState<{ id: string; email: string } | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Set chart mounted after initial render to avoid SSR hydration mismatches in Recharts
  useEffect(() => {
    setChartMounted(true);
    // Suggest target price default at 10% below current price
    const suggestedTarget = Math.round(product.current_price * 0.9);
    setTargetPrice(String(suggestedTarget));
    fetchUser();
  }, [product.current_price]);

  const fetchUser = async () => {
    try {
      const res = await fetch("/api/auth/me");
      const result = await res.json();
      if (res.ok && result.authenticated) {
        setCurrentUser(result.user);
      } else {
        setCurrentUser(null);
      }
    } catch (err) {
      setCurrentUser(null);
    } finally {
      setLoadingUser(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setCurrentUser(null);
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const handleRegisterAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetPrice) return;

    setSubmittingAlert(true);
    setError(null);
    setSuccessMsg(null);

    try {
      // 1. Request notifications and obtain push subscription details
      const subscription = await subscribeUserToPush();
      if (!subscription) {
        throw new Error(
          "Quyền thông báo bị từ chối hoặc trình duyệt không hỗ trợ Web Push."
        );
      }

      // 2. Submit payload to register alert (using track route)
      const res = await fetch("/api/products/track", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: product.original_url,
          itemid: product.itemid,
          shopid: product.shopid,
          name: product.name,
          image: product.image,
          current_price: product.current_price,
          target_price: parseFloat(targetPrice),
          subscription: subscription,
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Lỗi đăng ký chuông báo giá.");
      }

      setSuccessMsg("Chuông báo giá đã được bật thành công!");
    } catch (err: any) {
      setError(err.message || "Không thể kích hoạt thông báo.");
    } finally {
      setSubmittingAlert(false);
    }
  };

  const formatVND = (value: number) => {
    return value.toLocaleString("vi-VN") + "₫";
  };

  // Format historical price logs for charting
  const chartData = product.price_history.map((item) => ({
    price: item.price,
    date: new Date(item.recorded_at).toLocaleDateString("vi-VN", {
      month: "short",
      day: "numeric",
    }),
    fullDate: new Date(item.recorded_at).toLocaleString("vi-VN"),
  }));

  // Helper stats calculation
  const prices = product.price_history.map((h) => h.price);
  const minPrice = prices.length ? Math.min(...prices) : product.current_price;
  const maxPrice = prices.length ? Math.max(...prices) : product.current_price;
  const startPrice = prices.length ? prices[0] : product.current_price;
  const priceFluctuation = product.current_price - startPrice;
  const fluctuationPercentage = startPrice ? (priceFluctuation / startPrice) * 100 : 0;

  // Custom Recharts Tooltip Component
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl shadow-2xl text-xs space-y-1">
          <p className="text-slate-500 font-medium">{payload[0].payload.fullDate}</p>
          <p className="text-indigo-400 font-bold text-sm">
            {formatVND(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex-1 bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30 min-h-screen">
      {/* Dynamic background glow */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-indigo-950/20 via-transparent to-transparent pointer-events-none -z-10" />

      {/* Nav Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center space-x-2 text-slate-400 hover:text-white transition-colors text-sm font-medium animate-fade-in"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại Dashboard</span>
          </Link>
          <div className="flex items-center space-x-4">
            {loadingUser ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
            ) : currentUser ? (
              <div className="flex items-center space-x-3">
                <span className="text-xs text-slate-400 font-medium hidden md:inline">
                  {currentUser.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg text-xs font-semibold border border-slate-800 transition-colors cursor-pointer"
                >
                  Đăng xuất
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  href="/login"
                  className="px-3.5 py-1.5 text-slate-400 hover:text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  Đăng nhập
                </Link>
                <Link
                  href="/register"
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all"
                >
                  Đăng ký
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Layout Grid */}
      <main className="max-w-6xl mx-auto px-4 py-10 space-y-10">
        {/* Info Layout */}
        <section className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Left Column: Image */}
          <div className="md:col-span-4 bg-slate-900/30 backdrop-blur-sm border border-slate-900 rounded-2xl p-6 flex items-center justify-center aspect-square">
            <div className="relative max-w-full max-h-full p-2 bg-slate-950 rounded-xl border border-slate-900 flex items-center justify-center">
              <img
                src={product.image}
                alt={product.name}
                className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
              />
            </div>
          </div>

          {/* Right Column: Descriptions & Controls */}
          <div className="md:col-span-8 space-y-6">
            <div className="space-y-4">
              <h1 className="text-xl md:text-2xl font-bold text-slate-100 leading-snug">
                {product.name}
              </h1>

              <div className="flex flex-wrap gap-4 items-center">
                {/* Current Price Badge */}
                <div className="bg-indigo-950/40 border border-indigo-900/50 rounded-xl px-4 py-2.5 flex flex-col justify-center">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">
                    Giá hiện tại
                  </span>
                  <span className="text-xl font-extrabold text-indigo-400 tracking-tight">
                    {formatVND(product.current_price)}
                  </span>
                </div>

                {/* Price Fluctuation direction */}
                <div className="bg-slate-900/40 border border-slate-900 rounded-xl px-4 py-2.5 flex flex-col justify-center">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">
                    Biến động (so với ban đầu)
                  </span>
                  <span
                    className={`text-sm font-bold flex items-center mt-1 ${
                      priceFluctuation < 0
                        ? "text-emerald-400"
                        : priceFluctuation > 0
                        ? "text-rose-400"
                        : "text-slate-400"
                    }`}
                  >
                    {priceFluctuation < 0 ? (
                      <TrendingDown className="w-4 h-4 mr-1 shrink-0" />
                    ) : priceFluctuation > 0 ? (
                      <TrendingUp className="w-4 h-4 mr-1 shrink-0" />
                    ) : null}
                    {priceFluctuation === 0
                      ? "Không đổi"
                      : `${formatVND(priceFluctuation)} (${
                          fluctuationPercentage < 0 ? "" : "+"
                        }${fluctuationPercentage.toFixed(1)}%)`}
                  </span>
                </div>
              </div>
            </div>

            {/* Price Alert Form Box */}
            <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800/80 rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="flex items-center space-x-2">
                <Bell className="w-5 h-5 text-indigo-500" />
                <h3 className="font-bold text-slate-200">Cài Đặt Nhận Báo Giảm Giá</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Nhập mức giá mong muốn của bạn. Khi hệ thống quét giá Shopee hàng giờ phát hiện giá giảm xuống dưới mức đặt, một thông báo đẩy native sẽ được phát trực tiếp tới trình duyệt này.
              </p>

              <form onSubmit={handleRegisterAlert} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end pt-2">
                <div className="sm:col-span-8">
                  <input
                    type="number"
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="Mức giá báo động (VND)"
                    min="1"
                    required
                  />
                </div>
                <div className="sm:col-span-4">
                  <button
                    type="submit"
                    disabled={submittingAlert || !targetPrice}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-sm rounded-lg flex items-center justify-center cursor-pointer shadow-lg shadow-indigo-600/20"
                  >
                    {submittingAlert ? (
                      <Loader2 className="w-4.5 h-4.5 animate-spin" />
                    ) : currentUser ? (
                      "Bật Báo Giá"
                    ) : (
                      "Bật Báo (Tư cách Khách)"
                    )}
                  </button>
                </div>
              </form>

              {!currentUser && (
                <p className="text-[10px] text-indigo-400">
                  💡 Bạn đang thao tác với tư cách khách. Hãy đăng nhập trước khi bật báo giá để liên kết và lưu sản phẩm này vào tài khoản của bạn.
                </p>
              )}

              {error && (
                <div className="flex items-center space-x-2 p-3 bg-red-950/40 border border-red-900/50 rounded-lg text-red-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {successMsg && (
                <div className="flex items-center space-x-2 p-3 bg-emerald-950/40 border border-emerald-900/50 rounded-lg text-emerald-300 text-xs font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping mr-1" />
                  <span>{successMsg}</span>
                </div>
              )}
            </div>

            {/* Links and Redirect Options */}
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={product.original_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3 px-4 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl font-medium text-sm flex items-center justify-center border border-slate-800 transition-colors"
              >
                <span>Xem Gốc Trên Shopee</span>
                <ExternalLink className="w-4 h-4 ml-2" />
              </a>

              <a
                href={`/api/redirect/${product.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold text-sm flex items-center justify-center shadow-xl shadow-indigo-600/20 hover:scale-[1.01] active:scale-[0.99] transition-all"
              >
                <span>Mua Ngay (Affiliate Link)</span>
                <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
              </a>
            </div>
          </div>
        </section>

        {/* Price History Visualization Chart */}
        <section className="bg-slate-900/20 border border-slate-900 rounded-2xl p-6 md:p-8 space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg md:text-xl font-bold text-slate-200">Lịch Sử Biến Động Giá</h2>
            <p className="text-xs text-slate-500">
              Lịch sử các lần quét đổi giá. Giá trị đo bằng VNĐ.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-2">
            <div className="bg-slate-950/40 border border-slate-900 p-3.5 rounded-xl">
              <span className="block text-[10px] text-slate-500 uppercase font-semibold">Thấp Nhất</span>
              <span className="text-base font-bold text-emerald-400 mt-0.5 block">{formatVND(minPrice)}</span>
            </div>
            <div className="bg-slate-950/40 border border-slate-900 p-3.5 rounded-xl">
              <span className="block text-[10px] text-slate-500 uppercase font-semibold">Cao Nhất</span>
              <span className="text-base font-bold text-rose-400 mt-0.5 block">{formatVND(maxPrice)}</span>
            </div>
            <div className="bg-slate-950/40 border border-slate-900 p-3.5 rounded-xl">
              <span className="block text-[10px] text-slate-500 uppercase font-semibold">Số lần cập nhật</span>
              <span className="text-base font-bold text-indigo-400 mt-0.5 block">{product.price_history.length}</span>
            </div>
            <div className="bg-slate-950/40 border border-slate-900 p-3.5 rounded-xl">
              <span className="block text-[10px] text-slate-500 uppercase font-semibold">Ngày bắt đầu theo dõi</span>
              <span className="text-xs font-semibold text-slate-400 mt-2.5 block flex items-center">
                <Calendar className="w-3.5 h-3.5 mr-1 text-indigo-500" />
                {new Date(product.price_history[0]?.recorded_at || product.created_at).toLocaleDateString("vi-VN")}
              </span>
            </div>
          </div>

          {/* Line Chart Grid */}
          <div className="h-72 w-full pt-4">
            {chartMounted && chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
                  <XAxis
                    dataKey="date"
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${(value / 1000).toLocaleString("vi-VN")}k`}
                    domain={["auto", "auto"]}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="#6366f1"
                    strokeWidth={3}
                    dot={{ r: 3, strokeWidth: 0, fill: "#818cf8" }}
                    activeDot={{ r: 6, strokeWidth: 0, fill: "#6366f1" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-slate-600 bg-slate-950/10 border border-slate-950 rounded-xl">
                <span>Đang tải biểu đồ dữ liệu...</span>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
