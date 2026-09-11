"use client";

import { Button } from "@/components/ui/button";
import { reset } from "@/lib/analytics";

export function SignOutButton() {
  return (
    <Button type="submit" variant="outline" size="sm" onClick={() => reset()}>
      Sign out
    </Button>
  );
}
