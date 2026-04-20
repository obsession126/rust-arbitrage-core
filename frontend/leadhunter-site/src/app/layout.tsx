import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata = {
  title: "LeadHunter Terminal",
  description: "OSINT Powered B2B Leads",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#050505] antialiased">
        <Navbar />
        {children}
      </body>
    </html>
  );
}