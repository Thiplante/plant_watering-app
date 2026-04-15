"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/Header";

export default function HeaderWrapper() {
  const pathname = usePathname();

  const hideHeader = pathname === "/login" || pathname === "/signup";

  if (hideHeader) return null;

  return <Header />;
}