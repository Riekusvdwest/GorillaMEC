import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/space-grotesk";
import "./globals.css";
import { siteUrl } from "@/lib/env";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "GorillaPM — Project management that works the way you do",
    template: "%s · GorillaPM",
  },
  description:
    "Waterfall, Agile, Kanban or all three. GorillaPM builds your workspace around how your team works — from intake and prioritisation to sprints, capacity and close-out. By GorillaMEC.",
  applicationName: "GorillaPM",
  openGraph: {
    type: "website",
    siteName: "GorillaPM",
    title: "GorillaPM — Project management that works the way you do",
    description:
      "Intake → prioritise → allocate → deliver → review. Portfolio and project management built by engineers, for teams that deliver real-world projects.",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
