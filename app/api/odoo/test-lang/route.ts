import { NextResponse } from "next/server";
import { odoo } from "@/lib/odoo-client";

export async function GET() {
  try {
    const langs = await odoo.executeKw("res.lang", "search_read", [[]], { fields: ["code", "name", "active"] });
    return NextResponse.json({ success: true, langs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
