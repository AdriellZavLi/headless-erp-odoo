import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const catalog = [
    { id: "CUST-001", name: "Distribuidora MasBordados Toluca", rfc: "DMB180326H30", email: "contacto@dmbtoluca.com", zipCode: "50000" },
    { id: "CUST-002", name: "Uniformes Escolares del Centro", rfc: "UEC150410X12", email: "ventas@uniformescentro.mx", zipCode: "50010" },
    { id: "CUST-003", name: "Corporativo Industrial Alfa", rfc: "CIA991201KL9", email: "compras@alfa.com", zipCode: "50200" },
    { id: "CUST-004", name: "Boutique Textil La Elegancia", rfc: "BTE880512MN3", email: "pedidos@laelegancia.com", zipCode: "50100" },
    { id: "CUST-005", name: "Agencia de Marketing Creacional", rfc: "AMC200101XY7", email: "hola@creacional.mx", zipCode: "50300" },
  ];

  return NextResponse.json({ success: true, catalog });
}
