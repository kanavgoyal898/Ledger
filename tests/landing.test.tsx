// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";
import { createSessionToken } from "@/lib/auth";

const { getCookie, fetchTransactions } = vi.hoisted(() => ({
  getCookie: vi.fn(),
  fetchTransactions: vi.fn(),
}));

vi.mock("next/headers", () => ({ cookies: async () => ({ get: getCookie }) }));
vi.mock("@/lib/sanity", () => ({ sanityClient: { fetch: fetchTransactions } }));
vi.mock("@/components/dashboard/DashboardView", () => ({ DashboardView: () => null }));
vi.mock("@/components/landing/LandingPage", () => ({ LandingPage: () => null }));

import HomePage, { generateMetadata } from "@/app/(app)/page";
import { LandingPage } from "@/components/landing/LandingPage";

describe("public home page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("SESSION_SECRET", "landing-test-secret");
    getCookie.mockReturnValue(undefined);
    fetchTransactions.mockResolvedValue([]);
  });

  it("allows signed-out visitors to access only the public home route", () => {
    expect(proxy(new NextRequest("https://ledger.test/")).headers.get("x-middleware-next")).toBe("1");
    for (const path of ["/transactions", "/settings", "/account", "/api/transactions"]) {
      expect(proxy(new NextRequest(`https://ledger.test${path}`)).headers.get("location")).toBe("https://ledger.test/login");
    }
  });

  it("renders the landing page without fetching financial data for visitors", async () => {
    expect((await HomePage()).type).toBe(LandingPage);
    expect(fetchTransactions).not.toHaveBeenCalled();
    expect(await generateMetadata()).toHaveProperty("title.absolute", "Ledger");
  });

  it("preserves the dashboard for signed-in users", async () => {
    getCookie.mockImplementation((name: string) => ({ value: name === "ledger_username" ? "demo" : createSessionToken("demo") }));
    expect((await HomePage()).type).not.toBe(LandingPage);
    expect(fetchTransactions).toHaveBeenCalledWith(
      expect.any(String),
      { username: "demo" },
      { next: { tags: ["transactions"] } },
    );
    expect(await generateMetadata()).toEqual({ title: "Dashboard" });
    const request = new NextRequest("https://ledger.test/transactions");
    request.cookies.set("ledger_username", "demo");
    request.cookies.set("ledger_auth", createSessionToken("demo"));
    expect(proxy(request).headers.get("x-middleware-next")).toBe("1");
  });
});
