import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { odoo } from "@/lib/odoo-client";

export async function POST(
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
    return NextResponse.json({ success: false, error: "ID de orden inválido" }, { status: 400 });
  }

  try {
    const body: { method: "percentage" | "fixed", amount: number } = await req.json();
    if (!body.method || !body.amount) {
      return NextResponse.json({ success: false, error: "Faltan parámetros del anticipo" }, { status: 400 });
    }

    // 1. Crear el asistente de anticipo
    const wizardId = await odoo.executeKw<number>("sale.advance.payment.inv", "create", [[{
      advance_payment_method: body.method,
      amount: body.amount
    }]], {
      context: { active_model: "sale.order", active_ids: [orderId], active_id: orderId }
    });

    // 2. Ejecutar la creación de facturas
    await odoo.executeKw("sale.advance.payment.inv", "create_invoices", [[wizardId]], {
      context: { active_model: "sale.order", active_ids: [orderId], active_id: orderId }
    });

    // 3. Buscar la factura recién creada en estado 'draft' asociada a la orden
    const invoices = await odoo.executeKw<any[]>("account.move", "search_read", [
      [["invoice_origin", "ilike", "SO%"], ["state", "=", "draft"]]
    ], {
      fields: ["id", "name", "invoice_origin", "state"],
      limit: 10,
      order: "id desc"
    });

    // Validamos qué factura le pertenece a esta orden obteniendo el name de la sale.order
    const orderData = await odoo.executeKw<any[]>("sale.order", "search_read", [[["id", "=", orderId]]], { fields: ["name"], limit: 1 });
    const orderName = orderData[0]?.name;

    if (orderName) {
      const draftInvoice = invoices.find(inv => inv.invoice_origin?.includes(orderName));
      if (draftInvoice) {
        // Postear (Confirmar) la factura de anticipo
        await odoo.executeKw("account.move", "action_post", [[draftInvoice.id]]);
        console.log(`Factura de anticipo ${draftInvoice.id} posteada para la orden ${orderName}`);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error procesando el anticipo en Odoo:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
