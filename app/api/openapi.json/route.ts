"use server";

import { NextRequest, NextResponse } from "next/server";
import { buildOpenApiSpec } from "@/lib/openapi";

// Ensure all tools are registered before generating the spec
import "@/lib/tools/shop-floor";
import "@/lib/tools/product";
import "@/lib/tools/production";
import "@/lib/tools/quality";
import "@/lib/tools/analytics";

export async function GET(request: NextRequest) {
  const baseUrl = new URL(request.url).origin;
  const spec = buildOpenApiSpec(baseUrl);

  return NextResponse.json(spec, {
    headers: {
      "Content-Type": "application/json",
      // Allow public access so tools like Postman / Swagger UI can fetch the spec
      "Access-Control-Allow-Origin": "*",
    },
  });
}
