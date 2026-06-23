import {
  UtensilsCrossed,
  BookOpen,
  Heart,
  ShoppingBag,
  Car,
  Home,
  Zap,
  Music,
  Receipt,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export function getCategoryIcon(name: string): LucideIcon {
  if (name.includes("식") || name.includes("카페") || name.includes("음식"))
    return UtensilsCrossed;
  if (name.includes("교육") || name.includes("학원") || name.includes("도서"))
    return BookOpen;
  if (name.includes("의료") || name.includes("병원") || name.includes("미용"))
    return Heart;
  if (name.includes("쇼핑")) return ShoppingBag;
  if (name.includes("교통") || name.includes("주유")) return Car;
  if (name.includes("주거") || name.includes("관리비")) return Home;
  if (name.includes("공과금") || name.includes("통신")) return Zap;
  if (name.includes("문화") || name.includes("여가") || name.includes("구독"))
    return Music;
  return Receipt;
}
