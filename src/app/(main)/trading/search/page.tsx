"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function StockSearchRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/trading");
  }, [router]);
  return null;
}
