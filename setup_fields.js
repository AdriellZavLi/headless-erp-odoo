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

    const queryModel = async (modelName) => {
      const res = await fetch("https://axizstudios1.odoo.com/jsonrpc", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        jsonrpc: "2.0", method: "call", id: 2, params: {
          service: "object", method: "execute_kw", args: [
            "axizstudios1", uid, "81d1908cb52f6cc6cef4453bcb934da8e3a2100f",
            "ir.model", "search_read", [ [["model", "=", modelName]] ], { fields: ["id"], limit: 1 }
          ]
        }
      }) });
      return (await res.json()).result[0].id;
    };

    const saleOrderId = await queryModel("sale.order");
    const saleOrderLineId = await queryModel("sale.order.line");
    console.log("Model IDs:", { saleOrderId, saleOrderLineId });

    // Function to create field
    const createField = async (modelId, name, fieldDesc, ttype) => {
      const res = await fetch("https://axizstudios1.odoo.com/jsonrpc", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        jsonrpc: "2.0", method: "call", id: 3, params: {
          service: "object", method: "execute_kw", args: [
            "axizstudios1", uid, "81d1908cb52f6cc6cef4453bcb934da8e3a2100f",
            "ir.model.fields", "create", [ [{
              name: name,
              model_id: modelId,
              field_description: fieldDesc,
              ttype: ttype,
              state: 'manual'
            }] ]
          ]
        }
      }) });
      const data = await res.json();
      console.log(`Created ${name}:`, data);
    };

    // We can just query if they exist first
    const checkFields = async (modelId, name) => {
      const res = await fetch("https://axizstudios1.odoo.com/jsonrpc", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        jsonrpc: "2.0", method: "call", id: 4, params: {
          service: "object", method: "execute_kw", args: [
            "axizstudios1", uid, "81d1908cb52f6cc6cef4453bcb934da8e3a2100f",
            "ir.model.fields", "search_count", [ [["name", "=", name], ["model_id", "=", modelId]] ]
          ]
        }
      }) });
      return (await res.json()).result > 0;
    };

    if (!(await checkFields(saleOrderId, "x_cajero"))) {
        await createField(saleOrderId, "x_cajero", "Cajero (Headless)", "char");
    } else {
        console.log("x_cajero already exists");
    }

    if (!(await checkFields(saleOrderLineId, "x_ubicacion_logo"))) {
        await createField(saleOrderLineId, "x_ubicacion_logo", "Ubicación del Logo", "char");
    } else {
        console.log("x_ubicacion_logo already exists");
    }

    if (!(await checkFields(saleOrderLineId, "x_instrucciones_bordado"))) {
        await createField(saleOrderLineId, "x_instrucciones_bordado", "Instrucciones de Bordado", "text");
    } else {
        console.log("x_instrucciones_bordado already exists");
    }

  } catch (e) {
    console.error(e);
  }
}
run();
