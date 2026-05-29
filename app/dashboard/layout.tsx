import React from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardHeader from "@/components/DashboardHeader";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">
      <DashboardHeader user={session.user} />
      <div className="flex-grow flex flex-col">
        {children}
      </div>
    </div>
  );
}
