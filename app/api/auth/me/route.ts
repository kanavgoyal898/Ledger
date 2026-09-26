import { NextRequest, NextResponse } from "next/server";
import { sanityClient, sanityWriteClient } from "@/lib/sanity";
import { tokenResetToDays, USER_QUERY } from "@/lib/types";
import type { TokenReset, User } from "@/lib/types";
import { createSessionToken, getAuthenticatedUsername } from "@/lib/auth";

const tokenResetValues: TokenReset[] = [
  "1_day",
  "1_week",
  "1_month",
  "1_year",
  "never",
];

function safeUser(user: User) {
  return {
    _id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    profilePicture: user.profilePicture,
    mobileNumber: user.mobileNumber,
    email: user.email,
    tokenReset: user.tokenReset,
  };
}

export async function GET(request: NextRequest) {
  try {
    const username = getAuthenticatedUsername(request);

    if (!username) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user: User | null = await sanityClient.fetch(
      USER_QUERY,
      { username },
      { cache: "no-store" }
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(safeUser(user));
  } catch (error) {
    console.error("GET /api/auth/me error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const currentUsername = getAuthenticatedUsername(request);
    if (!currentUsername) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
    const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const mobileNumber = typeof body.mobileNumber === "string" ? body.mobileNumber.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const tokenReset = body.tokenReset as TokenReset;

    if (!firstName || !username || !tokenResetValues.includes(tokenReset)) {
      return NextResponse.json(
        { error: "First name, username, and token reset are required" },
        { status: 400 }
      );
    }

    const user: User | null = await sanityClient.fetch(
      USER_QUERY,
      { username: currentUsername },
      { cache: "no-store" }
    );
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (username !== currentUsername) {
      const existingUser: User | null = await sanityClient.fetch(
        USER_QUERY,
        { username },
        { cache: "no-store" }
      );
      if (existingUser && existingUser._id !== user._id) {
        return NextResponse.json({ error: "That username is already in use" }, { status: 409 });
      }

      const ownedDocuments = await sanityClient.fetch<{ _id: string }[]>(
        `*[_type in ["transaction", "transfer", "settings", "recurringTransaction"] && username == $currentUsername]{ _id }`,
        { currentUsername },
        { cache: "no-store" }
      );
      if (ownedDocuments.length > 0) {
        const ownershipUpdate = sanityWriteClient.transaction();
        for (const document of ownedDocuments) {
          ownershipUpdate.patch(document._id, (patch) => patch.set({ username }));
        }
        await ownershipUpdate.commit();
      }
    }

    await sanityWriteClient
      .patch(user._id)
      .set({ firstName, username, tokenReset })
      .unset([
        ...(lastName ? [] : ["lastName"]),
        ...(mobileNumber ? [] : ["mobileNumber"]),
        ...(email ? [] : ["email"]),
      ])
      .set({
        ...(lastName ? { lastName } : {}),
        ...(mobileNumber ? { mobileNumber } : {}),
        ...(email ? { email } : {}),
      })
      .commit();

    const response = NextResponse.json(
      safeUser({
        ...user,
        firstName,
        lastName: lastName || undefined,
        username,
        mobileNumber: mobileNumber || undefined,
        email: email || undefined,
        tokenReset,
      })
    );
    const maxAge = tokenResetToDays(tokenReset);
    response.cookies.set("ledger_username", username, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      ...(maxAge !== undefined ? { maxAge } : {}),
    });
    response.cookies.set("ledger_auth", createSessionToken(username, maxAge), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      ...(maxAge !== undefined ? { maxAge } : {}),
    });
    return response;
  } catch (error) {
    console.error("PATCH /api/auth/me error:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
