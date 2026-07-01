import type { Metadata } from "next";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import MeetingNotificationProvider from "@/components/MeetingNotificationProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Meeting Schedule Dashboard",
  description: "Organize and track meeting schedules and job application status",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="d-flex flex-column min-vh-100">
        {children}
        <MeetingNotificationProvider />
      </body>
    </html>
  );
}
