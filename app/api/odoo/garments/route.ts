import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const catalog = [
    { id: "GAR-001", garmentType: "Polo", color: "Azul Marino", size: "S", claveProdServ: "53101602" },
    { id: "GAR-002", garmentType: "Polo", color: "Azul Marino", size: "M", claveProdServ: "53101602" },
    { id: "GAR-003", garmentType: "Polo", color: "Azul Marino", size: "L", claveProdServ: "53101602" },
    { id: "GAR-004", garmentType: "Polo", color: "Blanco", size: "M", claveProdServ: "53101602" },
    { id: "GAR-005", garmentType: "Camisa de Vestir", color: "Celeste", size: "L", claveProdServ: "53101602" },
    { id: "GAR-006", garmentType: "Camisa de Vestir", color: "Blanco", size: "XL", claveProdServ: "53101602" },
    { id: "GAR-007", garmentType: "Pantalón", color: "Negro", size: "32", claveProdServ: "53101501" },
    { id: "GAR-008", garmentType: "Pantalón", color: "Negro", size: "34", claveProdServ: "53101501" },
    { id: "GAR-009", garmentType: "Gorra", color: "Rojo", size: "Unitalla", claveProdServ: "53102500" },
    { id: "GAR-010", garmentType: "Gorra", color: "Negro", size: "Unitalla", claveProdServ: "53102500" },
  ];

  return NextResponse.json({ success: true, catalog });
}
