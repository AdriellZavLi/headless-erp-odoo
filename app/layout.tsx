import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { ConfigProvider, theme } from "antd";
import Providers from "@/components/Providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MasBordados | Taller de Bordados",
  description: "ERP Headless de alta precisión para gestión de manufactura, catálogos del SAT y control de calidad de bordado industrial.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#f8fafc] text-slate-900 antialiased selection:bg-violet-100 selection:text-violet-900">
        <ConfigProvider
          theme={{
            algorithm: theme.defaultAlgorithm, // Light mode
            token: {
              colorPrimary: "#8b5cf6", // Premium Violet
              colorBgBase: "#ffffff",
              colorBgContainer: "#ffffff",
              colorBorder: "#e2e8f0", // Light border
              colorText: "#0f172a", // Slate 900
              colorTextSecondary: "#475569", // Slate 600
              borderRadius: 12,
              fontFamily: "var(--font-geist-sans)",
            },
            components: {
              Input: {
                colorBgContainer: "#f8fafc",
                activeBorderColor: "#8b5cf6",
                hoverBorderColor: "#a78bfa",
              },
              Button: {
                colorPrimaryHover: "#a78bfa",
                colorPrimaryActive: "#7c3aed",
              },
            },
          }}
        >
          <AntdRegistry>
            <Providers>
              <main className="flex-grow flex flex-col">{children}</main>
            </Providers>
          </AntdRegistry>
        </ConfigProvider>
      </body>
    </html>
  );
}
