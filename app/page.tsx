import { RouteManager } from "@/components/route-manager";

export default function Home() {
  return (
    <div className="min-h-screen p-4 sm:p-6 font-[family-name:var(--font-geist-sans)] bg-slate-50">
      <main className="flex flex-col gap-6 max-w-lg mx-auto pt-4 pb-20">
        <div className="text-center w-full space-y-1 mb-4">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Kurir <span className="text-blue-600">Asisten</span>
          </h1>
          <p className="text-gray-500 text-sm">
            Atur Rute Cerdas & Hemat Waktu
          </p>
        </div>

        <RouteManager />

        <div className="text-center w-full pt-8 text-xs text-gray-400">
          <p>Didukung oleh Gemini AI Pro</p>
        </div>
      </main>
    </div>
  );
}
