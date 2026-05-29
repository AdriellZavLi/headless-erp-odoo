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

    // 2. Consultar el catálogo del SAT en Odoo
    // Modelo: sat.catalog.c_claveprodserv (Clave de Producto o Servicio)
    // Filtros: [], Campos: ['code', 'name'], Límite: 100 para optimización
    try {
      const catalog = await odoo.executeKw<any[]>(
        "sat.catalog.c_claveprodserv",
        "search_read",
        [[]], // Dominio vacío (todo)
        {
          fields: ["code", "name"],
          limit: 100,
        }
      );

      // 3. Retornar el catálogo con cabeceras de caché ultra eficientes
      // Cache-Control:
      // - public: Permite el almacenamiento en CDNs, proxies intermedios y el navegador.
      // - max-age=3600: Caché fresca local durante 1 hora.
      // - stale-while-revalidate=86400: Si expira la hora, sirve la versión obsoleta en background
      //   mientras refresca la petición contra Odoo de forma asíncrona, evitando latencias (0-blocking).
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
      console.error("❌ [BFF SAT CLAVEPRODSERV] Error al consultar Odoo:", odooError.message);
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
    console.error("❌ [BFF SAT CLAVEPRODSERV] Error crítico interno:", error);
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
