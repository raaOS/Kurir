"use client";

import { useState } from "react";
import { Reorder, useDragControls } from "framer-motion";
import { Plus, MapPin, Flag, Navigation, Trash2, ArrowRight, ArrowDownUp, GripVertical, Pencil, Check, X } from "lucide-react";

type OrderType = "Ambil" | "Antar";
type Platform = "Grab" | "Shopee";

interface Order {
    id: string;
    text: string; // Original input
    address: string; // Current display address (could be raw or cleaned)
    cleanedAddress?: string; // AI Cleaned for Maps
    note?: string; // AI Extracted Note
    type: OrderType;
    platform: Platform;
    isEndPoint: boolean;
    distance?: string;
    isEditing?: boolean; // UI State for editing
}

// ... imports and component setup

export function RouteManager() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [inputText, setInputText] = useState("");
    const [startPoint, setStartPoint] = useState(""); // New State
    const [loading, setLoading] = useState(false);

    // Manual selections
    const [selectedPlatform, setSelectedPlatform] = useState<Platform>("Grab");
    const [selectedType, setSelectedType] = useState<OrderType>("Ambil");

    // Quick helper to generate ID
    const generateId = () => Math.random().toString(36).substr(2, 9);

    const handleUseCurrentLocation = () => {
        if (!navigator.geolocation) {
            alert("Browser tidak support GPS.");
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const coords = `${pos.coords.latitude},${pos.coords.longitude}`;
                setStartPoint(coords);
                alert("Lokasi terkini berhasil diambil! (Koordinat GPS)");
            },
            (err) => {
                console.error(err);
                alert("Gagal ambil lokasi. Pastikan GPS aktif dan izin diberikan.");
            }
        );
    };

    const handleAdd = () => {
        if (!inputText.trim()) return;

        const newOrder: Order = {
            id: generateId(),
            text: inputText,
            address: inputText, // Nanti bisa ada logic cleaner
            type: selectedType,       // Use manual selection
            platform: selectedPlatform, // Use manual selection
            isEndPoint: false,
            distance: "", // Init empty
        };

        setOrders([...orders, newOrder]);
        setInputText("");
        // Keep the selection or reset? User might want to input multiple same type. Keep is better.
    };

    const handleDelete = (id: string) => {
        setOrders(orders.filter(o => o.id !== id));
    };

    const toggleEndPoint = (id: string) => {
        setOrders(orders.map(o => ({
            ...o,
            isEndPoint: o.id === id ? !o.isEndPoint : false // Only one end point allowed? Or toggle? Let's say only 1 active.
        })));
    };

    const handleOptimize = async () => {
        const endPoint = orders.find(o => o.isEndPoint);
        if (!endPoint) {
            alert("Tentukan dulu Titik Akhir (Finish Line) dengan klik icon Bendera 🏁");
            return;
        }

        setLoading(true);

        // Auto-detect location if input is empty
        let activeStartPoint = startPoint;
        if (!activeStartPoint && navigator.geolocation) {
            try {
                const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
                });
                activeStartPoint = `${pos.coords.latitude},${pos.coords.longitude}`;
                setStartPoint(activeStartPoint); // Update UI to show we found it
            } catch (e) {
                console.log("GPS auto-detect failed, proceeding without start point.");
            }
        }

        try {
            const response = await fetch("/api/optimize-route", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    orders,
                    endPointId: endPoint.id,
                    startPoint: activeStartPoint || undefined
                }),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.details || "Gagal optimasi rute via AI");
            }

            const { route } = await response.json();

            // Reconstruct orders based on route order (Sort + Update Data)
            const currentOrdersMap = new Map<string, any>(orders.map(o => [o.id, o]));

            const newOrders = route.map((item: any) => {
                const original = currentOrdersMap.get(item.id);
                if (original) {
                    return {
                        ...original,
                        distance: item.distance ? String(item.distance) : "",
                        cleanedAddress: item.cleaned_address,
                        note: item.note,
                        // Prefer showing cleaned address if available for readability
                        address: item.cleaned_address || original.address
                    };
                }
                return null;
            }).filter(Boolean) as Order[];

            if (newOrders.length === orders.length) {
                setOrders(newOrders);
            } else {
                alert("AI mengembalikan data tidak lengkap. Coba lagi.");
            }

        } catch (error) {
            console.error(error);
            alert("Terjadi kesalahan saat optimasi AI. Pastikan API Key aktif.");
        } finally {
            setLoading(false);
        }
    };

    const handleReorder = (newOrders: Order[]) => {
        // When manually reordered, clear distances as they are now invalid
        const cleared = newOrders.map(o => ({ ...o, distance: "" }));
        setOrders(cleared);
    };

    const handleRecalculateDistances = async () => {
        setLoading(true);
        try {
            const response = await fetch("/api/optimize-route", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    orders,
                    preserveOrder: true,
                    startPoint: startPoint || undefined
                }),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.details || "Gagal hitung jarak");
            }

            const { route } = await response.json();
            const dataMap = new Map<string, any>(route.map((r: any) => [r.id, r]));

            setOrders(prevOrders => prevOrders.map(o => {
                const data = dataMap.get(o.id);
                if (data) {
                    return {
                        ...o,
                        distance: data.distance ? String(data.distance) : "",
                        cleanedAddress: data.cleaned_address,
                        note: data.note,
                        address: data.cleaned_address || o.address
                    };
                }
                return o;
            }));

        } catch (error) {
            console.error(error);
            alert("Gagal update jarak.");
        } finally {
            setLoading(false);
        }
    };

    const toggleEdit = (id: string) => {
        setOrders(orders.map(o => ({ ...o, isEditing: o.id === id ? !o.isEditing : false })));
    };

    const saveEdit = (id: string, newText: string) => {
        setOrders(orders.map(o => o.id === id ? { ...o, text: newText, address: newText, cleanedAddress: undefined, note: undefined, isEditing: false } : o));
    };

    return (
        <div className="w-full max-w-lg mx-auto space-y-6 pb-20">
            {/* Start Point Section */}
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
                        className="flex-1 p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
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

            {/* Input Section */}
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
                </div>

                <div className="space-y-2">
                    <textarea
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        placeholder={`Paste alamat ${selectedPlatform} (${selectedType}) disini...`}
                        className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none h-24"
                    />
                    <button
                        onClick={handleAdd}
                        className={`w-full py-2.5 rounded-lg text-sm font-bold text-white shadow-sm active:scale-95 transition flex items-center justify-center gap-2 ${selectedPlatform === "Grab" ? "bg-green-600 hover:bg-green-700" : "bg-orange-600 hover:bg-orange-700"
                            }`}
                    >
                        <Plus className="w-4 h-4" />
                        Tambahkan {selectedType} {selectedPlatform}
                    </button>
                </div>
            </div>

            {/* Action Bar */}
            {orders.length > 1 && (
                <div className="flex justify-end gap-2">
                    {orders.some(o => !o.distance) && (
                        <button
                            onClick={handleRecalculateDistances}
                            disabled={loading}
                            className="bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50 px-4 py-2.5 rounded-full text-xs font-bold shadow-sm active:scale-95 transition flex items-center gap-2"
                        >
                            {loading ? <ArrowDownUp className="w-3 h-3 animate-spin" /> : <ArrowDownUp className="w-3 h-3" />}
                            Update Jarak
                        </button>
                    )}

                    <button
                        onClick={handleOptimize}
                        disabled={loading}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-full text-sm font-bold shadow-md active:scale-95 transition flex items-center gap-2"
                    >
                        {loading ? <ArrowDownUp className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                        Atur Rute Otomatis
                    </button>
                </div>
            )}

            {/* List Section */}
            <Reorder.Group axis="y" values={orders} onReorder={handleReorder} className="space-y-3">
                {orders.map((order, index) => (
                    <Reorder.Item key={order.id} value={order} className="touch-none">
                        <div className={`bg-white p-4 rounded-xl shadow-sm border relative overflow-hidden transition-colors ${order.isEndPoint ? "border-red-500 bg-red-50" : "border-gray-100"
                            }`}>

                            {/* Sequence Number */}
                            <div className="absolute left-2 top-3 w-8 h-8 flex items-center justify-center bg-gray-900 text-white text-sm font-bold rounded-full shadow-md z-10">
                                {index + 1}
                            </div>

                            {/* Distance Info */}
                            {order.distance && order.distance !== "0 km" && (
                                <div className="absolute top-3 right-3 bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                                    <ArrowDownUp className="w-3 h-3" />
                                    +{order.distance}
                                </div>
                            )}

                            {/* Drag Handle */}
                            <div className="absolute left-3 top-14 text-gray-300 cursor-grab active:cursor-grabbing p-1">
                                <GripVertical className="w-5 h-5" />
                            </div>

                            <div className="pl-12 pr-2">
                                <div className="flex items-center gap-2 mb-2 pt-1">
                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${order.platform === "Grab" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                                        }`}>
                                        {order.platform}
                                    </span>
                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${order.type === "Ambil" ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"
                                        }`}>
                                        {order.type}
                                    </span>
                                </div>

                                {/* Main Address (Cleaned) or Edit Input */}
                                {order.isEditing ? (
                                    <div className="mb-2">
                                        <textarea
                                            defaultValue={order.text}
                                            className="w-full text-sm border p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            autoFocus
                                            onBlur={(e) => saveEdit(order.id, e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    saveEdit(order.id, e.currentTarget.value);
                                                }
                                            }}
                                        />
                                        <p className="text-[10px] text-gray-400 mt-1">Tekan Enter untuk simpan</p>
                                    </div>
                                ) : (
                                    <p
                                        className="text-sm font-bold text-gray-900 leading-snug mb-1 cursor-pointer hover:text-blue-600 transition"
                                        onClick={() => toggleEdit(order.id)}
                                        title="Klik untuk edit"
                                    >
                                        {order.address}
                                    </p>
                                )}

                                {/* Note Section */}
                                {order.note && !order.isEditing && (
                                    <div className="bg-yellow-50 border border-yellow-100 text-yellow-800 text-xs p-2 rounded-lg mb-2">
                                        <span className="font-bold">Catatan:</span> {order.note}
                                    </div>
                                )}

                                <div className="flex items-center justify-between border-t border-gray-100 pt-3 mt-2">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => toggleEndPoint(order.id)}
                                            className={`p-1.5 rounded-lg transition ${order.isEndPoint ? "bg-red-600 text-white" : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                                                }`}
                                            title="Jadikan Titik Akhir"
                                        >
                                            <Flag className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => toggleEdit(order.id)}
                                            className={`p-1.5 rounded-lg transition ${order.isEditing ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-400 hover:bg-blue-100 hover:text-blue-600"}`}
                                            title="Edit Alamat"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(order.id)}
                                            className="p-1.5 bg-gray-100 text-gray-400 rounded-lg hover:bg-red-100 hover:text-red-600 transition"
                                            title="Hapus"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Link uses order.cleanedAddress if available, fallbacks to order.address */}
                                    <a
                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.cleanedAddress || order.address)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 text-blue-600 text-xs font-bold hover:underline bg-blue-50 px-3 py-1.5 rounded-lg"
                                    >
                                        <Navigation className="w-3 h-3" /> Jalan
                                    </a>
                                </div>
                            </div>
                        </div>
                    </Reorder.Item>
                ))
                }
            </Reorder.Group >

            {
                orders.length === 0 && (
                    <div className="text-center text-gray-400 py-10">
                        <p>Belum ada orderan.</p>
                        <p className="text-xs">Paste alamat di atas dan klik Tambah.</p>
                    </div>
                )
            }
        </div >
    );
}
