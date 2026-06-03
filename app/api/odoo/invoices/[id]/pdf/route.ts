import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { odoo } from "@/lib/odoo-client";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const resolvedParams = await params;
  const invoiceId = parseInt(resolvedParams.id, 10);
  if (isNaN(invoiceId)) {
    return NextResponse.json({ success: false, error: "ID de factura inválido" }, { status: 400 });
  }

  try {
    // 1. Obtener la URL del portal para forzar la generación del access_token si no existe
    await odoo.executeKw("account.move", "get_portal_url", [[invoiceId]]);

    // 2. Obtener el access_token y nombre de la factura
    const moves = await odoo.executeKw<any[]>(
      "account.move",
      "search_read",
      [[["id", "=", invoiceId]]],
      {
        fields: ["name", "access_token"],
        limit: 1
      }
    );

    if (!moves || moves.length === 0) {
      return NextResponse.json({ success: false, error: "Factura no encontrada" }, { status: 404 });
    }

    const move = moves[0];
    if (!move.access_token) {
      return NextResponse.json({ success: false, error: "No se pudo generar el token de acceso para descargar el PDF" }, { status: 500 });
    }

    // 3. Descargar el PDF directamente desde la ruta pública del portal de Odoo
    const odooUrl = process.env.ODOO_URL || "https://axizstudios1.odoo.com";
    const pdfUrl = `${odooUrl}/my/invoices/${invoiceId}?access_token=${move.access_token}&report_type=pdf`;
    
    const pdfRes = await fetch(pdfUrl);
    if (!pdfRes.ok) {
       return NextResponse.json({ success: false, error: "Odoo rechazó la generación del PDF vía portal" }, { status: 500 });
    }

    // 4. Convertir el PDF a Base64 para el frontend
    const pdfBuffer = await pdfRes.arrayBuffer();
    const pdfBase64 = Buffer.from(pdfBuffer).toString('base64');
    const safeName = (move.name || `Factura_${invoiceId}`).replace(/\//g, "-");

    return NextResponse.json({ 
      success: true, 
      pdf: {
        name: `${safeName}.pdf`,
        data: pdfBase64
      }
    });
  } catch (error: any) {
    console.error("❌ [BFF PDF] Error extrayendo PDF:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
