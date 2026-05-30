import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { odoo } from "@/lib/odoo-client";
import { GarmentProfile } from "@/types/order";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Buscar en product.product todos los productos que puedan ser prendas
    // Filtramos por productos que puedan ser vendidos (sale_ok = True)
    const records = await odoo.executeKw<any[]>(
      "product.product",
      "search_read",
      [[["sale_ok", "=", true]]],
      {
        fields: ["id", "display_name", "list_price", "qty_available"],
        limit: 200,
      }
    );

    // Mapear los campos de Odoo a nuestro tipado TypeScript estricto
    const catalog: GarmentProfile[] = records.map((record) => {
      return {
        id: String(record.id),
        displayName: record.display_name || "Prenda sin nombre",
        listPrice: record.list_price || 0,
        qtyAvailable: record.qty_available || 0,
      };
    });

    // Fallback: Si Odoo está vacío en esta DB de prueba
    if (catalog.length === 0) {
      catalog.push(
        { id: "GAR-FALLBACK-1", displayName: "Playera Tipo Polo (Azul Marino, M)", listPrice: 150, qtyAvailable: 50 },
        { id: "GAR-FALLBACK-2", displayName: "Camisa de Vestir Oxford (Blanco, L)", listPrice: 280, qtyAvailable: 15 }
      );
    }

    return NextResponse.json({ success: true, catalog });
  } catch (error: any) {
    console.error("Error fetching garments from Odoo:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
