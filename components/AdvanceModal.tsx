"use client";

import React, { useState } from "react";
import { Modal, Form, Radio, InputNumber, Button, notification } from "antd";
import { DollarOutlined, PercentageOutlined } from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";

interface AdvanceModalProps {
  isOpen: boolean;
  orderId: number | null;
  onClose: () => void;
  onSuccess: (orderId: number) => void;
}

export default function AdvanceModal({ isOpen, orderId, onClose, onSuccess }: AdvanceModalProps) {
  const [form] = Form.useForm();
  const [api, contextHolder] = notification.useNotification();
  const [method, setMethod] = useState<"percentage" | "fixed">("percentage");

  const advanceMutation = useMutation({
    mutationFn: async (payload: { method: string, amount: number }) => {
      const res = await fetch(`/api/odoo/orders/${orderId}/advance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Error registrando anticipo");
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      api.success({
        title: "Anticipo Registrado",
        description: "Se ha generado y validado la factura de anticipo en Odoo.",
        placement: "topRight"
      });
      if (orderId) {
        onSuccess(orderId);
      }
      form.resetFields();
      onClose();
    },
    onError: (error: any) => {
      api.error({
        title: "Error Financiero",
        description: error.message || "No se pudo procesar el anticipo.",
        placement: "topRight"
      });
    }
  });

  const handleFinish = (values: any) => {
    advanceMutation.mutate({
      method: values.method,
      amount: values.amount
    });
  };

  return (
    <>
      {contextHolder}
      <Modal
        title={
          <span className="flex items-center gap-2 text-slate-800">
            <DollarOutlined className="text-emerald-600" />
            Registrar Anticipo Financiero
          </span>
        }
        open={isOpen}
        onCancel={onClose}
        footer={null}
        destroyOnHidden
      >
        <div className="bg-amber-50 text-amber-800 p-3 rounded-lg text-sm mb-4 border border-amber-200">
          <strong>Regla de Negocio:</strong> Es mandatorio registrar el anticipo del cliente antes de confirmar la orden de trabajo en almacén y arrancar la producción.
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          initialValues={{ method: "percentage", amount: 50 }}
          onValuesChange={(changedValues) => {
            if (changedValues.method) {
              setMethod(changedValues.method);
            }
          }}
        >
          <Form.Item name="method" label="Método de Anticipo">
            <Radio.Group buttonStyle="solid" className="w-full flex">
              <Radio.Button value="percentage" className="flex-1 text-center">
                <PercentageOutlined /> Porcentaje (%)
              </Radio.Button>
              <Radio.Button value="fixed" className="flex-1 text-center">
                <DollarOutlined /> Monto Fijo ($)
              </Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Form.Item 
            name="amount" 
            label={method === "percentage" ? "Porcentaje (%)" : "Monto de Anticipo ($)"}
            rules={[{ required: true, message: "Ingrese el monto" }]}
          >
            <InputNumber 
              size="large"
              className="w-full rounded-xl"
              min={1}
              max={method === "percentage" ? 100 : undefined}
              prefix={method === "fixed" ? "$" : ""}
              suffix={method === "percentage" ? "%" : ""}
            />
          </Form.Item>

          <div className="flex justify-end gap-2 mt-6">
            <Button onClick={onClose} size="large" className="rounded-xl">Cancelar</Button>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={advanceMutation.isPending}
              size="large"
              className="rounded-xl bg-emerald-600 border-none font-bold shadow-lg shadow-emerald-500/20"
            >
              Confirmar e Iniciar Producción
            </Button>
          </div>
        </Form>
      </Modal>
    </>
  );
}
