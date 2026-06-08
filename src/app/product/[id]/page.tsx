import { notFound } from "next/navigation";
import db from "@/lib/db";
import ProductDetailClient from "./ProductDetailClient";
import { Metadata } from "next";

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * Dynamically generate SEO Metadata based on the loaded product details
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  
  const product = await db.product.findUnique({
    where: { id },
  });

  if (!product) {
    return {
      title: "Không Tìm Thấy Sản Phẩm - Shopee Radar",
    };
  }

  const formattedPrice = product.current_price.toLocaleString("vi-VN");

  return {
    title: `Lịch sử giá: ${product.name} - Shopee Radar`,
    description: `Xem biểu đồ biến động lịch sử giá của ${product.name}. Giá hiện tại: ${formattedPrice}₫. Đăng ký thông báo khi có đợt giảm giá mạnh.`,
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params;

  // Query product details with price history ordered chronologically
  const product = await db.product.findUnique({
    where: { id },
    include: {
      price_history: {
        orderBy: {
          recorded_at: "asc",
        },
      },
    },
  });

  if (!product) {
    notFound();
  }

  // Serialize Date objects to ISO strings for safe transmission to the Client Component
  const serializedProduct = {
    id: product.id,
    itemid: product.itemid,
    shopid: product.shopid,
    name: product.name,
    image: product.image,
    original_url: product.original_url,
    current_price: product.current_price,
    created_at: product.created_at.toISOString(),
    updated_at: product.updated_at.toISOString(),
    price_history: product.price_history.map((history) => ({
      id: history.id,
      product_id: history.product_id,
      price: history.price,
      recorded_at: history.recorded_at.toISOString(),
    })),
  };

  return <ProductDetailClient product={serializedProduct} />;
}
