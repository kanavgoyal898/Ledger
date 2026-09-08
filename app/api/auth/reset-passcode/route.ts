import { NextRequest, NextResponse } from "next/server";
import { sanityClient, sanityWriteClient } from "@/lib/sanity";
import { USER_QUERY } from "@/lib/types";
import type { User } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const username = request.cookies.get("ledger_username")?.value;
    if (!username) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const currentPasscode = typeof body.currentPasscode === "string" ? body.currentPasscode : "";
    const newPasscode = typeof body.newPasscode === "string" ? body.newPasscode : "";
    const confirmPasscode = typeof body.confirmPasscode === "string" ? body.confirmPasscode : "";

    if (![currentPasscode, newPasscode, confirmPasscode].every((value) => /^\d{6}$/.test(value))) {
      return NextResponse.json(
        { error: "Passcodes must be exactly 6 digits" },
        { status: 400 }
      );
    }

    if (newPasscode !== confirmPasscode) {
      return NextResponse.json(
        { error: "New passcodes do not match" },
        { status: 400 }
      );
    }

    if (currentPasscode === newPasscode) {
      return NextResponse.json(
        { error: "New passcode must be different from the current passcode" },
        { status: 400 }
      );
    }

    const user: User | null = await sanityClient.fetch(
      USER_QUERY,
      { username },
      { cache: "no-store" }
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.passcode !== currentPasscode) {
      return NextResponse.json(
        { error: "Current passcode is incorrect" },
        { status: 401 }
      );
    }

    await sanityWriteClient.patch(user._id).set({ passcode: newPasscode }).commit();

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/auth/reset-passcode error:", error);
    return NextResponse.json(
      { error: "Failed to reset passcode" },
      { status: 500 }
    );
  }
}
