import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { odoo } from "@/lib/odoo-client";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Obtener órdenes de venta confirmadas (sale o done)
    const records = await odoo.executeKw<any[]>(
      "sale.order",
      "search_read",
      [[["state", "in", ["sale", "done"]]]],
      {
        fields: ["id", "name", "order_line", "state", "date_order", "tag_ids"],
        limit: 100,
        order: "date_order asc",
      }
    );

    // 2. Extraer todos los IDs de order_line de todas las órdenes para consultarlos en bloque
    const allLineIds = records.reduce((acc: number[], order) => {
      if (order.order_line && Array.isArray(order.order_line)) {
        return acc.concat(order.order_line);
      }
      return acc;
    }, []);

    // 3. Consultar las líneas para obtener las cantidades de cada prenda
    let linesMap: Record<number, number> = {};
    if (allLineIds.length > 0) {
      const lines = await odoo.executeKw<any[]>(
        "sale.order.line",
        "search_read",
        [[["id", "in", allLineIds]]],
        {
          fields: ["id", "product_uom_qty"],
        }
      );
      
      const isMockResponse = !Array.isArray(lines) || (lines.length > 0 && lines[0].success);
      if (!isMockResponse && Array.isArray(lines)) {
        lines.forEach(line => {
          linesMap[line.id] = line.product_uom_qty || 0;
        });
      }
    }

    // 4. Formatear la respuesta adaptada para nuestro frontend del Kanban
    // Reemplazamos qty_producing calculando la suma de las líneas
    const formattedRecords = records.map(order => {
      let totalQty = 0;
      if (order.order_line && Array.isArray(order.order_line)) {
        totalQty = order.order_line.reduce((sum: number, lineId: number) => sum + (linesMap[lineId] || 0), 0);
      }
      
      // Mapeamos los campos para que el Frontend no sufra cambios drásticos
      return {
        id: order.id,
        name: order.name,
        qty_producing: totalQty,
        state: order.state,
        date_planned_start: order.date_order,
        tag_ids: order.tag_ids || [],
      };
    });

    return NextResponse.json({ success: true, data: formattedRecords });
  } catch (error: any) {
    console.error("Error fetching sale.order for Kanban from Odoo:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { orderId, action } = body;

    if (!orderId || !action) {
      return NextResponse.json({ success: false, error: "Faltan parámetros" }, { status: 400 });
    }

    // Mapeamos la acción al ID de la etiqueta
    let targetTagId = null;
    if (action === "start_production") {
      targetTagId = 2; // En Producción
    } else if (action === "mark_done") {
      targetTagId = 3; // Terminado
    } else if (action === "mark_pending") {
      targetTagId = 1; // Pendiente
    } else {
      return NextResponse.json({ success: false, error: "Acción no válida" }, { status: 400 });
    }

    // Usamos el comando 6 de Many2many: reemplazar todas las etiquetas con esta
    const result = await odoo.executeKw(
      "sale.order",
      "write",
      [
        [orderId],
        { tag_ids: [[6, 0, [targetTagId]]] }
      ]
    );

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error("Error updating sale.order tags in Odoo:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
