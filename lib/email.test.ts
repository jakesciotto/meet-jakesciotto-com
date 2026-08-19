import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

const NOTICE = {
  bookingId: "8f0d0e6e-2d31-4a1a-9d5e-2f6a1c0b0f11",
  inviteeName: "Dana Reed",
  inviteeCompany: "Acme",
  inviteeEmail: "dana@acme.test",
  startsAt: new Date("2026-09-01T17:00:00.000Z"),
  endsAt: new Date("2026-09-01T17:30:00.000Z"),
  conferencing: "meet" as const,
};

async function loadEmailModule() {
  vi.resetModules();
  return import("@/lib/email");
}

function mockFetch(response: Partial<Response> = {}) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    text: async () => "{}",
    ...response,
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  process.env.ADMIN_EMAIL = "jake.s@posthog.com";
  process.env.EMAIL_FROM = "bookings@jakesciotto.com";
  process.env.RESEND_API_KEY = "re_test_key";
  process.env.HOST_TZ = "America/Denver";
  process.env.APP_URL = "https://meet.jakesciotto.com";
});

afterEach(() => {
  vi.unstubAllGlobals();
  process.env = { ...ORIGINAL_ENV };
});

describe("sendHostBookingNotice", () => {
  it("posts the notice to Resend addressed to the admin", async () => {
    const fetchMock = mockFetch();
    const { sendHostBookingNotice } = await loadEmailModule();

    const result = await sendHostBookingNotice(NOTICE);

    expect(result).toEqual({ sent: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer re_test_key");

    const body = JSON.parse(init.body);
    expect(body.to).toEqual(["jake.s@posthog.com"]);
    expect(body.from).toBe("bookings@jakesciotto.com");
    expect(body.reply_to).toEqual(["dana@acme.test"]);
    expect(body.subject).toContain("Dana Reed");
    expect(body.subject).toContain("Acme");
    expect(body.text).toContain("dana@acme.test");
  });

  it("prefers NOTIFY_EMAIL over the admin address", async () => {
    process.env.NOTIFY_EMAIL = "jake.sciotto@gmail.com";
    const fetchMock = mockFetch();
    const { sendHostBookingNotice } = await loadEmailModule();

    await sendHostBookingNotice(NOTICE);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.to).toEqual(["jake.sciotto@gmail.com"]);
  });

  it("renders the start time in the host time zone", async () => {
    const fetchMock = mockFetch();
    const { sendHostBookingNotice } = await loadEmailModule();

    await sendHostBookingNotice(NOTICE);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.text).toContain("11:00");
  });

  it("escapes invitee text in the HTML body", async () => {
    const fetchMock = mockFetch();
    const { sendHostBookingNotice } = await loadEmailModule();

    await sendHostBookingNotice({
      ...NOTICE,
      inviteeName: "<script>alert(1)</script>",
      notes: "a & b <img src=x>",
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.html).not.toContain("<script>");
    expect(body.html).toContain("&lt;script&gt;");
    expect(body.html).toContain("a &amp; b");
  });

  it("skips the send when RESEND_API_KEY is missing", async () => {
    delete process.env.RESEND_API_KEY;
    const fetchMock = mockFetch();
    const { sendHostBookingNotice } = await loadEmailModule();

    const result = await sendHostBookingNotice(NOTICE);

    expect(result).toEqual({ sent: false, reason: "not_configured" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports a failed send without throwing", async () => {
    mockFetch({ ok: false, status: 422, text: async () => "domain not verified" });
    const { sendHostBookingNotice } = await loadEmailModule();

    const result = await sendHostBookingNotice(NOTICE);

    expect(result.sent).toBe(false);
    expect(result.reason).toContain("422");
  });

  it("reports a network failure without throwing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("socket hang up")));
    const { sendHostBookingNotice } = await loadEmailModule();

    const result = await sendHostBookingNotice(NOTICE);

    expect(result.sent).toBe(false);
    expect(result.reason).toContain("socket hang up");
  });
});

describe("sendHostCancellationNotice", () => {
  it("marks the subject as a cancellation", async () => {
    const fetchMock = mockFetch();
    const { sendHostCancellationNotice } = await loadEmailModule();

    const result = await sendHostCancellationNotice(NOTICE);

    expect(result).toEqual({ sent: true });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.subject).toContain("Cancelled");
    expect(body.subject).toContain("Dana Reed");
    expect(body.to).toEqual(["jake.s@posthog.com"]);
  });
});
