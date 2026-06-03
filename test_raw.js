async function run() {
  try {
    // 1. Authenticate
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
    
    console.log("Authenticating...");
    const authRes = await fetch("https://axizstudios1.odoo.com/jsonrpc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(authPayload)
    });
    const authData = await authRes.json();
    console.log("Auth Data:", authData);
    const uid = authData.result;
    
    if (!uid) {
        console.error("Auth failed");
        return;
    }

    // 2. Test payment terms
    const ptPayload = {
      jsonrpc: "2.0",
      method: "call",
      params: {
        service: "object",
        method: "execute_kw",
        args: [
          "axizstudios1",
          uid,
          "81d1908cb52f6cc6cef4453bcb934da8e3a2100f",
          "account.payment.term",
          "search_read",
          [[]],
          { fields: ["id", "name"], limit: 50 }
        ]
      },
      id: 2
    };

    console.log("Testing payment terms...");
    const ptRes = await fetch("https://axizstudios1.odoo.com/jsonrpc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ptPayload)
    });
    const ptData = await ptRes.json();
    console.log("Payment Terms Data:", ptData.error || ptData.result);

    // 3. Test SAT payment methods
    const satPayload = {
      jsonrpc: "2.0",
      method: "call",
      params: {
        service: "object",
        method: "execute_kw",
        args: [
          "axizstudios1",
          uid,
          "81d1908cb52f6cc6cef4453bcb934da8e3a2100f",
          "l10n_mx_edi.payment.method",
          "search_read",
          [[]],
          { fields: ["id", "name"], limit: 50 }
        ]
      },
      id: 3
    };

    console.log("Testing SAT payment methods...");
    const satRes = await fetch("https://axizstudios1.odoo.com/jsonrpc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(satPayload)
    });
    const satData = await satRes.json();
    console.log("SAT Payment Methods Data:", satData.error || satData.result);

  } catch(e) {
    console.error(e);
  }
}
run();
