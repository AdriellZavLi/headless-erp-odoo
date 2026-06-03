async function run() {
  try {
    const authPayload = {
      jsonrpc: "2.0",
      method: "call",
      params: {
        service: "common",
        method: "authenticate",
        args: ["axizstudios1", "raulzavala2006@gmail.com", "81d1908cb52f6cc6cef4453bcb934da8e3a2100f", {}]
      },
      id: 1
    };
    
    const authRes = await fetch("https://axizstudios1.odoo.com/jsonrpc", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(authPayload)
    });
    const uid = (await authRes.json()).result;

    // Get an existing order
    const orderRes = await fetch("https://axizstudios1.odoo.com/jsonrpc", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
      jsonrpc: "2.0", method: "call", id: 2, params: {
        service: "object", method: "execute_kw", args: [
          "axizstudios1", uid, "81d1908cb52f6cc6cef4453bcb934da8e3a2100f",
          "sale.order", "search_read", [ [] ], { fields: ["id", "name", "access_token"], limit: 1, order: "id desc" }
        ]
      }
    }) });
    const order = (await orderRes.json()).result[0];
    console.log("Order:", order);

    const resRun = await fetch("https://axizstudios1.odoo.com/jsonrpc", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
      jsonrpc: "2.0", method: "call", id: 2, params: {
        service: "object", method: "execute_kw", args: [
          "axizstudios1", uid, "81d1908cb52f6cc6cef4453bcb934da8e3a2100f",
          "sale.order", "get_portal_url", [ [order.id] ]
        ]
      }
    }) });
    const portalUrl = (await resRun.json()).result;
    console.log("Portal URL:", portalUrl);

    const pdfUrl = `https://axizstudios1.odoo.com${portalUrl}&report_type=pdf`;
    console.log("PDF URL:", pdfUrl);

    // Try downloading
    const pdfRes = await fetch(pdfUrl);
    console.log("PDF Status:", pdfRes.status);
    const buf = await pdfRes.arrayBuffer();
    console.log("PDF Prefix:", Buffer.from(buf).toString('utf-8', 0, 5));

  } catch (e) {
    console.error(e);
  }
}
run();
