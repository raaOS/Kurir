import { MapPin } from "lucide-react";

interface StartPointInputProps {
    startPoint: string;
    setStartPoint: (val: string) => void;
    handleUseCurrentLocation: () => void;
}

export function StartPointInput({ startPoint, setStartPoint, handleUseCurrentLocation }: StartPointInputProps) {
    return (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-100 flex flex-col gap-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                📍 Titik Awal (Posisi Anda)
            </label>
            <div className="flex gap-2">
                <input
                    type="text"
                    value={startPoint}
                    onChange={(e) => setStartPoint(e.target.value)}
                    placeholder="Ketik lokasi atau biarkan kosong untuk GPS otomatis..."
                    className="flex-1 p-2 border border-gray-200 rounded-lg text-sm text-black focus:outline-none focus:border-blue-500"
                />
                <button
                    onClick={handleUseCurrentLocation}
                    className="bg-blue-50 text-blue-600 p-2 rounded-lg hover:bg-blue-100 transition"
                    title="Gunakan Lokasi Saat Ini"
                >
                    <MapPin className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}
