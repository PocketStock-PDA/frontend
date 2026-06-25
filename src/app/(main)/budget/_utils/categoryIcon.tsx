import {
  UtensilsCrossed,
  ShoppingCart,
  BookOpen,
  Heart,
  Shirt,
  Car,
  Home,
  Smartphone,
  Music,
  Package,
  Receipt,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export function getCategoryIcon(name: string): LucideIcon {
  if (name.includes("식료품") || name.includes("마트") || name.includes("편의점"))
    return ShoppingCart;
  if (
    name.includes("음식") ||
    name.includes("숙박") ||
    name.includes("카페") ||
    name.includes("외식")
  )
    return UtensilsCrossed;
  if (name.includes("교통") || name.includes("자동차") || name.includes("주유"))
    return Car;
  if (
    name.includes("보건") ||
    name.includes("의료") ||
    name.includes("병원") ||
    name.includes("미용")
  )
    return Heart;
  if (name.includes("교육") || name.includes("학원") || name.includes("도서"))
    return BookOpen;
  if (
    name.includes("오락") ||
    name.includes("문화") ||
    name.includes("여가") ||
    name.includes("구독")
  )
    return Music;
  if (name.includes("주거") || name.includes("관리비") || name.includes("광열"))
    return Home;
  if (name.includes("정보통신") || name.includes("통신")) return Smartphone;
  if (name.includes("의류") || name.includes("신발") || name.includes("쇼핑"))
    return Shirt;
  if (name.includes("가정") || name.includes("가사")) return Package;
  return Receipt;
}
