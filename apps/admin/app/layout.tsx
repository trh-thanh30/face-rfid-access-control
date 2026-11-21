import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Access Control Admin",
  description: "Quản trị hệ thống kiểm soát ra vào RFID và khuôn mặt",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
