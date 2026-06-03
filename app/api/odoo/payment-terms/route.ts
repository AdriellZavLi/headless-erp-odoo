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
      "account.payment.term",
      "search_read",
      [[]], // Sin filtro, traer todos los activos
      {
        fields: ["id", "name"],
        limit: 50,
      }
    );

    const translations: Record<string, string> = {
      "Immediate Payment": "Pago Inmediato",
      "15 Days": "15 Días",
      "21 Days": "21 Días",
      "30 Days": "30 Días",
      "45 Days": "45 Días",
      "End of Following Month": "Fin del Siguiente Mes",
      "10 Days after End of Next Month": "10 Días después de fin de mes",
      "30% Now, Balance 60 Days": "30% Anticipo, Resto a 60 Días",
      "2/7 Net 30": "2/7 Neto 30",
      "90 days, on the 10th": "90 Días, el día 10",
    };

    const catalog = records.map((record) => ({
      id: record.id,
      name: translations[record.name] || record.name,
    }));

    if (catalog.length === 0) {
      catalog.push(
        { id: 1, name: "Pago Inmediato" },
        { id: 2, name: "15 Días" },
        { id: 3, name: "30 Días" }
      );
    }

    return NextResponse.json({ success: true, catalog });
  } catch (error: any) {
    console.warn("⚠️ [BFF Payment Terms] Fallo en la consulta a Odoo. Retornando fallback estático.", error.message);
    
    // Fallback en caso de que el modelo de contabilidad no esté totalmente configurado
    const fallbackCatalog = [
      { id: 1, name: `Pago Inmediato (ERR: ${error.message})` },
      { id: 2, name: `15 Días (Fallback)` },
    ];

    return NextResponse.json({ success: true, catalog: fallbackCatalog });
  }
}
