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

    const orderRes = await fetch("https://axizstudios1.odoo.com/jsonrpc", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
      jsonrpc: "2.0", method: "call", id: 2, params: {
        service: "object", method: "execute_kw", args: [
          "axizstudios1", uid, "81d1908cb52f6cc6cef4453bcb934da8e3a2100f",
          "sale.order", "search_read", [ [] ], { fields: ["id", "name", "x_cajero"], limit: 5, order: "id desc" }
        ]
      }
    }) });
    const orders = (await orderRes.json()).result;
    console.log("Recent Orders x_cajero values:");
    console.log(orders);
  } catch (e) {
    console.error(e);
  }
}
run();
