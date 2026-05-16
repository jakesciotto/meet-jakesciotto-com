import { startGoogleLogin } from "@/actions/admin-auth";
import { Button } from "@/components/ui/button";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { config } from "@/lib/config";

const ERROR_LABELS: Record<string, string> = {
  missing_code: "Google did not return an authorization code.",
  invalid_state: "The login link expired or was tampered with. Try again.",
  exchange_failed: "Could not exchange the authorization code with Google.",
  not_authorized: `Only ${config.adminEmail} can sign in here.`,
  persist_failed: "Logged in with Google, but failed to save credentials.",
  access_denied: "You declined the Google permissions.",
};

type Search = Promise<{ error?: string }>;

export default async function AdminLoginPage({ searchParams }: { searchParams: Search }) {
  const { error } = await searchParams;
  const message = error ? (ERROR_LABELS[error] ?? `Login error: ${error}`) : null;

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col justify-center px-4 py-12">
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Admin sign in</h1>
          <p className="text-sm text-muted-foreground">
            Sign in with the Google account that owns the booking calendar.
          </p>
        </header>

        {message && (
          <Alert variant="destructive">
            <AlertTitle>Sign-in failed</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        <form action={startGoogleLogin}>
          <Button type="submit" className="w-full" size="lg">
            Continue with Google
          </Button>
        </form>
      </div>
    </main>
  );
}
