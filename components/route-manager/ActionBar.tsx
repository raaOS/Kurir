import { Trash2, ArrowDownUp, ArrowRight } from "lucide-react";

interface ActionBarProps {
    ordersCount: number;
    loading: boolean;
    handleClearAll: () => void;
    handleOptimize: () => void;
}

export function ActionBar({ ordersCount, loading, handleClearAll, handleOptimize }: ActionBarProps) {
    if (ordersCount === 0) return null;

    return (
        <div className="flex justify-between items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
            <button
                onClick={handleClearAll}
                className="text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5"
            >
                <Trash2 size={14} /> Clear All
            </button>

            <div className="flex gap-2">
                <button
                    onClick={handleOptimize}
                    disabled={loading}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-md active:scale-95 transition flex items-center gap-2"
                >
                    {loading ? <ArrowDownUp className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                    Atur Rute Otomatis
                </button>
            </div>
        </div>
    );
}
