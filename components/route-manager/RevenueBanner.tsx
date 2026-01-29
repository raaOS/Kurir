import { Check } from "lucide-react";

interface RevenueBannerProps {
    totalRevenue: string;
}

export function RevenueBanner({ totalRevenue }: RevenueBannerProps) {
    if (!totalRevenue) return null;

    return (
        <div className="bg-gradient-to-r from-green-600 to-green-500 p-4 rounded-xl shadow-lg text-white flex justify-between items-center animate-in fade-in slide-in-from-top-2">
            <div>
                <p className="text-[10px] uppercase font-bold opacity-80">Pendapatan Bersih</p>
                <h2 className="text-2xl font-black">{totalRevenue}</h2>
            </div>
            <div className="bg-white/20 p-2 rounded-lg">
                <Check className="w-6 h-6" />
            </div>
        </div>
    );
}
