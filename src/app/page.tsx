"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Sparkles,
  Bell,
  ArrowRight,
  Loader2,
  ExternalLink,
  AlertCircle,
  TrendingDown,
  LineChart as ChartIcon,
} from "lucide-react";
import { subscribeUserToPush } from "@/lib/swRegister";

interface TrackedProduct {
  id: string;
  itemid: string;
  shopid: string;
  name: string;
  image: string;
  current_price: number;
  original_url: string;
  updated_at: string;
}

interface ExtractedProduct {
  itemid: string;
  shopid: string;
  name: string;
  image: string;
  current_price: number;
  original_url: string;
}

export default function HomePage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<ExtractedProduct | null>(null);

  // Price tracking subscription states
  const [targetPrice, setTargetPrice] = useState<string>("");
  const [submittingTrack, setSubmittingTrack] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Recently tracked products list
  const [products, setProducts] = useState<TrackedProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // User session state
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string; username?: string } | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    const initialize = async () => {
      await fetchUser();
    };
    initialize();

    // Register service worker on initial load
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("Service worker registered automatically on home page:", reg.scope);
        })
        .catch((err) => {
          console.warn("Failed to auto-register service worker on load:", err);
        });
    }
  }, []);

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
      // Fetch products list after user verification settles
      fetchRecentlyTracked();
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setCurrentUser(null);
      fetchRecentlyTracked();
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const fetchRecentlyTracked = async () => {
    try {
      const res = await fetch("/api/products");
      const result = await res.json();
      if (result.success) {
        setProducts(result.data);
      }
    } catch (err) {
      console.error("Failed to fetch recently tracked products:", err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleExtract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setExtracted(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/products/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || "Failed to extract product details from Shopee.");
      }

      setExtracted(result.data);
      // Auto default target price to 10% lower than current price
      const discountPrice = Math.round(result.data.current_price * 0.9);
      setTargetPrice(String(discountPrice));
    } catch (err: any) {
      setError(err.message || "An error occurred while analyzing the product URL.");
    } finally {
      setLoading(false);
    }
  };

  const handleTrackAndSubscribe = async () => {
    if (!extracted || !targetPrice) return;

    setSubmittingTrack(true);
    setError(null);
    setSuccessMsg(null);

    try {
      // 1. Prompt browser permission and fetch Web Push subscription object
      const subscription = await subscribeUserToPush();
      if (!subscription) {
        throw new Error(
          "Permission for notifications was denied or not supported in this browser."
        );
      }

      // 2. Submit the tracked product details to the database and bind subscription
      const res = await fetch("/api/products/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: extracted.original_url,
          itemid: extracted.itemid,
          shopid: extracted.shopid,
          name: extracted.name,
          image: extracted.image,
          current_price: extracted.current_price,
          target_price: parseFloat(targetPrice),
          subscription: subscription,
        }),
      });

      const trackResult = await res.json();
      if (!res.ok || !trackResult.success) {
        throw new Error(trackResult.error || "Failed to track product and subscribe.");
      }

      setSuccessMsg("Chuông báo giá đã được kích hoạt thành công!");
      
      // 3. Redirect to the newly created details page after brief timeout
      setTimeout(() => {
        router.push(`/product/${trackResult.product.id}`);
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to subscribe to price alert.");
    } finally {
      setSubmittingTrack(false);
    }
  };

  const formatVND = (value: number) => {
    return value.toLocaleString("vi-VN") + "₫";
  };

  return (
    <div className="flex-1 bg-slate-950 text-slate-100 font-sans selection:bg-[#EE4D2D]/20">
      {/* Dynamic background glow */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-[#EE4D2D]/5 via-transparent to-transparent pointer-events-none -z-10" />

      {/* Navigation Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-8 h-8 rounded-lg bg-[#EE4D2D] flex items-center justify-center shadow-lg shadow-[#EE4D2D]/30">
              <TrendingDown className="w-4 h-4 text-white" />
            </span>
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              shopeev2
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <span className="hidden sm:inline-flex items-center text-xs font-medium text-[#EE4D2D] bg-[#EE4D2D]/10 px-2.5 py-1 rounded-full border border-[#EE4D2D]/30">
              <Bell className="w-3.5 h-3.5 mr-1 animate-pulse" />
              Browser Push Active
            </span>

            {loadingUser ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
            ) : currentUser ? (
              <div className="flex items-center space-x-3">
                <span className="text-xs text-slate-400 font-medium hidden md:inline">
                  @{currentUser.username || currentUser.email}
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
                  className="px-3.5 py-1.5 bg-[#EE4D2D] hover:bg-[#d84022] text-white rounded-lg text-xs font-semibold shadow-lg shadow-[#EE4D2D]/20 transition-all"
                >
                  Đăng ký
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 py-12 space-y-16">
        {/* Hero Section */}
        <section className="text-center max-w-2xl mx-auto space-y-6">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
            <span className="text-white">shopeev2</span> — Theo Dõi Giá <br />
            <span className="bg-gradient-to-r from-[#EE4D2D] via-orange-400 to-[#EE4D2D] bg-clip-text text-transparent">
              Nhận Thông Báo Tức Thì
            </span>
          </h1>
          <p className="text-slate-400 text-sm md:text-base">
            Dán liên kết sản phẩm Shopee bất kỳ để bắt đầu theo dõi biến động giá. 
            Nhận thông báo đẩy trực tiếp trên điện thoại và máy tính khi giá giảm xuống mức mong muốn.
          </p>
        </section>

        {/* Input Bar Section */}
        <section className="max-w-3xl mx-auto">
          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 md:p-8 shadow-2xl shadow-slate-950/50">
            <form onSubmit={handleExtract} className="space-y-4">
              <div className="relative flex items-center">
                <Search className="absolute left-4 w-5 h-5 text-slate-500" />
                <input
                  type="url"
                  placeholder="https://shopee.vn/product/shopid/itemid hoặc https://shope.ee/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full pl-12 pr-32 py-4 bg-slate-950 border border-slate-800 focus:border-[#EE4D2D] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#EE4D2D] text-slate-200 text-sm transition-all placeholder:text-slate-600"
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="absolute right-2 px-6 py-2.5 bg-[#EE4D2D] hover:bg-[#d84022] disabled:bg-slate-800 text-white font-medium text-sm rounded-lg transition-all flex items-center justify-center cursor-pointer shadow-lg shadow-[#EE4D2D]/20"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  Phân Tích
                </button>
              </div>
            </form>

            {/* Error alerts */}
            {error && (
              <div className="mt-6 flex items-start space-x-2.5 p-4 bg-red-950/40 border border-red-900/50 rounded-xl text-red-300 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {/* Loading state messages */}
            {loading && (
              <div className="mt-6 text-center text-slate-500 text-xs flex items-center justify-center space-x-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#EE4D2D]" />
                <span>Đang trích xuất dữ liệu, vượt hệ thống chặn cào Shopee...</span>
              </div>
            )}

            {/* Extraction Preview Overlay Card */}
            {extracted && (
              <div className="mt-8 pt-8 border-t border-slate-800/60 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                <div className="md:col-span-3 flex justify-center">
                  <div className="relative w-32 h-32 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 p-1 flex items-center justify-center">
                    <img
                      src={extracted.image}
                      alt={extracted.name}
                      className="max-w-full max-h-full object-contain rounded-lg"
                    />
                  </div>
                </div>
                <div className="md:col-span-9 space-y-4">
                  <div>
                    <h3 className="font-semibold text-slate-200 line-clamp-2 text-sm md:text-base leading-snug">
                      {extracted.name}
                    </h3>
                    <p className="text-[#EE4D2D] font-bold text-lg mt-1">
                      {formatVND(extracted.current_price)}
                    </p>
                  </div>

                  {/* Alert setup input box */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                    <div className="sm:col-span-7">
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        Giá mục tiêu nhận thông báo (VND)
                      </label>
                      <input
                        type="number"
                        placeholder="Nhập giá mục tiêu"
                        value={targetPrice}
                        onChange={(e) => setTargetPrice(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 focus:border-[#EE4D2D] rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-[#EE4D2D]"
                        min="1"
                      />
                    </div>
                    <div className="sm:col-span-5">
                      <button
                        onClick={handleTrackAndSubscribe}
                        disabled={submittingTrack || !targetPrice}
                        className="w-full px-5 py-2.5 bg-[#EE4D2D] hover:bg-[#d84022] text-white font-medium text-sm rounded-lg flex items-center justify-center cursor-pointer shadow-xl shadow-[#EE4D2D]/20 disabled:opacity-50"
                      >
                        {submittingTrack ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Bell className="w-4 h-4 mr-2" />
                            {currentUser ? "Kích Hoạt Theo Dõi" : "Theo Dõi (Tư cách Khách)"}
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {!currentUser && (
                    <p className="text-[10px] text-[#EE4D2D]">
                      💡 Bạn đang thao tác với tư cách khách. Hãy đăng nhập trước khi kích hoạt để liên kết và lưu sản phẩm này vào tài khoản của bạn.
                    </p>
                  )}

                  {successMsg && (
                    <div className="p-3 bg-emerald-950/40 border border-emerald-900/50 rounded-lg text-emerald-300 text-xs font-medium animate-fade-in flex items-center">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-ping" />
                      {successMsg}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Recently Tracked Dashboard Grid */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight flex items-center">
              <ChartIcon className="w-5 h-5 text-[#EE4D2D] mr-2" />
              Sản Phẩm Đang Theo Dõi Gần Đây
            </h2>
            <span className="text-xs text-slate-500 font-mono">
              Tổng số: {products.length}
            </span>
          </div>

          {loadingProducts ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="bg-slate-900/20 border border-slate-900 rounded-xl p-4 h-64 animate-pulse space-y-4"
                >
                  <div className="w-full h-32 bg-slate-900 rounded-lg" />
                  <div className="h-4 bg-slate-900 rounded w-3/4" />
                  <div className="h-4 bg-slate-900 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center border border-dashed border-slate-900 rounded-2xl py-16 bg-slate-900/10">
              <p className="text-slate-500 text-sm">Chưa có sản phẩm nào được thiết lập theo dõi.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
              {products.map((prod) => (
                <div
                  key={prod.id}
                  className="bg-slate-900/20 hover:bg-slate-900/40 border border-slate-900 hover:border-[#EE4D2D]/20 rounded-2xl p-4 flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:shadow-[#EE4D2D]/5 group"
                >
                  <div className="space-y-3">
                    <div className="w-full aspect-square rounded-xl overflow-hidden bg-slate-950 p-2 border border-slate-900/50 flex items-center justify-center relative">
                      <img
                        src={prod.image}
                        alt={prod.name}
                        className="max-w-full max-h-full object-contain rounded-lg group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-200 line-clamp-2 text-xs md:text-sm leading-snug group-hover:text-[#EE4D2D] transition-colors">
                        {prod.name}
                      </h3>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-900/80 space-y-3">
                    <div className="flex justify-between items-baseline">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Giá Hiện Tại</span>
                      <span className="text-[#EE4D2D] font-bold text-sm md:text-base">
                        {formatVND(prod.current_price)}
                      </span>
                    </div>

                    <Link
                      href={`/product/${prod.id}`}
                      className="w-full py-2 bg-slate-900 group-hover:bg-[#EE4D2D]/10 text-slate-300 group-hover:text-[#EE4D2D] font-medium text-xs rounded-lg transition-all flex items-center justify-center"
                    >
                      Xem Lịch Sử
                      <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 mt-20 py-8 text-center text-xs text-slate-600">
        <p>© 2026 <span className="text-[#EE4D2D] font-semibold">shopeev2</span>. Tất cả các quyền được bảo lưu.</p>
        <p className="mt-2 text-slate-700">Powered by Next.js · Turso · Web Push</p>
      </footer>
    </div>
  );
}
