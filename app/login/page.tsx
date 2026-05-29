"use client";

import React, { useState, Suspense } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, Input, Button, Alert } from "antd";
import { UserOutlined, LockOutlined, LoadingOutlined } from "@ant-design/icons";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

// Strict validation schema using Zod
const loginSchema = z.object({
  username: z
    .string()
    .min(3, "El usuario debe tener al menos 3 caracteres")
    .max(20, "El usuario no debe exceder 20 caracteres"),
  password: z
    .string()
    .min(6, "La contraseña debe tener al menos 6 caracteres"),
});

type LoginSchema = z.infer<typeof loginSchema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [authError, setAuthError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginSchema) => {
    setAuthError(null);
    try {
      const result = await signIn("credentials", {
        username: data.username,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        setAuthError(result.error);
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (error) {
      setAuthError("Ocurrió un error inesperado. Inténtelo de nuevo.");
    }
  };

  return (
    <div className="w-full max-w-md bg-white/80 backdrop-blur-xl border border-slate-200/80 p-8 rounded-2xl shadow-xl transition-all duration-300 hover:border-violet-300/60 hover:shadow-2xl">
      <div className="text-center mb-8">
        {/* Custom vector logo representing a premium sewing/thread spool */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-500 text-white font-bold text-2xl shadow-lg shadow-violet-500/10 mb-4 ring-2 ring-violet-200">
          <svg
            className="w-8 h-8 animate-spin-slow"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M9.813 15.904L9 21m0 0l-.813-5.096M9 21h8.25M18 10a6 6 0 11-12 0 6 6 0 0112 0z"
            />
          </svg>
        </div>
        <h1
          id="login-title"
          className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 bg-clip-text text-transparent"
        >
          MASBORDADOS
        </h1>
        <p className="text-sm text-slate-500 mt-2 font-medium">
          Control de Calidad & Taller de Bordado
        </p>
      </div>

      {authError && (
        <div className="mb-6 animate-shake">
          <Alert
            title="Fallo de Autenticación"
            description={authError}
            type="error"
            showIcon
            className="border border-red-200 bg-red-50 text-red-800 rounded-xl"
          />
        </div>
      )}

      <Form
        layout="vertical"
        onFinish={handleSubmit(onSubmit)}
        requiredMark={false}
        className="space-y-4"
      >
        <Form.Item
          label={
            <span className="text-slate-700 font-semibold text-xs uppercase tracking-wider">
              Usuario
            </span>
          }
          validateStatus={errors.username ? "error" : ""}
          help={errors.username?.message}
        >
          <Controller
            name="username"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                id="username-input"
                prefix={<UserOutlined className="text-slate-400" />}
                placeholder="admin"
                size="large"
                className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:bg-white rounded-xl py-3"
                autoComplete="username"
              />
            )}
          />
        </Form.Item>

        <Form.Item
          label={
            <span className="text-slate-700 font-semibold text-xs uppercase tracking-wider">
              Contraseña
            </span>
          }
          validateStatus={errors.password ? "error" : ""}
          help={errors.password?.message}
        >
          <Controller
            name="password"
            control={control}
            render={({ field }) => (
              <Input.Password
                {...field}
                id="password-input"
                prefix={<LockOutlined className="text-slate-400" />}
                placeholder="••••••••"
                size="large"
                className="bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:bg-white rounded-xl py-3"
                autoComplete="current-password"
              />
            )}
          />
        </Form.Item>

        <Button
          type="primary"
          htmlType="submit"
          id="login-submit-btn"
          disabled={isSubmitting}
          size="large"
          className="w-full h-12 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 border-none font-bold text-white shadow-md shadow-violet-500/20 hover:from-violet-500 hover:to-indigo-500 active:scale-[0.98] transition-all duration-150 flex items-center justify-center mt-6"
        >
          {isSubmitting ? (
            <LoadingOutlined className="mr-2" />
          ) : (
            "Ingresar al Taller"
          )}
        </Button>
      </Form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#f8fafc] px-4 overflow-hidden">
      {/* Background glowing effects for rich premium look */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-violet-100/50 blur-[100px] -z-10 animate-pulse duration-8000" />
      <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] rounded-full bg-indigo-100/50 blur-[100px] -z-10 animate-pulse duration-10000" />

      {/* Decorative embroidery thread geometry representation */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none -z-10">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern
              id="grid"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <Suspense
        fallback={
          <div className="text-center p-8 bg-white border border-slate-200 rounded-2xl w-full max-w-md flex flex-col items-center justify-center h-[400px] shadow-lg">
            <LoadingOutlined className="text-violet-600 text-3xl mb-4" />
            <p className="text-slate-500 text-sm">Cargando acceso seguro...</p>
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  );
}
