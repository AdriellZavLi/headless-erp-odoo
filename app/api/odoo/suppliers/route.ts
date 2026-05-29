import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { odoo } from "@/lib/odoo-client";
import { CustomerProfile as SupplierProfile } from "@/types/order";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const records = await odoo.executeKw<any[]>(
      "res.partner",
      "search_read",
      [[["supplier_rank", ">", 0]]],
      {
        fields: ["id", "name", "vat", "email", "zip"],
        limit: 100,
      }
    );

    const catalog: SupplierProfile[] = records.map((record) => ({
      id: String(record.id),
      name: record.name || "Sin Nombre",
      rfc: record.vat || "XAXX010101000",
      email: record.email || "sin_correo@ejemplo.com",
      zipCode: record.zip || "00000",
    }));

    if (catalog.length === 0) {
       catalog.push({
         id: "SUPP-FALLBACK",
         name: "Proveedor de Hilos S.A. (Odoo Vacío)",
         rfc: "PROV990101XYZ",
         email: "ventas@hilos.com",
         zipCode: "50000"
       });
    }

    return NextResponse.json({ success: true, catalog });
  } catch (error: any) {
    console.error("Error fetching suppliers from Odoo:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    
    // Preparar el payload para Odoo
    const partnerData = {
      name: body.name,
      vat: body.rfc,
      email: body.email,
      zip: body.zipCode,
      supplier_rank: 1, // Lo marcamos como proveedor
      is_company: true,
    };

    // Crear el registro en Odoo
    const newId = await odoo.executeKw<number>(
      "res.partner",
      "create",
      [partnerData]
    );

    return NextResponse.json({ success: true, id: newId });
  } catch (error: any) {
    console.error("Error creating supplier in Odoo:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
