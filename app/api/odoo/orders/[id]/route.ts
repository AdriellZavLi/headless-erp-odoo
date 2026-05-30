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
        fields: ["id", "name", "order_line", "state", "date_order", "tag_ids"],
        limit: 1,
      }
    );

    if (!orders || orders.length === 0) {
      return NextResponse.json({ success: false, error: "Orden no encontrada" }, { status: 404 });
    }

    const order = orders[0];

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
        "&", ["res_model", "=", "sale.order"], ["res_id", "=", orderId],
      ]],
      {
        fields: ["id", "name", "mimetype", "datas"],
      }
    );

    let validAttachments = Array.isArray(attachments) ? attachments : [];
    
    if (odoo.getIsMockMode() && validAttachments.length === 0) {
      validAttachments = [{
        id: 999,
        name: "Mock_Logo_Espalda.png",
        mimetype: "image/png",
        datas: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", // 1x1 transparent png
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
