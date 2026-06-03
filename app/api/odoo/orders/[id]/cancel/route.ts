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
    // 1. Ejecutar acción de cancelación
    await odoo.executeKw("sale.order", "action_cancel", [[orderId]]);

    // 2. Remover etiquetas del Kanban (tag_ids = 6, 0, [])
    await odoo.executeKw("sale.order", "write", [
      [orderId],
      { tag_ids: [[6, 0, []]] }
    ]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error cancelando la orden en Odoo:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
