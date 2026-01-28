"use client";

import { useState } from "react";
import { Reorder, useDragControls } from "framer-motion";
import { Plus, MapPin, Flag, Home, Navigation, Trash2, ArrowRight, ArrowDownUp, GripVertical, Pencil, Check, X, Clock } from "lucide-react";

type OrderType = "Ambil" | "Antar";
type Platform = "Grab" | "Shopee";

interface Order {
    id: string;
    text: string; // Original input
    address: string; // Current display address (could be raw or cleaned)
    cleanedAddress?: string; // AI Cleaned for Maps
    note?: string; // AI Extracted Note
    recipientName?: string; // Store or Customer Name
    deadline?: string; // e.g. "10:06 PM"
    orderId?: string; // e.g. "GM-191"
    serviceType?: string; // e.g. "GrabMart"
    type: OrderType;
    platform: Platform;
    isEndPoint: boolean;
    isStartPoint: boolean; // LOCKED START
    distance?: string;
    isEditing?: boolean; // UI State for editing
    isCompleted?: boolean; // Progress marking
}

export function RouteManager() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [totalRevenue, setTotalRevenue] = useState<string>(""); // Global Revenue
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

    const handleAdd = async () => {
        if (!inputText.trim()) return;

        if (selectedPlatform === "Grab") {
            setLoading(true);
            try {
                const response = await fetch("/api/extract-orders", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text: inputText, platform: "Grab" }),
                });

                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.details || data.error || "Gagal extract data Grab");
                }

                const { orders: newOrders, total_revenue } = data;
                if (total_revenue) setTotalRevenue(total_revenue);

                const formattedOrders = newOrders.map((o: any) => ({
                    id: generateId(),
                    text: inputText,
                    address: o.address,
                    recipientName: o.recipient_name,
                    type: o.type,
                    platform: "Grab",
                    orderId: o.order_id,
                    deadline: o.deadline,
                    serviceType: o.service_type,
                    isEndPoint: false,
                    isStartPoint: false,
                    distance: "",
                }));

                setOrders([...orders, ...formattedOrders]);
                setInputText("");
            } catch (e: any) {
                alert(`Gagal: ${e.message}`);
                console.error(e);
            } finally {
                setLoading(false);
            }
        } else {
            // Manual Add for Shopee for now
            const newOrder: Order = {
                id: generateId(),
                text: inputText,
                address: inputText,
                type: selectedType,
                platform: selectedPlatform,
                isEndPoint: false,
                isStartPoint: false,
                distance: "",
            };

            setOrders([...orders, newOrder]);
            setInputText("");
        }
    };

    const handleDelete = (id: string) => {
        setOrders(orders.filter(o => o.id !== id));
    };

    const toggleEndPoint = (id: string) => {
        setOrders(orders.map(o => ({
            ...o,
            isEndPoint: o.id === id ? !o.isEndPoint : false,
            isStartPoint: o.id === id ? false : o.isStartPoint // Can't be both
        })));
    };

    const toggleStartPoint = (id: string) => {
        const target = orders.find(o => o.id === id);
        if (target) {
            // Also update the global startPoint input for clarity
            setStartPoint(!target.isStartPoint ? target.address : "");
        }
        setOrders(orders.map(o => ({
            ...o,
            isStartPoint: o.id === id ? !o.isStartPoint : false,
            isEndPoint: o.id === id ? false : o.isEndPoint // Can't be both
        })));
    };

    const toggleEdit = (id: string) => {
        setOrders(orders.map(o => ({ ...o, isEditing: o.id === id ? !o.isEditing : false })));
    };

    const toggleComplete = (id: string) => {
        setOrders(orders.map(o => o.id === id ? { ...o, isCompleted: !o.isCompleted, isEndPoint: false, isStartPoint: false } : o));
    };

    const saveEdit = (id: string, newText: string) => {
        setOrders(orders.map(o => o.id === id ? { ...o, text: newText, address: newText, cleanedAddress: undefined, note: undefined, isEditing: false } : o));
    };

    const handleOptimize = async () => {
        const activeOrders = orders.filter(o => !o.isCompleted);
        const completedOrders = orders.filter(o => o.isCompleted);

        const endPoint = activeOrders.find(o => o.isEndPoint);
        const lockedStart = activeOrders.find(o => o.isStartPoint);

        if (activeOrders.length < 2) {
            alert("Butuh minimal 2 orderan aktif untuk optimasi.");
            return;
        }
        if (!endPoint) {
            alert("Tentukan dulu Titik Akhir (Flag 🏁) untuk orderan yang belum selesai.");
            return;
        }

        setLoading(true);

        // Auto-detect location if input is empty AND no lockedStart
        let activeStartPoint = startPoint;
        if (lockedStart) {
            activeStartPoint = lockedStart.address;
        } else if (!activeStartPoint && navigator.geolocation) {
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
            const orderListText = activeOrders.map((o: any) =>
                `ID: ${o.id} | Name: ${o.recipientName || "-"} | OrderID: ${o.orderId || "-"} | Type: ${o.type} | Platform: ${o.platform} | Address: ${o.address} | Deadline: ${o.deadline || "-"}`
            ).join("\n");

            const response = await fetch("/api/optimize-route", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    orders: activeOrders,
                    orderListText, // Send pre-formatted text to help AI
                    endPointId: endPoint.id,
                    startPoint: activeStartPoint || undefined
                }),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.details || "Gagal optimasi rute via AI");
            }

            const { route, total_revenue } = await response.json();
            if (total_revenue) setTotalRevenue(total_revenue);

            // Reconstruct orders based on route order (Sort + Update Data)
            const currentOrdersMap = new Map<string, any>(activeOrders.map(o => [o.id, o]));

            const sortedActive = route.map((item: any) => {
                const original = currentOrdersMap.get(item.id);
                if (original) {
                    return {
                        ...original,
                        distance: item.distance ? String(item.distance) : "",
                        cleanedAddress: item.cleaned_address,
                        note: item.note,
                        recipientName: item.recipient_name,
                        deadline: item.deadline,
                        orderId: item.order_id,
                        serviceType: item.service_type,
                        address: item.cleaned_address || original.address
                    };
                }
                return null;
            }).filter(Boolean) as Order[];

            if (sortedActive.length === activeOrders.length) {
                // Combine completed at top, then new sorted active
                setOrders([...completedOrders, ...sortedActive]);
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
        const activeOrders = orders.filter(o => !o.isCompleted);
        const completedOrders = orders.filter(o => o.isCompleted);

        if (activeOrders.length === 0) return;

        setLoading(true);
        try {
            const orderListText = activeOrders.map((o: any) =>
                `ID: ${o.id} | Name: ${o.recipientName || "-"} | OrderID: ${o.orderId || "-"} | Type: ${o.type} | Platform: ${o.platform} | Address: ${o.address} | Deadline: ${o.deadline || "-"}`
            ).join("\n");

            const response = await fetch("/api/optimize-route", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    orders: activeOrders,
                    orderListText,
                    preserveOrder: true,
                    startPoint: startPoint || undefined
                }),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.details || "Gagal hitung jarak");
            }

            const { route, total_revenue } = await response.json();
            if (total_revenue) setTotalRevenue(total_revenue);

            const dataMap = new Map<string, any>(route.map((r: any) => [r.id, r]));

            setOrders(prevOrders => prevOrders.map(o => {
                const data = dataMap.get(o.id);
                if (data && !o.isCompleted) {
                    return {
                        ...o,
                        distance: data.distance ? String(data.distance) : "",
                        cleanedAddress: data.cleaned_address,
                        note: data.note,
                        recipientName: data.recipient_name,
                        deadline: data.deadline,
                        orderId: data.order_id,
                        serviceType: data.service_type,
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

    return (
        <div className="w-full max-w-lg mx-auto space-y-6 pb-20">
            {/* Revenue Dashboard */}
            {totalRevenue && (
                <div className="bg-gradient-to-r from-green-600 to-green-500 p-4 rounded-xl shadow-lg text-white flex justify-between items-center">
                    <div>
                        <p className="text-[10px] uppercase font-bold opacity-80">Pendapatan Bersih</p>
                        <h2 className="text-2xl font-black">{totalRevenue}</h2>
                    </div>
                    <div className="bg-white/20 p-2 rounded-lg">
                        <Check className="w-6 h-6" />
                    </div>
                </div>
            )}

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

                    {selectedPlatform !== "Grab" && (
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
                        className={`w-full py-2.5 rounded-lg text-sm font-bold text-white shadow-sm active:scale-95 transition flex items-center justify-center gap-2 ${selectedPlatform === "Grab" ? "bg-green-600 hover:bg-green-700" : "bg-orange-600 hover:bg-orange-700"
                            }`}
                    >
                        {loading ? <ArrowDownUp className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        {selectedPlatform === "Grab" ? "Proses Pesanan Grab" : `Tambahkan ${selectedType} ${selectedPlatform}`}
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
                        <div className={`bg-white p-4 rounded-xl shadow-sm border relative overflow-hidden transition-all ${order.isStartPoint ? "border-blue-500 bg-blue-50" :
                            order.isEndPoint ? "border-red-500 bg-red-50" : "border-gray-100"
                            } ${order.isCompleted ? "opacity-60 grayscale-[0.5] bg-gray-50 border-dashed" : ""}`}>

                            {/* Sequence Number */}
                            <div className={`absolute left-2 top-3 w-8 h-8 flex items-center justify-center text-sm font-bold rounded-full shadow-md z-10 ${order.isStartPoint ? "bg-blue-600 text-white" :
                                order.isCompleted ? "bg-gray-400 text-white" : "bg-gray-900 text-white"
                                }`}>
                                {index + 1}
                            </div>

                            {/* Distance Info */}
                            {order.distance && order.distance !== "0 km" && !order.isCompleted && (
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
                                <div className="flex items-center flex-wrap gap-2 mb-2 pt-1">
                                    {order.serviceType && (
                                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                                            {order.serviceType}
                                        </span>
                                    )}
                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${order.platform === "Grab" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                                        }`}>
                                        {order.platform}
                                    </span>
                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${order.type === "Ambil" ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"
                                        }`}>
                                        {order.type}
                                    </span>
                                    {order.orderId && (
                                        <span className="text-[10px] font-medium text-gray-400">#{order.orderId}</span>
                                    )}
                                    {order.isCompleted && (
                                        <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">Selesai</span>
                                    )}
                                </div>

                                {order.recipientName && !order.isEditing && (
                                    <h3 className={`text-base font-black leading-tight mb-0.5 ${order.isCompleted ? "text-gray-400" : "text-gray-900"}`}>
                                        {order.recipientName}
                                    </h3>
                                )}

                                {/* Main Address (Cleaned) or Edit Input */}
                                {order.isEditing ? (
                                    <div className="mb-2">
                                        <textarea
                                            defaultValue={order.text}
                                            className="w-full text-sm border p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-black"
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
                                        className={`text-sm leading-snug mb-1 cursor-pointer transition ${order.isCompleted ? "text-gray-400 line-through" : "text-gray-600 font-medium hover:text-blue-600"
                                            }`}
                                        onClick={() => !order.isCompleted && toggleEdit(order.id)}
                                        title={order.isCompleted ? "" : "Klik untuk edit"}
                                    >
                                        {order.address}
                                    </p>
                                )}

                                {order.deadline && !order.isCompleted && (
                                    <div className="flex items-center gap-1 text-[11px] font-bold text-red-600 mb-2">
                                        <Clock className="w-3.5 h-3.5" />
                                        <span>Sampai sebelum {order.deadline}</span>
                                    </div>
                                )}


                                {/* Note Section */}
                                {order.note && !order.isEditing && !order.isCompleted && (
                                    <div className="bg-yellow-50 border border-yellow-100 text-yellow-800 text-xs p-2 rounded-lg mb-2">
                                        <span className="font-bold">Catatan:</span> {order.note}
                                    </div>
                                )}

                                <div className="flex items-center justify-between border-t border-gray-100 pt-3 mt-2">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => toggleComplete(order.id)}
                                            className={`p-1.5 rounded-lg transition ${order.isCompleted ? "bg-green-600 text-white" : "bg-gray-100 text-gray-400 hover:bg-green-100 hover:text-green-600"}`}
                                            title={order.isCompleted ? "Batalkan Selesai" : "Tandai Selesai"}
                                        >
                                            <Check className="w-4 h-4" />
                                        </button>
                                        {!order.isCompleted && (
                                            <>
                                                <button
                                                    onClick={() => toggleStartPoint(order.id)}
                                                    className={`p-1.5 rounded-lg transition ${order.isStartPoint ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                                                        }`}
                                                    title="Jadikan Titik Berangkat"
                                                >
                                                    <Home className="w-4 h-4" />
                                                </button>
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
                                            </>
                                        )}
                                        <button
                                            onClick={() => handleDelete(order.id)}
                                            className="p-1.5 bg-gray-100 text-gray-400 rounded-lg hover:bg-red-100 hover:text-red-600 transition"
                                            title="Hapus"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Link uses order.cleanedAddress if available, fallbacks to order.address */}
                                    {!order.isCompleted && (
                                        <a
                                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.cleanedAddress || order.address)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 text-blue-600 text-xs font-bold hover:underline bg-blue-50 px-3 py-1.5 rounded-lg"
                                        >
                                            <Navigation className="w-3 h-3" /> Jalan
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Reorder.Item>
                ))}
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
