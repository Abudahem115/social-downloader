import "./globals.css";

export const metadata = {
  title: "Social Downloader",
  description: "Minimal social media video & audio downloader",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen font-sans antialiased bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
