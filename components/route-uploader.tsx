"use client";

import { useState, useEffect } from "react";
import { Clipboard, MapPin, Loader2, Navigation } from "lucide-react";

interface RouteData {
    platform: "grab" | "shopee" | "unknown";
    pickup_address: string;
    delivery_address: string;
    confidence: number;
}

export function RouteUploader() {
    const [image, setImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<RouteData | null>(null);

    // Global Paste Listener
    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (items) {
                for (let i = 0; i < items.length; i++) {
                    if (items[i].type.indexOf("image") !== -1) {
                        const blob = items[i].getAsFile();
                        if (blob) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                                setImage(event.target?.result as string);
                                setData(null); // Reset result on new image
                            };
                            reader.readAsDataURL(blob);
                        }
                    }
                }
            }
        };

        window.addEventListener("paste", handlePaste);
        return () => {
            window.removeEventListener("paste", handlePaste);
        };
    }, []);

    const handleAnalyze = async () => {
        if (!image) return;

        setLoading(true);
        try {
            const response = await fetch("/api/parse-route", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ image }),
            });

            if (!response.ok) throw new Error("Failed to analyze");

            const result = await response.json();
            setData(result);
        } catch (error) {
            console.error(error);
            alert("Gagal menganalisis gambar. Coba lagi.");
        } finally {
            setLoading(false);
        }
    };

    const openGoogleMaps = (pd: "pickup" | "delivery") => {
        if (!data) return;
        const address = pd === "pickup" ? data.pickup_address : data.delivery_address;
        const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
        window.open(url, "_blank");
    };

    return (
        <div className="w-full max-w-md mx-auto space-y-6">
            {/* Paste Area (Visual Only) */}
            <div className="border-2 border-dashed border-blue-300 rounded-xl p-8 text-center bg-blue-50 transition">
                {image ? (
                    <img src={image} alt="Preview" className="mx-auto max-h-64 rounded-lg shadow-sm" />
                ) : (
                    <div className="flex flex-col items-center text-gray-500 py-4">
                        <Clipboard className="w-12 h-12 mb-3 text-blue-500" />
                        <h3 className="font-bold text-lg text-gray-800">Siap Menerima Gambar</h3>
                        <p className="font-medium text-sm">Tekan <span className="bg-white border border-gray-300 rounded px-1.5 py-0.5 font-mono text-gray-700">Ctrl + V</span> untuk Paste</p>
                        <p className="text-xs text-gray-400 mt-2">Screenshot aplikasi Grab/Shopee lalu Paste disini</p>
                    </div>
                )}
            </div>

            {image && !data && (
                <button
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg flex items-center justify-center gap-2 transition"
                    onClick={handleAnalyze}
                    disabled={loading}
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Navigation className="w-5 h-5" />}
                    {loading ? "Menganalisis..." : "Cari Rute"}
                </button>
            )}

            {/* Result Card */}
            {data && (
                <div className={`p-6 rounded-xl shadow-lg border-l-8 ${data.platform === 'grab' ? 'bg-green-50 border-green-500' :
                    data.platform === 'shopee' ? 'bg-orange-50 border-orange-500' : 'bg-gray-50 border-gray-500'
                    }`}>
                    <div className="flex items-center justify-between mb-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-bold capitalize ${data.platform === 'grab' ? 'bg-green-100 text-green-700' :
                            data.platform === 'shopee' ? 'bg-orange-100 text-orange-700' : 'bg-gray-200'
                            }`}>
                            {data.platform === 'unknown' ? 'Tidak Diketahui' : data.platform}
                        </span>
                    </div>

                    <div className="space-y-4">
                        <div className="relative pl-6 border-l-2 border-gray-200 space-y-4">
                            {/* Pickup */}
                            <div className="relative">
                                <span className="absolute -left-[31px] bg-blue-500 text-white p-1 rounded-full w-6 h-6 flex items-center justify-center text-xs">P</span>
                                <p className="text-xs text-gray-500 mb-1">Ambil Barang</p>
                                <p className="text-gray-900 font-medium leading-tight mb-2">{data.pickup_address}</p>
                                <button
                                    onClick={() => openGoogleMaps('pickup')}
                                    className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1"
                                >
                                    <MapPin className="w-3 h-3" /> Navigasi Ambil
                                </button>
                            </div>

                            {/* Delivery */}
                            <div className="relative">
                                <span className="absolute -left-[31px] bg-red-500 text-white p-1 rounded-full w-6 h-6 flex items-center justify-center text-xs">D</span>
                                <p className="text-xs text-gray-500 mb-1">Antar Barang</p>
                                <p className="text-gray-900 font-medium leading-tight mb-2">{data.delivery_address}</p>
                                <button
                                    onClick={() => openGoogleMaps('delivery')}
                                    className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1"
                                >
                                    <MapPin className="w-3 h-3" /> Navigasi Antar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
