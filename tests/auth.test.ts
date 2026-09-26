import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createSessionToken, getAuthenticatedUsername } from "@/lib/auth";

describe("authenticated sessions", () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = "test-session-secret";
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.SESSION_SECRET;
  });

  function request(username: string, token: string) {
    return new NextRequest("http://localhost/", {
      headers: { cookie: `ledger_username=${username}; ledger_auth=${token}` },
    });
  }

  it("accepts a signed username", () => {
    const token = createSessionToken("alice", 60);
    expect(getAuthenticatedUsername(request("alice", token))).toBe("alice");
  });

  it("rejects username tampering", () => {
    const token = createSessionToken("alice", 60);
    expect(getAuthenticatedUsername(request("bob", token))).toBeNull();
  });

  it("rejects an expired session", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const token = createSessionToken("alice", 60);
    vi.setSystemTime(new Date("2026-01-01T00:02:00Z"));
    expect(getAuthenticatedUsername(request("alice", token))).toBeNull();
  });
});
