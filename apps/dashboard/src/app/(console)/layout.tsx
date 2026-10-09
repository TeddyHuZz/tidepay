import { MerchantDataProvider } from "@/components/merchant-data-provider";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <MerchantDataProvider>
      <div className="flex min-h-dvh flex-col md:flex-row">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main id="main-content" className="flex-1 px-4 py-6 md:px-8 md:py-8">
            {children}
          </main>
        </div>
      </div>
    </MerchantDataProvider>
  );
}
