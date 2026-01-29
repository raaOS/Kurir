"use client";

import { useState, useEffect } from "react";
import { Reorder, useDragControls } from "framer-motion";
import { Plus, MapPin, Flag, Home, Navigation, Trash2, ArrowRight, ArrowDownUp, GripVertical, Pencil, Check, X, Clock, Archive, CloudUpload, History, CloudDownload, AlertTriangle } from "lucide-react";
import { mergeHistorySessions } from "@/lib/history-utils";

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
    distanceSource?: "google" | "ai_estimate";
    confidence?: number; // 0-100
    label?: "clean" | "warning" | "conflict";
}

interface HistorySession {
    date: string; // Display date
    timestamp?: number; // For sorting/cleaning (optional for backward compat)
    orders: Order[];
    totalRevenue: string;
}

export function RouteManager() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [history, setHistory] = useState<HistorySession[]>([]); // Archive
    const [totalRevenue, setTotalRevenue] = useState<string>(""); // Global Revenue
    const [inputText, setInputText] = useState("");
    const [startPoint, setStartPoint] = useState(""); // New State
    const [loading, setLoading] = useState(false);
    const [showHistory, setShowHistory] = useState(false); // UI Toggle
    const [previewOrders, setPreviewOrders] = useState<Order[]>([]); // Parsing Preview
    const [showPreview, setShowPreview] = useState(false);

    // Manual selections
    const [selectedPlatform, setSelectedPlatform] = useState<Platform>("Grab");
    const [selectedType, setSelectedType] = useState<OrderType>("Ambil");

    // Quick helper to generate ID
    const generateId = () => Math.random().toString(36).substr(2, 9);

    // Load persistence
    useEffect(() => {
        const savedOrders = localStorage.getItem("kurir_orders");
        const savedRevenue = localStorage.getItem("kurir_revenue");
        const savedStart = localStorage.getItem("kurir_startpoint");

        if (savedOrders) setOrders(JSON.parse(savedOrders));
        if (savedRevenue) setTotalRevenue(savedRevenue);
        if (savedStart) setStartPoint(savedStart);

        // Fetch history from Cloud (GitHub) instead of localStorage
        const fetchHistory = async () => {
            try {
                const res = await fetch("/api/backup-history");
                if (res.ok) {
                    const data = await res.json();
                    if (data.history) setHistory(data.history);
                }
            } catch (e) {
                console.error("Gagal load riwayat dari cloud:", e);
            }
        };
        fetchHistory();
    }, []);

    // Sync persistence (Active Orders only)
    useEffect(() => {
        localStorage.setItem("kurir_orders", JSON.stringify(orders));
        localStorage.setItem("kurir_revenue", totalRevenue);
        localStorage.setItem("kurir_startpoint", startPoint);
    }, [orders, totalRevenue, startPoint]);

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

    const handleFinishDay = async () => {
        if (orders.length === 0) return;
        if (!confirm("Selesaikan hari ini dan masukkan ke riwayat?")) return;

        setLoading(true);
        try {
            // 1. Prepare new session
            const newSession: HistorySession = {
                date: new Date().toLocaleString("id-ID"),
                timestamp: Date.now(),
                orders: [...orders],
                totalRevenue: totalRevenue || "Rp0"
            };

            // 2. Fetch existing cloud data to ensure we don't overwrite
            let cloudHistory: HistorySession[] = [];
            try {
                const res = await fetch("/api/backup-history");
                if (res.ok) {
                    const data = await res.json();
                    cloudHistory = data.history || [];
                }
            } catch (e) {
                console.warn("Offline or fetch failed, using local only", e);
            }

            // 3. Merge: Cloud + Local + New
            const mergedHistory = mergeHistorySessions([...history, newSession], cloudHistory);

            // 4. Push active update
            await fetch("/api/backup-history", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ history: mergedHistory }),
            });

            // 5. Update Local
            setHistory(mergedHistory);
            setOrders([]);
            setTotalRevenue("");
            alert("Hari ini telah diselesaikan dan aman tersimpan di Cloud (Safe Sync)!");

        } catch (e: any) {
            alert("Gagal sync: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleBackupToCloud = async () => {
        setLoading(true);
        try {
            // Safe Sync Strategy: Fetch -> Merge -> Push
            const res = await fetch("/api/backup-history");
            let cloudHistory: HistorySession[] = [];
            if (res.ok) {
                const data = await res.json();
                cloudHistory = data.history || [];
            }

            const mergedHistory = mergeHistorySessions(history, cloudHistory);

            const response = await fetch("/api/backup-history", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ history: mergedHistory }),
            });

            if (!response.ok) throw new Error("Gagal push ke cloud");

            setHistory(mergedHistory);
            alert("Backup & Sync Berhasil! Data Cloud dan HP sudah diselaraskan.");
        } catch (e: any) {
            alert("Error: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleRestoreFromCloud = async () => {
        if (!confirm("Ambil data dari Cloud? Ini akan menggabungkan riwayat yang ada di Cloud ke HP ini.")) return;

        setLoading(true);
        try {
            const response = await fetch("/api/backup-history");
            if (!response.ok) throw new Error("Gagal ambil data dari cloud");

            const data = await response.json();
            if (data.history && data.history.length > 0) {
                // Merge logic: avoid duplicates by date
                const cloudHistory = data.history;
                const merged = mergeHistorySessions(history, cloudHistory);

                if (merged.length === history.length) {
                    // Primitive check if anything new was added
                    // (Assuming merged logic works correctly, if length is same, likely no new unique items)
                    alert("Data di Cloud sama dengan data di HP. Tidak ada yang perlu diupdate.");
                } else {
                    setHistory(merged);
                    alert(`Berhasil sinkronisasi dengan Cloud!`);
                }


            } else {
                alert("Cloud masih kosong. Belum ada data untuk ditarik.");
            }
        } catch (e: any) {
            alert("Error: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSmartCleanup = async (days: number) => {
        if (!confirm(`Hapus riwayat yang lebih lama dari ${days} hari?`)) return;

        setLoading(true);
        try {
            // 1. Fetch Cloud first to clean everything
            const res = await fetch("/api/backup-history");
            let fullHistory = history;
            if (res.ok) {
                const data = await res.json();
                if (data.history) fullHistory = data.history;
            }

            const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);

            // 2. Filter with improved legacy date parsing
            const keptHistory = fullHistory.filter((h: HistorySession) => {
                const ts = h.timestamp || new Date(h.date).getTime();
                // If ts is NaN (invalid date), keep it to be safe.
                if (!ts || isNaN(ts)) return true;
                return ts > cutoff;
            });

            const deletedCount = fullHistory.length - keptHistory.length;

            if (deletedCount === 0) {
                alert("Tidak ada data lama yang perlu dihapus.");
                return;
            }

            // 3. Push Cleaned List
            await fetch("/api/backup-history", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ history: keptHistory }),
            });

            setHistory(keptHistory);
            alert(`Berhasil membersihkan ${deletedCount} riwayat lama.`);
        } catch (e: any) {
            alert("Gagal cleanup: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!inputText.trim()) return;

        if (selectedPlatform === "Grab" || selectedPlatform === "Shopee") {
            setLoading(true);
            try {
                const response = await fetch("/api/extract-orders", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text: inputText, platform: selectedPlatform }),
                });

                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.details || data.error || "Gagal extract data Grab");
                }

                // New Response Structure: { orders: [{ pickup: {...}, dropoff: {...} }], route_order: [...] }
                const { orders: rawOrders, total_revenue } = data;
                if (total_revenue) setTotalRevenue(total_revenue);

                const formattedOrders: Order[] = [];

                interface ApiOrder {
                    ambil?: { gps: string; note: string };
                    antar?: { gps: string; note: string };
                    recipient_name?: string;
                    order_id?: string;
                    deadline?: string;
                    service_type?: string;
                    confidence: number;
                    warnings: string[];
                }

                rawOrders.forEach((raw: ApiOrder) => {
                    const hasConflict = raw.warnings && (raw.warnings.includes("KONFLIK_ALAMAT") || raw.warnings.includes("KONFLIK_TERDETEKSI") || raw.warnings.includes("ALAMAT_NUMPANG"));

                    // 1. Process Pickup (Ambil)
                    if (raw.ambil && (raw.ambil.gps || raw.ambil.note)) {
                        formattedOrders.push({
                            id: generateId(),
                            text: inputText,
                            address: raw.ambil.gps || "",
                            note: raw.ambil.note || "",
                            recipientName: raw.recipient_name || "Pengirim",
                            type: "Ambil",
                            platform: selectedPlatform,
                            orderId: raw.order_id,
                            deadline: raw.deadline,
                            serviceType: raw.service_type,
                            isEndPoint: false,
                            isStartPoint: false,
                            distance: "",
                            confidence: raw.confidence, // Use global confidence
                            label: hasConflict ? "conflict" : (raw.confidence > 80 ? "clean" : "warning")
                        });
                    }

                    // 2. Process Dropoff (Antar)
                    if (raw.antar && (raw.antar.gps || raw.antar.note)) {
                        formattedOrders.push({
                            id: generateId(),
                            text: inputText,
                            address: raw.antar.gps || "",
                            note: raw.antar.note || "",
                            recipientName: raw.recipient_name || "Penerima",
                            type: "Antar",
                            platform: selectedPlatform,
                            orderId: raw.order_id,
                            deadline: raw.deadline,
                            serviceType: raw.service_type,
                            isEndPoint: false,
                            isStartPoint: false,
                            distance: "",
                            confidence: raw.confidence, // Use global confidence
                            label: hasConflict ? "conflict" : (raw.confidence > 80 ? "clean" : "warning")
                        });
                    }
                });

                setPreviewOrders(formattedOrders);
                setShowPreview(true);
                setInputText("");
            } catch (e: any) {
                alert(`Gagal: ${e.message}`);
                console.error(e);
            } finally {
                setLoading(false);
            }
        } else {
            // Manual Add for Generic
            const newOrder: Order = {
                id: generateId(),
                text: inputText,
                address: inputText,
                type: selectedType,
                platform: selectedPlatform,
                isEndPoint: false,
                isStartPoint: false,
                distance: "",
                confidence: 100,
                label: "clean"
            };

            setOrders([...orders, newOrder]);
            setInputText("");
        }
    };

    const confirmPreview = () => {
        // Deduplication Logic
        const filteredNewOrders = previewOrders.filter((newOrder) => {
            const exists = orders.some(
                (existing) =>
                    existing.orderId === newOrder.orderId &&
                    existing.type === newOrder.type &&
                    existing.platform === newOrder.platform
            );
            return !exists;
        });

        if (filteredNewOrders.length === 0 && previewOrders.length > 0) {
            alert("Semua pesanan sudah ada di daftar.");
        } else {
            if (filteredNewOrders.length < previewOrders.length) {
                alert(`${previewOrders.length - filteredNewOrders.length} pesanan duplikat dilewati.`);
            }
            setOrders([...orders, ...filteredNewOrders]);
        }

        setShowPreview(false);
        setPreviewOrders([]);
    };

    const updatePreviewOrder = (id: string, field: keyof Order, value: any) => {
        setPreviewOrders(prev => prev.map(o => o.id === id ? { ...o, [field]: value } : o));
    };

    const removePreviewOrder = (id: string) => {
        setPreviewOrders(prev => prev.filter(o => o.id !== id));
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
                        address: data.cleaned_address || o.address,
                        distanceSource: data.distanceSource
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
            <div className="flex items-center justify-between px-1">
                <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                    <MapPin className="text-blue-600 w-7 h-7" />
                    Kurir Asisten
                </h1>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowHistory(true)}
                        className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition text-gray-600"
                        title="Lihat Riwayat"
                    >
                        <History size={20} />
                    </button>
                    <button
                        onClick={handleFinishDay}
                        className="p-2 bg-green-100 hover:bg-green-200 rounded-full transition text-green-700"
                        title="Selesaikan Hari Ini"
                    >
                        <Archive size={20} />
                    </button>
                </div>
            </div>

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
                            {/* Distance Info */}
                            {order.distance && order.distance !== "0 km" && !order.isCompleted && (
                                <div className={`absolute top-3 right-3 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 ${order.distanceSource === "google"
                                    ? "bg-green-100 text-green-700 border border-green-200"
                                    : "bg-indigo-50 text-indigo-700"
                                    }`}>
                                    {order.distanceSource === "google" ? <Check className="w-3 h-3" /> : <ArrowDownUp className="w-3 h-3" />}
                                    {order.distanceSource === "google" ? "Maps: " : "+"}
                                    {order.distance}
                                </div>
                            )}

                            {/* Drag Handle */}
                            <div className="absolute left-3 top-14 text-gray-300 cursor-grab active:cursor-grabbing p-1">
                                <GripVertical className="w-5 h-5" />
                            </div>

                            <div className="pl-12 pr-2">
                                <div className="flex items-center flex-wrap gap-2 mb-2 pt-1">
                                    {order.serviceType &&
                                        !["AMBIL", "ANTAR", "DIAMBIL", "DIANTAR", "SHOPEE", "GRAB"].includes(order.serviceType.toUpperCase()) &&
                                        order.serviceType.toUpperCase() !== order.platform.toUpperCase() && (
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


            {/* Preview / Review Modal */}
            {showPreview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-4 border-b flex items-center justify-between bg-blue-50">
                            <div>
                                <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                                    <CloudDownload className="w-5 h-5 text-blue-600" />
                                    Review Hasil AI
                                </h2>
                                <p className="text-xs text-blue-600 font-bold opacity-80">
                                    Cek alamat & catatan sebelum masuk daftar
                                </p>
                            </div>
                            <button
                                onClick={() => { setShowPreview(false); setPreviewOrders([]); }}
                                className="p-2 hover:bg-blue-100 rounded-full transition text-blue-400"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                            {previewOrders.map((order, idx) => (
                                <div key={order.id} className={`p-4 rounded-xl border bg-white shadow-sm transition-all ${order.label === 'conflict' ? 'border-red-300 ring-2 ring-red-50' :
                                    order.label === 'warning' ? 'border-orange-300' : 'border-gray-100'
                                    }`}>
                                    {/* Header Badges */}
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex gap-2 items-center">
                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${order.type === "Ambil" ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"}`}>
                                                {order.type}
                                            </span>
                                            {order.confidence !== undefined && (
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${order.confidence > 80 ? "bg-green-100 text-green-700" :
                                                    order.confidence > 50 ? "bg-orange-100 text-orange-700" : "bg-red-100 text-red-700"
                                                    }`}>
                                                    {order.confidence}% Akurat
                                                </span>
                                            )}
                                        </div>
                                        {order.label === 'conflict' && (
                                            <span className="text-[10px] font-bold bg-red-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                                                <AlertTriangle size={10} /> KONFLIK
                                            </span>
                                        )}
                                        <button onClick={() => removePreviewOrder(order.id)} className="text-gray-300 hover:text-red-500">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>

                                    {/* Address Input */}
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1 mb-1">
                                                <MapPin size={10} /> Alamat Maps (Bersih)
                                            </label>
                                            <input
                                                type="text"
                                                value={order.address}
                                                onChange={(e) => updatePreviewOrder(order.id, 'address', e.target.value)}
                                                className="w-full text-sm font-medium border-b border-gray-200 focus:border-blue-500 focus:outline-none py-1 bg-transparent"
                                                placeholder="Jalan..."
                                            />
                                        </div>

                                        {/* Note Input */}
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1 mb-1">
                                                <Pencil size={10} /> Catatan / Patokan
                                            </label>
                                            <textarea
                                                value={order.note || ""}
                                                onChange={(e) => updatePreviewOrder(order.id, 'note', e.target.value)}
                                                className="w-full text-xs text-gray-600 bg-yellow-50/50 p-2 rounded-lg border border-yellow-100 focus:border-yellow-300 focus:outline-none resize-none"
                                                rows={2}
                                                placeholder="Warna rumah, pagar, atau peringatan..."
                                            />
                                        </div>

                                        {/* Meta Info */}
                                        <div className="grid grid-cols-2 gap-2">
                                            <input
                                                value={order.recipientName || ""}
                                                onChange={(e) => updatePreviewOrder(order.id, 'recipientName', e.target.value)}
                                                placeholder="Nama Penerima"
                                                className="text-xs border p-1 rounded bg-gray-50"
                                            />
                                            {order.orderId && (
                                                <div className="text-xs bg-gray-100 p-1.5 rounded text-center font-mono text-gray-500">
                                                    #{order.orderId}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-4 border-t bg-white flex gap-3">
                            <button
                                onClick={() => { setShowPreview(false); setPreviewOrders([]); }}
                                className="flex-1 py-3 text-gray-500 font-bold text-sm hover:bg-gray-100 rounded-xl transition"
                            >
                                Batal
                            </button>
                            <button
                                onClick={confirmPreview}
                                className="flex-[2] py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-200 transition active:scale-95 flex justify-center items-center gap-2"
                            >
                                <Check size={18} />
                                Tambahkan {previewOrders.length} Pesanan
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* History Modal */}

            {showHistory && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
                        <div className="p-5 border-b flex items-center justify-between bg-gray-50">
                            <div>
                                <h2 className="text-xl font-black text-gray-900">Gudang Arsip</h2>
                                <p className="text-xs text-gray-500 font-medium">Riwayat perjalanan Anda</p>
                            </div>
                            <button
                                onClick={() => setShowHistory(false)}
                                className="p-2 hover:bg-gray-200 rounded-full transition"
                            >
                                <X size={20} className="text-gray-500" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {history.length === 0 ? (
                                <div className="text-center py-10">
                                    <Archive className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                                    <p className="text-gray-400 font-medium">Belum ada riwayat tersimpan.</p>
                                </div>
                            ) : (
                                history.map((session, idx) => (
                                    <div key={idx} className="border rounded-xl p-4 bg-white hover:border-blue-200 transition">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h3 className="font-bold text-gray-900">{session.date}</h3>
                                                <p className="text-xs text-green-600 font-bold">{session.totalRevenue}</p>
                                            </div>
                                            <span className="text-[10px] font-bold bg-gray-100 px-2 py-0.5 rounded-full text-gray-500">
                                                {session.orders.length} Titik
                                            </span>
                                        </div>
                                        <div className="space-y-1 mt-3 opacity-80 border-t pt-3">
                                            {session.orders.map((o, i) => (
                                                <div key={o.id} className="text-[11px] flex items-center gap-1 text-gray-600 truncate">
                                                    <span className={`w-1.5 h-1.5 rounded-full ${o.type === 'Ambil' ? 'bg-blue-400' : 'bg-red-400'}`}></span>
                                                    <span className="font-bold">[{o.type}]</span> {o.recipientName || o.address}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="p-5 border-t bg-gray-50 flex flex-col gap-3">
                            <div className="flex gap-3">
                                <button
                                    onClick={handleBackupToCloud}
                                    disabled={loading || history.length === 0}
                                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition shadow-md shadow-blue-200"
                                >
                                    {loading ? <ArrowDownUp size={16} className="animate-spin" /> : <CloudUpload size={16} />}
                                    Backup ke Cloud
                                </button>
                                <button
                                    onClick={handleRestoreFromCloud}
                                    disabled={loading}
                                    className="flex-1 py-3 bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition shadow-sm"
                                >
                                    {loading ? <ArrowDownUp size={16} className="animate-spin" /> : <CloudDownload size={16} />}
                                    Ambil dari Cloud
                                </button>
                            </div>

                            {/* Smart Cleanup Section */}
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => handleSmartCleanup(7)}
                                    className="py-2.5 bg-orange-50 text-orange-600 hover:bg-orange-100 rounded-lg text-xs font-bold border border-orange-100 transition"
                                >
                                    Hapus {'>'} 7 Hari
                                </button>
                                <button
                                    onClick={() => handleSmartCleanup(30)}
                                    className="py-2.5 bg-orange-50 text-orange-600 hover:bg-orange-100 rounded-lg text-xs font-bold border border-orange-100 transition"
                                >
                                    Hapus {'>'} 30 Hari
                                </button>
                            </div>

                            <button
                                onClick={() => {
                                    if (confirm("Hapus seluruh riwayat lokal? (Cloud aman)")) {
                                        setHistory([]);
                                    }
                                }}
                                className="w-full py-2 bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
                                title="Hapus Semua Lokal"
                            >
                                <Trash2 size={14} /> Hapus Lokal Saja
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
