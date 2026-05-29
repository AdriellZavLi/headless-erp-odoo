"use client";

import React from "react";
import { Button, Tag, Avatar } from "antd";
import { LogoutOutlined, UserOutlined, ShopOutlined } from "@ant-design/icons";
import { signOut } from "next-auth/react";

interface DashboardHeaderProps {
  user: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
  };
}

export default function DashboardHeader({ user }: DashboardHeaderProps) {
  const getRoleTag = (role?: string | null) => {
    switch (role) {
      case "admin":
        return (
          <Tag
            color="violet"
            className="border-violet-200 bg-violet-50 text-violet-700 font-semibold px-2 py-0.5 rounded-md"
          >
            Administrador
          </Tag>
        );
      case "operator":
        return (
          <Tag
            color="blue"
            className="border-blue-200 bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded-md"
          >
            Operador
          </Tag>
        );
      default:
        return (
          <Tag
            color="gray"
            className="border-slate-200 bg-slate-50 text-slate-600 font-semibold px-2 py-0.5 rounded-md"
          >
            Invitado
          </Tag>
        );
    }
  };

  return (
    <header className="w-full bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-8 py-5 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 text-white shadow-md shadow-violet-500/10">
          <ShopOutlined className="text-2xl" />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-wide text-slate-900">MasBordados</h2>
          <p className="text-sm text-slate-500 font-medium">Bordados Industriales</p>
        </div>
      </div>

      <div className="flex items-center gap-8">
        <div className="flex items-center gap-4 border-r border-slate-200 pr-8">
          <Avatar
            icon={<UserOutlined />}
            className="bg-violet-100 text-violet-600 border border-violet-200 shadow-inner"
          />
          <div className="text-left hidden sm:block">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-semibold text-slate-800">
                {user.name || "Usuario del Taller"}
              </span>
              {getRoleTag(user.role)}
            </div>
            <p className="text-xs text-slate-500 font-medium">{user.email}</p>
          </div>
        </div>

        <Button
          type="text"
          icon={<LogoutOutlined />}
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg font-medium px-3 py-1 flex items-center gap-1.5 transition-colors duration-200"
        >
          Cerrar Sesión
        </Button>
      </div>
    </header>
  );
}
