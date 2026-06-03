import { NextResponse } from "next/server";
import { odoo } from "@/lib/odoo-client";

export async function GET() {
  try {
    const terms = await odoo.executeKw("account.payment.term", "search_read", [[]], { fields: ["id", "name"], limit: 50, context: { lang: 'es_MX' } });
    return NextResponse.json({ success: true, terms });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message, stack: error.stack });
  }
}
