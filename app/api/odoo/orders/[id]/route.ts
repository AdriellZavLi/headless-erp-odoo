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
  const orderId = parseInt(resolvedParams.id, 10);
  if (isNaN(orderId)) {
    return NextResponse.json({ success: false, error: "ID inválido" }, { status: 400 });
  }

  try {
    // 1. Obtener cabecera de la orden (sale.order)
    const orders = await odoo.executeKw<any[]>(
      "sale.order",
      "search_read",
      [[["id", "=", orderId]]],
      {
        fields: ["id", "name", "partner_id", "amount_total", "order_line", "state", "date_order", "tag_ids", "l10n_mx_edi_payment_method_id", "l10n_mx_edi_payment_policy"],
        limit: 1,
      }
    );

    if (!orders || orders.length === 0) {
      return NextResponse.json({ success: false, error: "Orden no encontrada" }, { status: 404 });
    }

    const order = orders[0];

    // 1.5 Obtener RFC y Email del cliente
    if (order.partner_id && order.partner_id[0]) {
      const partners = await odoo.executeKw<any[]>("res.partner", "search_read", [[["id", "=", order.partner_id[0]]]], { fields: ["vat", "email"] });
      if (partners && partners.length > 0) {
        order.partner_rfc = partners[0].vat || "XAXX010101000";
        order.partner_email = partners[0].email || "";
      } else {
        order.partner_rfc = "XAXX010101000";
        order.partner_email = "";
      }
    }

    // 2. Obtener las líneas de la orden (productos solicitados)
    let lines: any[] = [];
    if (order.order_line && Array.isArray(order.order_line) && order.order_line.length > 0) {
      const fetchedLines = await odoo.executeKw<any[]>(
        "sale.order.line",
        "search_read",
        [[["id", "in", order.order_line]]],
        {
          fields: ["id", "name", "product_id", "product_uom_qty", "price_unit"],
        }
      );
      if (Array.isArray(fetchedLines)) {
        lines = fetchedLines;
      }
    }
    
    // Adjuntamos las líneas hidratadas al objeto de la orden
    order.lines = lines;

    // 3. Obtener adjuntos vinculados a esta orden (ir.attachment en res_model = 'sale.order')
    const attachments = await odoo.executeKw<any[]>(
      "ir.attachment",
      "search_read",
      [[
        ["res_model", "=", "sale.order"], ["res_id", "=", orderId]
      ]],
      {
        fields: ["id", "name", "mimetype", "raw"],
      }
    );

    let validAttachments = Array.isArray(attachments) ? attachments : [];
    
    if (odoo.getIsMockMode() && validAttachments.length === 0) {
      validAttachments = [{
        id: 999,
        name: "Mock_Logo_Espalda.png",
        mimetype: "image/png",
        raw: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", // 1x1 transparent png
      }];
    }

    return NextResponse.json({
      success: true,
      data: {
        order,
        attachments: validAttachments,
      },
    });
  } catch (error: any) {
    console.error("Error fetching sale.order details:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
