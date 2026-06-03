import { NextResponse } from "next/server";
import { odoo } from "@/lib/odoo-client";

export async function GET() {
  try {
    const base64Pixel = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
    
    // Create with 'datas'
    const id1 = await odoo.executeKw("ir.attachment", "create", [[{
      name: "test_datas.png",
      type: "binary",
      datas: base64Pixel,
    }]]);

    // Create with 'raw'
    const id2 = await odoo.executeKw("ir.attachment", "create", [[{
      name: "test_raw.png",
      type: "binary",
      raw: base64Pixel,
    }]]);

    // Read them back
    const read1 = await odoo.executeKw("ir.attachment", "read", [[id1]], { fields: ["checksum", "datas", "raw"] });
    const read2 = await odoo.executeKw("ir.attachment", "read", [[id2]], { fields: ["checksum", "datas", "raw"] });

    return NextResponse.json({ success: true, test1: read1, test2: read2 });
  } catch(e: any) {
    return NextResponse.json({ success: false, error: e.message });
  }
}
