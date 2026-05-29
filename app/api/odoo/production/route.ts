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
    const records = await odoo.executeKw<any[]>(
      "mrp.production",
      "search_read",
      [[["state", "in", ["confirmed", "progress", "done"]]]],
      {
        fields: ["id", "name", "product_id", "qty_producing", "state", "date_planned_start"],
        limit: 100,
        order: "date_planned_start asc",
      }
    );

    return NextResponse.json({ success: true, data: records });
  } catch (error: any) {
    console.error("Error fetching mrp.production from Odoo:", error);
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

    let odooMethod = "";
    
    // Mapeamos nuestra acción de Kanban estricta al método real de Odoo
    if (action === "start_production") {
      // De 'Pendiente' a 'En Producción'
      // Odoo v14+ usualmente usa button_plan (o directamente al consumir)
      // Para efectos de este BFF, invocamos la acción que lo moverá a 'progress'
      odooMethod = "button_plan"; 
    } else if (action === "mark_done") {
      // De 'En Producción' a 'Terminado'
      odooMethod = "button_mark_done";
    } else {
      return NextResponse.json({ success: false, error: "Acción no válida" }, { status: 400 });
    }

    // Ejecutar el método en el modelo Odoo, pasando el ID de la orden en una lista de listas [[id]]
    const result = await odoo.executeKw(
      "mrp.production",
      odooMethod,
      [[orderId]]
    );

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error("Error updating mrp.production in Odoo:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
