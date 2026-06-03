# Refactorización Mayor Headless ERP - Odoo

Este plan detalla la implementación de las 5 Misiones Críticas solicitadas para alinear el Headless ERP con las reglas nativas de Odoo SaaS.

> [!WARNING]
> **Campos Personalizados en Odoo**
> La Misión 1 asume que el campo `x_cajero` existe en `sale.order`.
> La Misión 2 asume que los campos `x_ubicacion_logo` y `x_instrucciones_bordado` existen en el modelo `sale.order.line`. 
> Si estos campos no existen en tu base de datos de Odoo, la API fallará al crear la orden. Por favor, asegúrate de crearlos con Odoo Studio o el modo desarrollador antes de aprobar este plan.

## Proposed Changes

---

### Misión 1: Identidad y Reglas de Tiempo (Trazabilidad)

#### [MODIFY] [nueva-orden/page.tsx](file:///C:/DEV/headless-erp-odoo/app/dashboard/nueva-orden/page.tsx)
- Añadir estado `validityDate` usando `DatePicker` de Ant Design.
- Enviar `validityDate` en el payload a `/api/odoo/orders`.

#### [MODIFY] [orders/route.ts](file:///C:/DEV/headless-erp-odoo/app/api/odoo/orders/route.ts)
- Leer `session.user.name` del servidor y mapearlo a `x_cajero`.
- Mapear `validityDate` recibido a `validity_date` nativo de `sale.order`.

---

### Misión 2: Personalización Estructurada

#### [MODIFY] [types/order.d.ts](file:///C:/DEV/headless-erp-odoo/types/order.d.ts)
- Eliminar `notes?: string`.
- Agregar `ubicacionLogo?: string` e `instruccionesBordado?: string`.

#### [MODIFY] [nueva-orden/page.tsx](file:///C:/DEV/headless-erp-odoo/app/dashboard/nueva-orden/page.tsx)
- Actualizar el `itemSchema` de Zod.
- Reemplazar el input de notas con un `<Select>` para la ubicación y un `<TextArea>` para las instrucciones de bordado.

#### [MODIFY] [orders/route.ts](file:///C:/DEV/headless-erp-odoo/app/api/odoo/orders/route.ts)
- Mapear estos campos hacia `x_ubicacion_logo` y `x_instrucciones_bordado` en los `values` de `order_line` (índice 2).

---

### Misión 3: Corrección del Ciclo de Vida (Draft, Confirm & Cancel)

#### [MODIFY] [orders/route.ts](file:///C:/DEV/headless-erp-odoo/app/api/odoo/orders/route.ts)
- Remover la llamada a `action_confirm` para que la orden nazca como "Presupuesto" (`draft`).

#### [MODIFY] [production/route.ts](file:///C:/DEV/headless-erp-odoo/app/api/odoo/production/route.ts)
- **CRÍTICO:** Actualizar el dominio de `search_read` para incluir órdenes en estado `draft` y `sent`, de lo contrario, las órdenes nuevas (Presupuestos) no aparecerán en la columna de Pendientes del Kanban.
- Inyectar `await odoo.executeKw("sale.order", "action_confirm", [[orderId]]);` dentro de la lógica `action === "start_production"`.

#### [NEW] [orders/[id]/cancel/route.ts](file:///C:/DEV/headless-erp-odoo/app/api/odoo/orders/[id]/cancel/route.ts)
- Crear el endpoint para ejecutar `action_cancel` sobre `sale.order` y remover la etiqueta `tag_ids`.

#### [MODIFY] [dashboard/page.tsx](file:///C:/DEV/headless-erp-odoo/app/dashboard/page.tsx)
- Añadir botón de "Cancelar Cotización" (color rojo) en las tarjetas de la columna "Pendiente de Asignar".

---

### Misión 4: Control Financiero de Anticipos

#### [NEW] [orders/[id]/advance/route.ts](file:///C:/DEV/headless-erp-odoo/app/api/odoo/orders/[id]/advance/route.ts)
- Endpoint que recibe el método (porcentaje/fijo) y el monto.
- Ejecuta `sale.advance.payment.inv` (wizard) usando XML-RPC.
- Ejecuta `create_invoices` para generar la factura de anticipo.
- Busca la nueva factura en estado `draft` asociada a la orden y ejecuta `action_post`.

#### [NEW] [components/AdvanceModal.tsx](file:///C:/DEV/headless-erp-odoo/components/AdvanceModal.tsx)
- Modal para capturar si el anticipo es % o $ fijo.
- Valida la creación e invoca el endpoint anterior.

#### [MODIFY] [dashboard/page.tsx](file:///C:/DEV/headless-erp-odoo/app/dashboard/page.tsx)
- Reemplazar la acción directa del botón "Iniciar Prod." para que primero abra el `<AdvanceModal>`.
- Al recibir confirmación exitosa del pago de anticipo, mover la orden a Producción.

---

### Misión 5: Botón Estratégico de WhatsApp

#### [MODIFY] [orders/[id]/page.tsx](file:///C:/DEV/headless-erp-odoo/app/dashboard/orders/[id]/page.tsx)
- Añadir botón Verde llamativo "Enviar por WhatsApp".
- Generar la URL dinámica `https://wa.me/?text=...` utilizando el nombre del cliente y de la orden cargados desde Odoo.

## Verification Plan
1. **Compilación:** Ejecutar `tsc --noEmit` y asegurar que no haya conflictos de tipos con los nuevos campos de prendas.
2. **Ciclo Completo:** Crear una orden de prueba (verificar que quede en draft), registrar anticipo (verificar factura generada y posteada en Odoo), mover a producción (verificar confirmación de inventario).
