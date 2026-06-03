async function run() {
  try {
    const url = "https://axizstudios1.odoo.com/my/invoices/24?access_token=55adcb4d-b5b9-41ac-b60b-53ce8b0a321d&report_type=pdf";
    const pdfRes = await fetch(url);
    console.log("PDF Response status:", pdfRes.status);
    if (pdfRes.ok) {
        const buf = await pdfRes.arrayBuffer();
        console.log("PDF length:", buf.byteLength);
        const prefix = Buffer.from(buf).toString('utf-8', 0, 5);
        console.log("Prefix:", prefix);
    } else {
        console.log("Failed to fetch:", await pdfRes.text());
    }

  } catch (e) {
    console.error(e);
  }
}
run();
