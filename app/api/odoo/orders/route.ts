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
    const body: { customer: CustomerProfile; items: OrderCartItem[]; commitmentDate?: string | null; paymentTermId?: number | null; paymentMethodId?: number | null; paymentPolicy?: string | null } = await req.json();
    
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
    const orderData: any = {
      partner_id: parseInt(body.customer.id, 10),
      order_line: orderLines,
      // Si tenemos un campo personalizado para Uso CFDI a nivel orden en Odoo:
      // l10n_mx_edi_usage: body.items[0].usoCfdi,
      note: "Orden generada desde portal Headless ERP",
    };

    if (body.commitmentDate) {
      orderData.commitment_date = body.commitmentDate;
    }
    
    if (body.paymentTermId) {
      orderData.payment_term_id = body.paymentTermId;
    }

    if (body.paymentMethodId) {
      orderData.l10n_mx_edi_payment_method_id = body.paymentMethodId;
    }

    if (body.paymentPolicy) {
      orderData.l10n_mx_edi_payment_policy = body.paymentPolicy;
    }

    // Crear la orden de venta (sale.order) en Odoo
    // Esto creará automáticamente las sale.order.line asociadas
    const newOrderId = await odoo.executeKw<number>(
      "sale.order",
      "create",
      [orderData]
    );

    // Procesar adjuntos (logos) si existen
    for (const item of body.items) {
      if (item.logoBase64 && typeof item.logoBase64 === 'string' && item.logoBase64.trim() !== '') {
        const cleanBase64 = item.logoBase64.includes(',') ? item.logoBase64.split(',')[1] : item.logoBase64;
        
        if (cleanBase64.trim() !== '') {
          const attachmentData = {
            name: item.logoName || `logo_orden_${newOrderId}.png`,
            type: "binary",
            raw: cleanBase64,
            res_model: "sale.order",
            res_id: newOrderId,
          };
          try {
            await odoo.executeKw("ir.attachment", "create", [[attachmentData]]);
            console.log(`📎 Adjunto creado exitosamente para la orden ${newOrderId}`);
          } catch (attErr) {
            console.error("Error al crear ir.attachment en Odoo:", attErr);
          }
        }
      }
    }

    // Auto-confirmar la orden de venta
    await odoo.executeKw("sale.order", "action_confirm", [[newOrderId]]);
    
    // Asignar etiqueta inicial "Pendiente" (ID = 1) usando la sintaxis Many2many
    await odoo.executeKw("sale.order", "write", [
      [newOrderId], 
      { tag_ids: [[6, 0, [1]]] }
    ]);

    return NextResponse.json({ success: true, orderId: newOrderId });
  } catch (error: any) {
    console.error("Error creating order in Odoo:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
