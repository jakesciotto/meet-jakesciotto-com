import posthog from "posthog-js";

const enabled = Boolean(
  process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN && process.env.NEXT_PUBLIC_POSTHOG_HOST,
);

type Properties = Record<string, unknown>;

export function capture(event: string, properties?: Properties): void {
  if (!enabled) return;
  posthog.capture(event, properties);
}

export function captureException(error: unknown): void {
  if (!enabled) return;
  posthog.captureException(error);
}

export function identify(distinctId: string, properties?: Properties): void {
  if (!enabled) return;
  posthog.identify(distinctId, properties);
}

export function reset(): void {
  if (!enabled) return;
  posthog.reset();
}
