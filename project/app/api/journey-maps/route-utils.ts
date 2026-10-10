import { NextResponse } from "next/server";
import { ownerContextErrorResponse } from "@/lib/supabase/owner-context";
import { JourneyMapServiceError } from "@/services/journey-map.service";

export function journeyMapErrorResponse(error: unknown) {
  const ownerResponse = ownerContextErrorResponse(error);
  if (ownerResponse) return ownerResponse;

  if (error instanceof JourneyMapServiceError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message, details: null } },
      { status: error.status }
    );
  }

  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "Journey map request failed", details: null } },
    { status: 500 }
  );
}
