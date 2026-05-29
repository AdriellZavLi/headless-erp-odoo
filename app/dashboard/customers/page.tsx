"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, Button, Modal, Form, Input, notification, Tag } from "antd";
import Link from "next/link";
import { UserOutlined, PlusOutlined, EditOutlined, EyeOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { CustomerProfile } from "@/types/order";

// ─── Zod Schema ─────────────────────────────────────────────────────────────
const customerSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  rfc: z.string().regex(
    /^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/,
    "RFC inválido. Formato: 3-4 letras + 6 dígitos + 3 alfanuméricos"
  ),
  email: z.string().email("Correo electrónico inválido"),
  zipCode: z.string().regex(/^[0-9]{5}$/, "C.P. debe ser de exactamente 5 dígitos"),
});

type CustomerFormData = z.infer<typeof customerSchema>;

// ─── API Fetchers ───────────────────────────────────────────────────────────
const fetchCustomers = async (): Promise<CustomerProfile[]> => {
  const res = await fetch("/api/odoo/customers");
  if (!res.ok) throw new Error("Error al cargar clientes");
  const data = await res.json();
  return data.catalog;
};

const createCustomer = async (data: CustomerFormData) => {
  const res = await fetch("/api/odoo/customers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Error al crear el cliente");
  const result = await res.json();
  if (!result.success) throw new Error(result.error);
  return result;
};

// ─── Component ──────────────────────────────────────────────────────────────
export default function CustomersPage() {
  const queryClient = useQueryClient();
  const [api, contextHolder] = notification.useNotification();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: customers, isLoading, isError } = useQuery({
    queryKey: ["odoo", "customers"],
    queryFn: fetchCustomers,
  });

  const mutation = useMutation({
    mutationFn: createCustomer,
    onSuccess: () => {
      api.success({
        title: "Cliente Creado",
        description: "El cliente ha sido guardado exitosamente en Odoo.",
      });
      queryClient.invalidateQueries({ queryKey: ["odoo", "customers"] });
      setIsModalOpen(false);
      reset();
    },
    onError: (error: any) => {
      api.error({
        title: "Error",
        description: error.message || "No se pudo crear el cliente.",
      });
    },
  });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: { name: "", rfc: "", email: "", zipCode: "" },
  });

  const onSubmit = (data: CustomerFormData) => {
    mutation.mutate(data);
  };

  const columns = [
    {
      title: "Razón Social / Nombre",
      dataIndex: "name",
      key: "name",
      render: (text: string) => <span className="font-bold text-slate-800">{text}</span>,
    },
    {
      title: "RFC",
      dataIndex: "rfc",
      key: "rfc",
      render: (text: string) => <Tag color="blue" className="font-mono">{text}</Tag>,
    },
    {
      title: "Correo Electrónico",
      dataIndex: "email",
      key: "email",
    },
    {
      title: "C.P.",
      dataIndex: "zipCode",
      key: "zipCode",
    },
    {
      title: "Acciones",
      key: "actions",
      render: () => (
        <div className="flex gap-2">
          <Button type="text" icon={<EyeOutlined />} className="text-slate-500 hover:text-violet-600" />
          <Button type="text" icon={<EditOutlined />} className="text-slate-500 hover:text-amber-600" />
        </div>
      ),
    },
  ];

  return (
    <div className="p-8 max-w-[1400px] mx-auto w-full space-y-8 flex-grow">
      {contextHolder}
      
      <header className="w-full bg-white rounded-2xl p-6 flex items-center justify-between border border-slate-200 shadow-sm">
        <div className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-slate-500 hover:text-violet-600 transition-colors duration-200 font-medium text-sm bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 hover:border-violet-200"
          >
            <ArrowLeftOutlined />
            Regresar
          </Link>
          <div className="w-px h-8 bg-slate-200" />
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <UserOutlined className="text-violet-600" />
            Directorio de Clientes
          </h1>
        </div>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          size="large"
          className="bg-violet-600 shadow-md shadow-violet-200 rounded-xl px-6 font-bold"
          onClick={() => setIsModalOpen(true)}
        >
          Nuevo Cliente
        </Button>
      </header>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <Table 
          dataSource={customers} 
          columns={columns} 
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 10 }}
          className="w-full"
        />
      </div>

      {/* Modal Crear Cliente */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-lg font-bold text-slate-800 pb-2 border-b border-slate-100">
            <UserOutlined className="text-violet-600" />
            Registrar Nuevo Cliente
          </div>
        }
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          reset();
        }}
        footer={null}
        destroyOnHidden
      >
        <Form layout="vertical" onFinish={handleSubmit(onSubmit)} className="mt-4">
          <Form.Item 
            label={<span className="font-semibold text-slate-700">Razón Social</span>}
            validateStatus={errors.name ? "error" : ""}
            help={errors.name?.message}
          >
            <Controller
              name="name"
              control={control}
              render={({ field }) => <Input {...field} size="large" className="rounded-xl" placeholder="MasBordados S.A. de C.V." />}
            />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item 
              label={<span className="font-semibold text-slate-700">RFC</span>}
              validateStatus={errors.rfc ? "error" : ""}
              help={errors.rfc?.message}
            >
              <Controller
                name="rfc"
                control={control}
                render={({ field }) => (
                  <Input 
                    {...field} 
                    size="large" 
                    className="rounded-xl font-mono uppercase" 
                    placeholder="MAS180326H30" 
                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                  />
                )}
              />
            </Form.Item>

            <Form.Item 
              label={<span className="font-semibold text-slate-700">Código Postal</span>}
              validateStatus={errors.zipCode ? "error" : ""}
              help={errors.zipCode?.message}
            >
              <Controller
                name="zipCode"
                control={control}
                render={({ field }) => <Input {...field} size="large" className="rounded-xl font-mono" placeholder="50000" maxLength={5} />}
              />
            </Form.Item>
          </div>

          <Form.Item 
            label={<span className="font-semibold text-slate-700">Correo Electrónico</span>}
            validateStatus={errors.email ? "error" : ""}
            help={errors.email?.message}
          >
            <Controller
              name="email"
              control={control}
              render={({ field }) => <Input {...field} size="large" className="rounded-xl" placeholder="contacto@empresa.com" />}
            />
          </Form.Item>

          <div className="flex justify-end gap-3 mt-8">
            <Button size="large" className="rounded-xl" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              type="primary" 
              htmlType="submit" 
              size="large" 
              loading={mutation.isPending}
              className="bg-violet-600 shadow-md shadow-violet-200 rounded-xl"
            >
              Guardar en Odoo
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
