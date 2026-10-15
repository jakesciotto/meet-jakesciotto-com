"use client";

import { useVisitorTz } from "@/lib/visitor-tz";
import { tzLabel } from "@/lib/when";

export function TzNote({ hostTz, prefix = "times shown in" }: { hostTz: string; prefix?: string }) {
  const tz = useVisitorTz(hostTz);
  return (
    <span>
      {prefix} {tzLabel(tz)}
    </span>
  );
}
