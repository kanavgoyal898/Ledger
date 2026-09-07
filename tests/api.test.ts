import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mock next-sanity and @sanity/client so tests don't need real credentials
// ---------------------------------------------------------------------------
vi.mock("@/lib/sanity", () => {
  const mockFetch = vi.fn();
  const mockCreate = vi.fn();
  const mockPatch = vi.fn(() => ({
    set: vi.fn().mockReturnThis(),
    commit: vi.fn().mockResolvedValue({ _id: "test-id", _type: "transaction" }),
  }));
  const mockDelete = vi.fn();

  const client = {
    fetch: mockFetch,
    create: mockCreate,
    patch: mockPatch,
    delete: mockDelete,
    createOrReplace: vi.fn(),
  };

  return {
    sanityClient: client,
    sanityWriteClient: client,
  };
});

// ---------------------------------------------------------------------------
// Import after mocking
// ---------------------------------------------------------------------------
import { sanityClient, sanityWriteClient } from "@/lib/sanity";
import { GET as getTransactions, POST as postTransaction } from "@/app/api/transactions/route";
import { GET as getTransaction, PATCH as patchTransaction, DELETE as deleteTransaction } from "@/app/api/transactions/[id]/route";
import { GET as getSettings, PATCH as patchSettings } from "@/app/api/settings/route";

// ---------------------------------------------------------------------------
// GET /api/transactions
// ---------------------------------------------------------------------------
describe("GET /api/transactions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns a list of transactions", async () => {
    const mockTransactions = [
      { _id: "1", _type: "transaction", type: "expense", date: "2024-01-01", amount: 100, category: "Food", account: "Cash" },
    ];
    (sanityClient.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockTransactions);

    const req = new NextRequest("http://localhost/api/transactions");
    const res = await getTransactions(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(mockTransactions);
  });

  it("passes category filter to sanity query", async () => {
    (sanityClient.fetch as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const req = new NextRequest("http://localhost/api/transactions?category=Food");
    await getTransactions(req);

    const fetchCall = (sanityClient.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(fetchCall[0]).toContain("category");
    expect(fetchCall[1]).toMatchObject({ category: "Food" });
  });

  it("returns 500 on sanity error", async () => {
    (sanityClient.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Sanity error"));

    const req = new NextRequest("http://localhost/api/transactions");
    const res = await getTransactions(req);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// POST /api/transactions
// ---------------------------------------------------------------------------
describe("POST /api/transactions", () => {
  beforeEach(() => vi.clearAllMocks());

  const validPayload = {
    type: "expense",
    date: "2024-06-15T00:00:00.000Z",
    amount: 500,
    category: "Food",
    account: "HDFC",
  };

  it("creates a transaction and returns 201", async () => {
    const created = { _id: "new-id", _type: "transaction", ...validPayload };
    (sanityWriteClient.create as ReturnType<typeof vi.fn>).mockResolvedValue(created);

    const req = new NextRequest("http://localhost/api/transactions", {
      method: "POST",
      body: JSON.stringify(validPayload),
      headers: { "Content-Type": "application/json" },
    });

    const res = await postTransaction(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body._id).toBe("new-id");
  });

  it("returns 400 for invalid payload", async () => {
    const req = new NextRequest("http://localhost/api/transactions", {
      method: "POST",
      body: JSON.stringify({ amount: -100 }), // missing required fields
      headers: { "Content-Type": "application/json" },
    });

    const res = await postTransaction(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
  });
});

// ---------------------------------------------------------------------------
// GET /api/transactions/[id]
// ---------------------------------------------------------------------------
describe("GET /api/transactions/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns a single transaction", async () => {
    const mockTransaction = { _id: "abc123", _type: "transaction", type: "income", amount: 200, category: "Salary", account: "HDFC" };
    (sanityClient.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockTransaction);

    const req = new NextRequest("http://localhost/api/transactions/abc123");
    const res = await getTransaction(req, { params: Promise.resolve({ id: "abc123" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body._id).toBe("abc123");
  });

  it("returns 404 if transaction not found", async () => {
    (sanityClient.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const req = new NextRequest("http://localhost/api/transactions/not-found");
    const res = await getTransaction(req, { params: Promise.resolve({ id: "not-found" }) });
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/transactions/[id]
// ---------------------------------------------------------------------------
describe("DELETE /api/transactions/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes and returns success", async () => {
    (sanityWriteClient.delete as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const req = new NextRequest("http://localhost/api/transactions/abc123", { method: "DELETE" });
    const res = await deleteTransaction(req, { params: Promise.resolve({ id: "abc123" }) });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// GET /api/settings
// ---------------------------------------------------------------------------
describe("GET /api/settings", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns settings document", async () => {
    const mockSettings = {
      _id: "singleton-settings",
      _type: "settings",
      categories: [{ _key: "k1", label: "Food", subCategories: [] }],
      accounts: [],
    };
    (sanityClient.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockSettings);

    const res = await getSettings();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.categories).toHaveLength(1);
  });

  it("returns empty settings when singleton doesn't exist", async () => {
    (sanityClient.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await getSettings();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.categories).toEqual([]);
    expect(body.accounts).toEqual([]);
  });
});
