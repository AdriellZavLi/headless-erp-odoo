async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/odoo/test-context');
    const text = await res.text();
    console.log("CONTEXT:", text);
  } catch(e) {
    console.error(e);
  }
}
test();
