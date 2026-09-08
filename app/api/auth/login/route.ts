import { NextRequest, NextResponse } from "next/server";
import { sanityClient } from "@/lib/sanity";
import { USER_QUERY, tokenResetToDays } from "@/lib/types";
import type { User } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const { username, passcode } = await request.json();

    if (!username || !passcode) {
      return NextResponse.json(
        { error: "Username and passcode are required" },
        { status: 400 }
      );
    }

    const user: User | null = await sanityClient.fetch(
      USER_QUERY,
      { username },
      { cache: "no-store" }
    );

    if (!user || user.passcode !== String(passcode)) {
      return NextResponse.json(
        { error: "Invalid username or passcode" },
        { status: 401 }
      );
    }

    const maxAge = tokenResetToDays(user.tokenReset);
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      ...(maxAge !== undefined ? { maxAge } : {}),
    };

    const response = NextResponse.json({ ok: true });
    response.cookies.set("ledger_username", user.username, cookieOptions);
    response.cookies.set("ledger_auth", "1", cookieOptions);

    return response;
  } catch (error) {
    console.error("POST /api/auth/login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
