import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { odoo } from "@/lib/odoo-client";
import { CustomerProfile, OrderCartItem } from "@/types/order";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body: { customer: CustomerProfile; items: OrderCartItem[] } = await req.json();
    
    if (!body.customer || !body.items || body.items.length === 0) {
      return NextResponse.json({ success: false, error: "Faltan datos del cliente o prendas" }, { status: 400 });
    }

    // Preparar las líneas de pedido de venta en formato Odoo [(0, 0, { values })]
    // 0 = Comando Odoo para "Crear un nuevo registro y vincularlo"
    const orderLines = body.items.map((item) => {
      return [
        0, 
        0, 
        {
          product_id: parseInt(item.garment.id, 10), // ID de la prenda (product.product)
          name: `[BORDADO] ${item.designName} - Notas: ${item.notes || "N/A"}`, // Descripción de la línea
          product_uom_qty: item.quantity,
          // En un caso real, el precio unitario se calcula con reglas de lista de precios,
          // o se manda explícitamente si el BFF tiene esa responsabilidad.
        }
      ];
    });

    // Preparar la cabecera de la orden
    const orderData = {
      partner_id: parseInt(body.customer.id, 10),
      order_line: orderLines,
      // Si tenemos un campo personalizado para Uso CFDI a nivel orden en Odoo:
      // l10n_mx_edi_usage: body.items[0].usoCfdi,
      note: "Orden generada desde portal Headless ERP",
    };

    // Crear la orden de venta (sale.order) en Odoo
    // Esto creará automáticamente las sale.order.line asociadas
    const newOrderId = await odoo.executeKw<number>(
      "sale.order",
      "create",
      [orderData]
    );

    // Opcionalmente, confirmamos la orden si el flujo del negocio lo dicta
    // await odoo.executeKw("sale.order", "action_confirm", [[newOrderId]]);

    return NextResponse.json({ success: true, orderId: newOrderId });
  } catch (error: any) {
    console.error("Error creating order in Odoo:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
