import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { odoo } from "@/lib/odoo-client";

export async function GET() {
  try {
    // 1. Proteger el endpoint verificando la sesión activa del ERP
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        {
          success: false,
          error: "UNAUTHORIZED_BFF_CALL",
          message: "No autorizado. Inicie sesión en el ERP primero.",
        },
        { status: 401 }
      );
    }

    // 2. Consultar el catálogo de usos de CFDI en Odoo
    // Modelo: sat.catalog.c_usocfdi (Uso de CFDI)
    // Filtros: [], Campos: ['code', 'name']
    try {
      const catalog = await odoo.executeKw<any[]>(
        "sat.catalog.c_usocfdi",
        "search_read",
        [[]], // Dominio vacío
        {
          fields: ["code", "name"],
        }
      );

      // 3. Retornar con cabeceras de caché altamente óptimas
      return NextResponse.json(
        {
          success: true,
          catalog,
        },
        {
          headers: {
            "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
            "Content-Type": "application/json",
          },
        }
      );
    } catch (odooError: any) {
      console.error("❌ [BFF SAT USOCFDI] Error al consultar Odoo:", odooError.message);
      return NextResponse.json(
        {
          success: false,
          error: "ODOO_COMMUNICATION_ERROR",
          message: "No se pudo obtener el catálogo de Odoo. Inténtelo más tarde.",
        },
        { status: 502 }
      );
    }
  } catch (error: any) {
    console.error("❌ [BFF SAT USOCFDI] Error crítico interno:", error);
    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_SERVER_ERROR",
        message: "Ocurrió un error inesperado en el servidor BFF.",
      },
      { status: 500 }
    );
  }
}
