"use client";

import React, { useState, useEffect } from "react";
import { Modal, Select, Button, notification, Spin, Input } from "antd";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface DeliverModalProps {
  isOpen: boolean;
  orderId: number | null;
  onClose: () => void;
}

export default function DeliverModal({ isOpen, orderId, onClose }: DeliverModalProps) {
  const [api, contextHolder] = notification.useNotification();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [paymentMethodId, setPaymentMethodId] = useState<number | null>(null);
  const [paymentPolicy, setPaymentPolicy] = useState<string>("PUE");
  const [usoCfdi, setUsoCfdi] = useState<string>("G03"); // Gastos en general por defecto
  const [email, setEmail] = useState<string>("");

  // 1. Fetch de catálogos
  const { data: satMethods } = useQuery({
    queryKey: ["odoo", "sat", "payment_methods"],
    queryFn: async () => {
      const res = await fetch("/api/odoo/sat/payment_methods");
      if (!res.ok) throw new Error("Error al cargar métodos de pago");
      const data = await res.json();
      return data.catalog as { id: number; name: string }[];
    },
    staleTime: 24 * 60 * 60 * 1000,
  });

  const { data: usoCfdiCatalog } = useQuery({
    queryKey: ["odoo", "sat", "usocfdi"],
    queryFn: async () => {
      const res = await fetch("/api/odoo/sat/usocfdi");
      if (!res.ok) throw new Error("Error al cargar Uso de CFDI");
      const data = await res.json();
      return data.catalog as { code: string; name: string }[];
    },
    staleTime: 24 * 60 * 60 * 1000,
  });

  // 2. Fetch de datos actuales de la orden
  const { data: orderDetails, isLoading: isLoadingOrder } = useQuery({
    queryKey: ["odoo", "order", orderId],
    queryFn: async () => {
      if (!orderId) return null;
      const res = await fetch(`/api/odoo/orders/${orderId}`);
      if (!res.ok) throw new Error("Error cargando orden");
      const data = await res.json();
      return data.data.order;
    },
    enabled: !!orderId && isOpen,
  });

  // Pre-cargar estado cuando llega la orden
  useEffect(() => {
    if (orderDetails) {
      if (orderDetails.l10n_mx_edi_payment_method_id) {
        setPaymentMethodId(orderDetails.l10n_mx_edi_payment_method_id[0]);
      }
      if (orderDetails.l10n_mx_edi_payment_policy) {
        setPaymentPolicy(orderDetails.l10n_mx_edi_payment_policy);
      }
      if (orderDetails.partner_rfc === "XAXX010101000") {
        setUsoCfdi("S01");
      }
      if (orderDetails.partner_email) {
        setEmail(orderDetails.partner_email);
      }
    }
  }, [orderDetails]);

  const isPublicoGeneral = orderDetails?.partner_rfc === "XAXX010101000";

  const handleDeliver = async () => {
    if (!paymentMethodId || !paymentPolicy || !usoCfdi) {
      api.warning({ title: "Por favor completa todos los campos fiscales." });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/odoo/orders/${orderId}/deliver`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethodId,
          paymentPolicy,
          usoCfdi,
          email,
        }),
      });

      const data = await res.json();
      
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al procesar entrega.");
      }

      if (data.warning) {
        api.warning({
          title: "Entrega Completada (Factura Pendiente)",
          description: data.message,
          duration: 10,
        });
      } else {
        const btn = data.invoiceId ? (
          <Button 
            type="primary" 
            className="bg-emerald-600"
            onClick={async () => {
              try {
                const pdfRes = await fetch(`/api/odoo/invoices/${data.invoiceId}/pdf`);
                const pdfData = await pdfRes.json();
                if (pdfData.success && pdfData.pdf) {
                  const byteCharacters = atob(pdfData.pdf.data);
                  const byteNumbers = new Array(byteCharacters.length);
                  for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                  }
                  const byteArray = new Uint8Array(byteNumbers);
                  const blob = new Blob([byteArray], { type: "application/pdf" });
                  
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = pdfData.pdf.name || `Factura_${data.invoiceId}.pdf`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  window.URL.revokeObjectURL(url);
                } else {
                  api.error({ title: "No se pudo obtener el PDF", description: pdfData.error });
                }
              } catch (e: any) {
                api.error({ title: "Error de red al descargar PDF", description: e.message });
              }
            }}
          >
            Descargar Factura (PDF)
          </Button>
        ) : undefined;

        api.success({
          title: "Operación Exitosa",
          description: "Orden Entregada y Factura Timbrada con éxito.",
          actions: btn,
          duration: 0,
        });
      }

      queryClient.invalidateQueries({ queryKey: ["odoo", "production"] });
      onClose();
    } catch (error: any) {
      api.error({
        title: "Error de Ejecución",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Entregar y Facturar"
      open={isOpen}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose} disabled={loading}>
          Cancelar
        </Button>,
        <Button 
          key="submit" 
          type="primary" 
          loading={loading} 
          onClick={handleDeliver}
          className="bg-emerald-600 hover:bg-emerald-500"
        >
          Confirmar Cierre Operativo
        </Button>,
      ]}
    >
      {contextHolder}
      {isLoadingOrder ? (
        <div className="flex justify-center p-8"><Spin /></div>
      ) : (
        <div className="flex flex-col gap-4 mt-4">
          <p className="text-slate-600 text-sm">
            Verifica los datos fiscales antes de generar el CFDI. Estos datos se aplicarán a la factura final.
          </p>

          <div className="mb-4">
            <label className="block text-slate-700 font-semibold text-xs uppercase tracking-wider mb-2">
              Correo Electrónico (Para Factura)
            </label>
            <Input
              className="w-full"
              size="large"
              placeholder="Opcional (Ej. ejemplo@dominio.com)"
              value={email}
              onChange={(e: any) => setEmail(e.target.value)}
            />
            <p className="text-xs text-slate-400 mt-1">Si se deja vacío, se usará un correo interno para forzar el timbrado.</p>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">MÉTODO DE PAGO (SAT)</label>
            <Select
              className="w-full"
              value={paymentMethodId}
              onChange={setPaymentMethodId}
              options={satMethods?.map(m => ({ value: m.id, label: m.name }))}
              placeholder="Selecciona método..."
            />
          </div>

          <div className="mb-4">
            <label className="block text-slate-700 font-semibold text-xs uppercase tracking-wider mb-2">
              Uso de CFDI
            </label>
            <Select
              className="w-full"
              size="large"
              disabled={isPublicoGeneral}
              value={usoCfdi}
              onChange={(val) => setUsoCfdi(val)}
              options={(usoCfdiCatalog || []).map((c: any) => ({
                value: c.code,
                label: `[${c.code}] ${c.name}`,
              }))}
            />
            {isPublicoGeneral && (
              <p className="text-xs text-amber-600 mt-1">
                Uso CFDI bloqueado a S01 por tratarse de Público en General.
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 mb-1 block">FORMA DE PAGO (PUE/PPD)</label>
            <Select
              className="w-full"
              value={paymentPolicy}
              onChange={setPaymentPolicy}
              options={[
                { value: "PUE", label: "PUE - Pago en una sola exhibición" },
                { value: "PPD", label: "PPD - Pago en parcialidades o diferido" },
              ]}
            />
          </div>

        </div>
      )}
    </Modal>
  );
}
