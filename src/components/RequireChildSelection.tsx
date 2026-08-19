"use client";

import type { ReactNode } from "react";
import { useStore } from "@/lib/store";
import ChildPicker from "./ChildPicker";

export default function RequireChildSelection({ children }: { children: ReactNode }) {
  const { needsChildSelection } = useStore();
  if (needsChildSelection) return <ChildPicker />;
  return <>{children}</>;
}
