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
    // Filtramos por productos que puedan ser vendidos o manufacturados
    const records = await odoo.executeKw<any[]>(
      "product.product",
      "search_read",
      [[["sale_ok", "=", true]]],
      {
        fields: ["id", "name", "categ_id", "default_code", "product_template_attribute_value_ids"],
        limit: 100,
      }
    );

    // Mapear los campos de Odoo a nuestro tipado TypeScript estricto
    const catalog: GarmentProfile[] = records.map((record) => {
      // Extraemos información básica. En un ERP Odoo real con Variantes:
      // El nombre suele incluir los atributos, ej: "Playera Polo (Azul, M)"
      // O los IDs de atributos están en product_template_attribute_value_ids
      
      const garmentType = record.categ_id ? record.categ_id[1] : "Prenda Genérica";
      
      // Intentar deducir color y talla del nombre como fallback para la UI
      // Si el nombre tiene paréntesis ej: "Camisa (Blanco, L)"
      let color = "No definido";
      let size = "Unitalla";
      
      const match = record.name.match(/\(([^,]+),\s*([^)]+)\)/);
      if (match) {
        color = match[1].trim();
        size = match[2].trim();
      } else {
        // Fallback heurístico básico para demostración
        if (record.name.toLowerCase().includes("blanco")) color = "Blanco";
        if (record.name.toLowerCase().includes("negro")) color = "Negro";
        if (record.name.toLowerCase().includes("azul")) color = "Azul";
      }

      return {
        id: String(record.id),
        garmentType: garmentType,
        color: color,
        size: size,
        // Usamos default_code (Referencia Interna) o un SAT code quemado si no hay localización MX instalada
        claveProdServ: record.default_code || "53101602",
      };
    });

    // Fallback: Si Odoo está vacío en esta DB de prueba
    if (catalog.length === 0) {
      catalog.push(
        { id: "GAR-FALLBACK-1", garmentType: "Polo", color: "Azul Marino", size: "M", claveProdServ: "53101602" },
        { id: "GAR-FALLBACK-2", garmentType: "Camisa de Vestir", color: "Blanco", size: "L", claveProdServ: "53101602" }
      );
    }

    return NextResponse.json({ success: true, catalog });
  } catch (error: any) {
    console.error("Error fetching garments from Odoo:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
