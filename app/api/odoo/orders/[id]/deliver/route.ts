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
    return NextResponse.json({ success: false, error: "ID inválido" }, { status: 400 });
  }

  let body;
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json({ success: false, error: "JSON inválido" }, { status: 400 });
  }

  const { paymentMethodId, paymentPolicy, usoCfdi, email } = body;
  
  if (!paymentMethodId || !paymentPolicy || !usoCfdi) {
    return NextResponse.json({ success: false, error: "Faltan datos fiscales requeridos" }, { status: 400 });
  }

  try {
    // 1. Obtener datos de la orden (para el nombre, usado en stock.picking)
    const orders = await odoo.executeKw<any[]>(
      "sale.order",
      "search_read",
      [[["id", "=", orderId]]],
      { fields: ["name", "state", "partner_id"], limit: 1 }
    );
    if (!orders || orders.length === 0) {
      return NextResponse.json({ success: false, error: "Orden no encontrada" }, { status: 404 });
    }
    const order = orders[0];

    // 2. Actualizar Sale Order con los últimos datos fiscales de pago
    await odoo.executeKw("sale.order", "write", [
      [orderId],
      {
        l10n_mx_edi_payment_method_id: paymentMethodId,
        l10n_mx_edi_payment_policy: paymentPolicy,
      }
    ]);

    // 3. Logística: Encontrar y validar el stock.picking (Entrega)
    const pickings = await odoo.executeKw<any[]>(
      "stock.picking",
      "search_read",
      [[
        ["origin", "=", order.name],
        ["state", "not in", ["done", "cancel"]]
      ]],
      { fields: ["id", "state", "move_ids"] }
    );

    if (pickings && pickings.length > 0) {
      const pickingIds = pickings.map(p => p.id);
      
      // Obtener los movimientos de stock para forzar las cantidades entregadas
      const moveIds = pickings.flatMap(p => p.move_ids || []);
      if (moveIds.length > 0) {
        const moves = await odoo.executeKw<any[]>("stock.move", "search_read", [[["id", "in", moveIds]]], { fields: ["id", "product_uom_qty"] });
        for (const move of moves) {
          try {
            await odoo.executeKw("stock.move", "write", [[move.id], { quantity: move.product_uom_qty }]);
          } catch (e) {
            console.warn(`[Odoo] No se pudo escribir quantity en move ${move.id}`, e);
          }
        }
      }

      // Validar el picking, saltando backorders y transferencias inmediatas por contexto
      await odoo.executeKw("stock.picking", "button_validate", [pickingIds], {
        context: {
          skip_backorder: true,
          skip_immediate: true
        }
      });
    }

    // 4. Finanzas: Crear la Factura usando el Wizard
    const wizardResult = await odoo.executeKw<any>("sale.advance.payment.inv", "create", [
      [{ advance_payment_method: "delivered" }]
    ], { context: { active_ids: [orderId], active_model: "sale.order" } });

    const wizardId = Array.isArray(wizardResult) ? wizardResult[0] : wizardResult;

    const invoiceResult = await odoo.executeKw<any>("sale.advance.payment.inv", "create_invoices", [
      [wizardId]
    ], { context: { active_ids: [orderId], active_model: "sale.order" } });
    
    // Si retorna un array de IDs de facturas, tomamos la primera
    let invoiceIds: number[] = [];
    if (Array.isArray(invoiceResult) && typeof invoiceResult[0] === 'number') {
        invoiceIds = invoiceResult;
    } else if (invoiceResult && invoiceResult.res_id) {
        invoiceIds = [invoiceResult.res_id]; // Si retorna un action dictionary
    } else if (invoiceResult && invoiceResult.id) {
        invoiceIds = [invoiceResult.id]; 
    } else {
        // En caso de que no devuelva la factura, la buscamos por su origen
        const orderInvoices = await odoo.executeKw<any[]>("account.move", "search", [[["invoice_origin", "=", order.name]]]);
        invoiceIds = orderInvoices;
    }

    let timbradoSuccess = true;
    let timbradoErrorMsg = null;

    if (invoiceIds.length > 0) {
      const invoiceId = invoiceIds[0];
      
      // Actualizar la factura con el Uso de CFDI (este campo generalmente va en la factura)
      // Odoo 16/17/18 utiliza l10n_mx_edi_usage para el Uso CFDI en account.move
      await odoo.executeKw("account.move", "write", [
        [invoiceId],
        { l10n_mx_edi_usage: usoCfdi }
      ]);

      // Intentar publicar (y timbrar) la factura
      try {
        await odoo.executeKw("account.move", "action_post", [[invoiceId]]);
        
        // Actualizar el correo del cliente (inyectando uno falso si no hay) para forzar el flujo del Wizard
        const targetEmail = email && email.trim() !== "" ? email : "facturacion@masbordados.local";
        if (order.partner_id && order.partner_id[0]) {
            await odoo.executeKw("res.partner", "write", [[order.partner_id[0]], { email: targetEmail }]);
        }

        // Forzar el timbrado electrónico síncrono enviando el correo (Odoo 17+)
        const wizardIdResult = await odoo.executeKw("account.move.send.wizard", "create", [[{
            move_id: invoiceId
        }]], { context: { active_model: "account.move", active_ids: [invoiceId] } });

        const wizardId = Array.isArray(wizardIdResult) ? wizardIdResult[0] : wizardIdResult;

        await odoo.executeKw("account.move.send.wizard", "action_send_and_print", [[wizardId]]);

      } catch (postError: any) {
        console.error("⚠️ [BFF Deliver] Error al timbrar factura:", postError.message);
        timbradoSuccess = false;
        timbradoErrorMsg = postError.message;
      }
    } else {
        timbradoSuccess = false;
        timbradoErrorMsg = "No se pudo identificar el ID de la factura creada.";
    }

    // 5. Mover Kanban a "Entregado"
    // Removemos el Tag 3 (Terminado)
    await odoo.executeKw("sale.order", "write", [
        [orderId],
        { tag_ids: [[3, 3, 0]] } // Comando 3: remove link
    ]);

    if (!timbradoSuccess) {
      return NextResponse.json({
        success: true,
        warning: true,
        invoiceId: invoiceIds.length > 0 ? invoiceIds[0] : null,
        message: `Logística completada y factura generada en Borrador, pero falló el timbrado SAT: ${timbradoErrorMsg}`
      });
    }

    return NextResponse.json({ success: true, invoiceId: invoiceIds[0], message: "Orden entregada y facturada correctamente." });

  } catch (error: any) {
    console.error("❌ [BFF Deliver] Fallo general:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
