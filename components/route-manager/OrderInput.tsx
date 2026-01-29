import { Plus, ArrowDownUp } from "lucide-react";
import { OrderType, Platform } from "@/types/order";

interface OrderInputProps {
    inputText: string;
    setInputText: (val: string) => void;
    selectedPlatform: Platform;
    setSelectedPlatform: (val: Platform) => void;
    selectedType: OrderType;
    setSelectedType: (val: OrderType) => void;
    loading: boolean;
    handleAdd: () => void;
}

export function OrderInput({
    inputText,
    setInputText,
    selectedPlatform,
    setSelectedPlatform,
    selectedType,
    setSelectedType,
    loading,
    handleAdd
}: OrderInputProps) {
    return (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-4">
            <div className="grid grid-cols-2 gap-3">
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setSelectedPlatform("Grab")}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition ${selectedPlatform === "Grab" ? "bg-white text-green-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                    >
                        GRAB
                    </button>
                    <button
                        onClick={() => setSelectedPlatform("Shopee")}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-md transition ${selectedPlatform === "Shopee" ? "bg-white text-orange-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                    >
                        SHOPEE
                    </button>
                </div>

                {selectedPlatform !== "Grab" && selectedPlatform !== "Shopee" && (
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => setSelectedType("Ambil")}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition ${selectedType === "Ambil" ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                        >
                            AMBIL
                        </button>
                        <button
                            onClick={() => setSelectedType("Antar")}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition ${selectedType === "Antar" ? "bg-white text-red-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                        >
                            ANTAR
                        </button>
                    </div>
                )}
            </div>

            <div className="space-y-2">
                <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={`Paste alamat ${selectedPlatform} (${selectedType}) disini...`}
                    className="w-full p-3 border border-gray-200 rounded-lg text-sm text-black focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none h-24"
                />
                <button
                    onClick={handleAdd}
                    disabled={loading}
                    className={`w-full py-2.5 rounded-lg text-sm font-bold text-white shadow-sm active:scale-95 transition flex items-center justify-center gap-2 ${selectedPlatform === "Grab" ? "bg-green-600 hover:bg-green-700" : "bg-orange-600 hover:bg-orange-700"}`}
                >
                    {loading ? <ArrowDownUp className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    {selectedPlatform === "Grab" ? "Proses Pesanan Grab" : `Tambahkan ${selectedType} ${selectedPlatform}`}
                </button>
            </div>
        </div>
    );
}
