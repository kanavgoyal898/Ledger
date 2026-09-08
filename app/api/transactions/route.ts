import { NextRequest, NextResponse } from "next/server";
import { sanityClient, sanityWriteClient } from "@/lib/sanity";
import { transactionFormSchema } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const account = searchParams.get("account");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const search = searchParams.get("search");
    const type = searchParams.get("type"); // "income" | "expense" | null

    let query = `*[_type == "transaction"`;
    const params: Record<string, string> = {};

    if (type) {
      query += ` && type == $type`;
      params.type = type;
    }
    if (category) {
      query += ` && category == $category`;
      params.category = category;
    }
    if (account) {
      query += ` && account == $account`;
      params.account = account;
    }
    if (from) {
      query += ` && date >= $from`;
      params.from = from;
    }
    if (to) {
      query += ` && date <= $to`;
      params.to = to;
    }
    if (search) {
      query += ` && (heading match $search || description match $search || category match $search)`;
      params.search = `*${search}*`;
    }

    query += `] | order(date desc) {
      _id, _type, _createdAt, _updatedAt,
      type, date, amount, category, subCategory,
      account, subAccount, heading, description,
      recurringTransactionId, recurringOccurrence
    }`;

    const transactions = await sanityClient.fetch(query, params, {
      cache: "no-store",
    });

    return NextResponse.json(transactions);
  } catch (error) {
    console.error("GET /api/transactions error:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = transactionFormSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { type, date, amount, category, subCategory, account, subAccount, heading, description } =
      parsed.data;

    const doc = await sanityWriteClient.create({
      _type: "transaction",
      type,
      date,
      amount,
      category,
      ...(subCategory ? { subCategory } : {}),
      account,
      ...(subAccount ? { subAccount } : {}),
      ...(heading ? { heading } : {}),
      ...(description ? { description } : {}),
    });

    return NextResponse.json(doc, { status: 201 });
  } catch (error) {
    console.error("POST /api/transactions error:", error);
    return NextResponse.json(
      { error: "Failed to create transaction" },
      { status: 500 }
    );
  }
}
