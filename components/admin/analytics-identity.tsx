"use client";

import { useEffect } from "react";
import { identify } from "@/lib/analytics";

export function AnalyticsIdentity({ email }: { email: string }) {
  useEffect(() => {
    identify(email, { email });
  }, [email]);

  return null;
}
