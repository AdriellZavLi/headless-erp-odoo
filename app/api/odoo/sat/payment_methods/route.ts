import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { odoo } from "@/lib/odoo-client";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const records = await odoo.executeKw<any[]>(
      "l10n_mx_edi.payment.method",
      "search_read",
      [[]],
      {
        fields: ["id", "name"],
        limit: 100,
      }
    );

    const catalog = records.map((record) => ({
      id: record.id,
      name: record.name,
    }));

    if (catalog.length === 0) {
      catalog.push(
        { id: 1, name: "01 - Efectivo" },
        { id: 2, name: "03 - Transferencia electrónica de fondos" },
        { id: 3, name: "99 - Por definir" }
      );
    }

    return NextResponse.json({ success: true, catalog });
  } catch (error: any) {
    console.warn("⚠️ [BFF SAT Payment Methods] Fallo en la consulta a Odoo. Retornando fallback estático.", error.message);
    
    const fallbackCatalog = [
      { id: 9991, name: `01 - Efectivo (ERR: ${error.message})` },
      { id: 9993, name: "03 - Transferencia (Fallback)" },
      { id: 9999, name: "99 - Por definir (Fallback)" }
    ];

    return NextResponse.json({ success: true, catalog: fallbackCatalog });
  }
}
