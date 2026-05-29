import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { odoo } from "@/lib/odoo-client";
import { OdooPingResponse } from "@/types/odoo";

export async function GET() {
  try {
    // 1. Proteger el endpoint verificando la sesión activa del ERP
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        {
          success: false,
          status: "error",
          message: "No autorizado. Inicie sesión en el ERP primero.",
          mode: "live",
          error: "UNAUTHORIZED_BFF_CALL",
        } as OdooPingResponse,
        { status: 401 }
      );
    }

    const isMock = odoo.getIsMockMode();
    const timestamp = new Date().toISOString();

    // 2. Intentar la conexión server-to-server con Odoo (vía versión y auth)
    try {
      const versionInfo = await odoo.getVersion();
      
      // Si estamos en modo real (LIVE), forzamos una autenticación para probar las credenciales
      if (!isMock) {
        await odoo.authenticate();
      }

      return NextResponse.json({
        success: true,
        status: isMock ? "mock_mode" : "connected",
        message: isMock
          ? "Conexión emulada con éxito (Modo simulación local activo)."
          : "Conexión establecida y autenticada con el servidor Odoo en producción.",
        mode: isMock ? "mock" : "live",
        details: {
          server_version: versionInfo.server_version,
          server_serie: versionInfo.server_serie,
          database: odoo.getDbName(),
          username: odoo.getUsername(),
          timestamp,
        },
      } as OdooPingResponse);

    } catch (connectionError: any) {
      console.error("❌ [BFF API PING] Error al autenticar contra Odoo:", connectionError.message);
      
      return NextResponse.json(
        {
          success: false,
          status: "error",
          message: "Error de comunicación Server-to-Server. No se pudo conectar a Odoo.",
          mode: "live",
          details: {
            database: odoo.getDbName(),
            username: odoo.getUsername(),
            timestamp,
          },
          error: connectionError.message || "CONNECTION_FAILED",
        } as OdooPingResponse,
        { status: 502 } // Bad Gateway
      );
    }

  } catch (error: any) {
    console.error("❌ [BFF API PING] Error crítico en el Route Handler:", error);
    
    return NextResponse.json(
      {
        success: false,
        status: "error",
        message: "Ocurrió un error inesperado en el servidor BFF.",
        mode: "live",
        error: error.message || "INTERNAL_SERVER_ERROR",
      } as OdooPingResponse,
      { status: 500 }
    );
  }
}
