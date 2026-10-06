"use client";

import RecursiveErosionBackground from "@/components/ui/recursive-erosion";

export default function RecursiveErosionBackgroundDemo() {
  return (
    <div className="relative h-[480px] w-full overflow-hidden rounded-xl border border-border bg-background">
      <RecursiveErosionBackground mode="dark" className="h-full w-full" />
    </div>
  );
}
