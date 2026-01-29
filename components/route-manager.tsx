"use client";

import { useState } from "react";
import { Reorder } from "framer-motion";
import { MapPin, List, Map as MapIcon, History, Archive } from "lucide-react";
import dynamic from "next/dynamic";

// Hooks
import { useOrders } from "@/hooks/useOrders";
import { useHistory } from "@/hooks/useHistory";
import { useLocationNotes } from "@/hooks/useLocationNotes";

// Types
import { Order } from "@/types/order";

// Components
import { RevenueBanner } from "./route-manager/RevenueBanner";
import { OrderInput } from "./route-manager/OrderInput";
import { ActionBar } from "./route-manager/ActionBar";
import { StartPointInput } from "./route-manager/StartPointInput";
import { OrderCard } from "./route-manager/OrderCard";
import { HistoryModal } from "./route-manager/HistoryModal";
import { PreviewModal } from "./route-manager/PreviewModal";

const MapView = dynamic(() => import("./map-view").then(mod => mod.MapView), {
    ssr: false,
    loading: () => <div className="h-64 bg-gray-100 animate-pulse rounded-xl flex items-center justify-center">Memuat Peta...</div>
});

export function RouteManager() {
    // 1. Logic Hooks
    const {
        orders, setOrders, startPoint, setStartPoint, loading, setLoading,
        inputText, setInputText, selectedPlatform, setSelectedPlatform,
        selectedType, setSelectedType, previewOrders, setPreviewOrders,
        showPreview, setShowPreview, viewMode, setViewMode,
        handleAdd, confirmPreview, handleOptimize, assignSmartGrouping
    } = useOrders();

    const {
        history, setHistory, totalRevenue, setTotalRevenue,
        handleBackupToCloud, handleRestoreFromCloud
    } = useHistory();

    const {
        findLocalNote, handleDeleteNote, addLocationNote
    } = useLocationNotes();

    // 2. UI State
    const [showHistory, setShowHistory] = useState(false);
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
    const [tempNote, setTempNote] = useState("");

    // 3. Local Handlers (Bridging Hooks/UI)
    const handleAddWithNote = () => handleAdd(findLocalNote);

    const handleIndividualDelete = (id: string) => {
        const order = orders.find(o => o.id === id);
        if (order && confirm(`Hapus pesanan dari ${order.recipientName || "Sini"}?`)) {
            setOrders(orders.filter(o => o.id !== id));
        }
    };

    const handleClearAll = () => {
        if (orders.length === 0) return;
        if (confirm(`Hapus seluruh ${orders.length} pesanan dari daftar?`)) {
            setOrders([]);
        }
    };

    const toggleComplete = (id: string) => {
        setOrders(orders.map(o => {
            if (o.id === id) {
                const newState = !o.isCompleted;
                // Auto-update Start Point if completed
                if (newState) {
                    setStartPoint(o.address);
                }
                return { ...o, isCompleted: newState, isEndPoint: false, isStartPoint: false };
            }
            return o;
        }));
    };

    const toggleStartPoint = (id: string) => {
        const target = orders.find(o => o.id === id);
        if (target) setStartPoint(!target.isStartPoint ? target.address : "");
        setOrders(orders.map(o => ({
            ...o,
            isStartPoint: o.id === id ? !o.isStartPoint : false,
            isEndPoint: o.id === id ? false : o.isEndPoint
        })));
    };

    const saveEdit = (id: string, newText: string) => {
        setOrders(orders.map(o => o.id === id ? { ...o, text: newText, address: newText, cleanedAddress: undefined, note: undefined, isEditing: false } : o));
    };

    const handleSaveLocalNote = (orderId: string) => {
        const order = orders.find(o => o.id === orderId);
        if (order && tempNote) {
            addLocationNote(order.address, tempNote);
            setOrders(orders.map(o => o.id === orderId ? { ...o, localNote: tempNote } : o));
            setEditingNoteId(null);
            setTempNote("");
        }
    };

    const handleFinishDay = () => {
        if (orders.length === 0) return;
        if (confirm("Simpan sesi hari ini ke riwayat dan bersihkan daftar?")) {
            const session = {
                date: new Date().toLocaleDateString("id-ID", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
                timestamp: Date.now(),
                orders: orders,
                totalRevenue: totalRevenue || "Rp0"
            };
            setHistory([session, ...history]);
            setOrders([]);
            setTotalRevenue("");
            alert("Sesi disimpan!");
        }
    };

    const handleSmartCleanup = (days: number) => {
        const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
        setHistory(prev => prev.filter(s => !s.timestamp || s.timestamp > cutoff));
        alert(`Riwayat lebih dari ${days} hari telah dibersihkan.`);
    };

    return (
        <div className="w-full max-w-lg mx-auto space-y-6 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between px-1">
                <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                    <MapPin className="text-blue-600 w-7 h-7" />
                    Kurir Asisten
                </h1>
                <div className="flex gap-2">
                    <div className="flex bg-gray-100 rounded-lg p-1 mr-2">
                        <button onClick={() => setViewMode("list")} className={`p-1.5 rounded-md transition ${viewMode === "list" ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"}`}>
                            <List size={18} />
                        </button>
                        <button onClick={() => setViewMode("map")} className={`p-1.5 rounded-md transition ${viewMode === "map" ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"}`}>
                            <MapIcon size={18} />
                        </button>
                    </div>
                    <button onClick={() => setShowHistory(true)} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition text-gray-600"><History size={20} /></button>
                    <button onClick={handleFinishDay} className="p-2 bg-green-100 hover:bg-green-200 rounded-full transition text-green-700"><Archive size={20} /></button>
                </div>
            </div>

            <RevenueBanner totalRevenue={totalRevenue} />

            <OrderInput
                inputText={inputText} setInputText={setInputText}
                selectedPlatform={selectedPlatform} setSelectedPlatform={setSelectedPlatform}
                selectedType={selectedType} setSelectedType={setSelectedType}
                loading={loading} handleAdd={handleAddWithNote}
            />

            <ActionBar
                ordersCount={orders.length} loading={loading}
                handleClearAll={handleClearAll} handleOptimize={() => handleOptimize(setTotalRevenue)}
            />

            <StartPointInput
                startPoint={startPoint} setStartPoint={setStartPoint}
                handleUseCurrentLocation={() => {
                    if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition((pos) => {
                            setStartPoint(`${pos.coords.latitude},${pos.coords.longitude}`);
                        });
                    }
                }}
            />

            {viewMode === "map" ? (
                <MapView orders={orders.filter(o => !o.isCompleted)} />
            ) : (
                <Reorder.Group axis="y" values={orders} onReorder={setOrders} className="space-y-3">
                    {orders.map((order, index) => (
                        <Reorder.Item key={order.id} value={order} className="touch-none">
                            <OrderCard
                                order={order} index={index}
                                isEditing={order.isEditing || false}
                                toggleEdit={(id) => setOrders(orders.map(o => o.id === id ? { ...o, isEditing: !o.isEditing } : o))}
                                saveEdit={saveEdit}
                                toggleComplete={toggleComplete}
                                toggleStartPoint={toggleStartPoint}
                                toggleEndPoint={(id) => setOrders(orders.map(o => ({ ...o, isEndPoint: o.id === id ? !o.isEndPoint : false })))}
                                handleDelete={handleIndividualDelete}
                                editingNoteId={editingNoteId} setEditingNoteId={setEditingNoteId}
                                tempNote={tempNote} setTempNote={setTempNote}
                                handleSaveNote={handleSaveLocalNote}
                                handleDeleteNote={handleDeleteNote}
                            />
                        </Reorder.Item>
                    ))}
                    {orders.length === 0 && (
                        <div className="text-center text-gray-400 py-10">
                            <p>Belum ada orderan.</p>
                            <p className="text-xs">Paste alamat di atas dan klik Tambah.</p>
                        </div>
                    )}
                </Reorder.Group>
            )}

            <HistoryModal
                showHistory={showHistory} setShowHistory={setShowHistory}
                history={history} setHistory={setHistory}
                loading={loading} handleBackupToCloud={() => handleBackupToCloud(history)}
                handleRestoreFromCloud={handleRestoreFromCloud}
                handleSmartCleanup={handleSmartCleanup}
            />

            <PreviewModal
                showPreview={showPreview} setShowPreview={setShowPreview}
                previewOrders={previewOrders} setPreviewOrders={setPreviewOrders}
                confirmPreview={confirmPreview}
                updatePreviewOrder={(id, field, value) => setPreviewOrders(previewOrders.map(o => o.id === id ? { ...o, [field]: value } : o))}
                removePreviewOrder={(id) => setPreviewOrders(previewOrders.filter(o => o.id !== id))}
            />
        </div>
    );
}
