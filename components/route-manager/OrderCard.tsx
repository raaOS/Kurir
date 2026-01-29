import { Check, ArrowDownUp, GripVertical, Clock, AlertTriangle, X, Home, Flag, Pencil, Clipboard, Trash2, Navigation } from "lucide-react";
import { Order } from "@/types/order";

interface OrderCardProps {
    order: Order;
    index: number;
    isEditing: boolean;
    toggleEdit: (id: string) => void;
    saveEdit: (id: string, text: string) => void;
    toggleComplete: (id: string) => void;
    toggleStartPoint: (id: string) => void;
    toggleEndPoint: (id: string) => void;
    handleDelete: (id: string) => void;
    setEditingNoteId: (id: string | null) => void;
    editingNoteId: string | null;
    tempNote: string;
    setTempNote: (val: string) => void;
    handleSaveNote: (id: string) => void;
    handleDeleteNote: (content: string) => void;
}

export function OrderCard({
    order,
    index,
    isEditing,
    toggleEdit,
    saveEdit,
    toggleComplete,
    toggleStartPoint,
    toggleEndPoint,
    handleDelete,
    editingNoteId,
    setEditingNoteId,
    tempNote,
    setTempNote,
    handleSaveNote,
    handleDeleteNote
}: OrderCardProps) {
    return (
        <div className={`p-4 rounded-xl shadow-sm border relative overflow-hidden transition-all ${order.isStartPoint ? "border-blue-500 bg-blue-50" :
            order.isEndPoint ? "border-red-500 bg-red-50" :
                order.groupColor ? order.groupColor : "bg-white border-gray-100"
            } ${order.isCompleted ? "opacity-60 grayscale-[0.5] bg-gray-50 border-dashed" : ""}`}>

            {/* Sequence Number */}
            <div className={`absolute left-2 top-3 w-8 h-8 flex items-center justify-center text-sm font-bold rounded-full shadow-md z-10 ${order.isStartPoint ? "bg-blue-600 text-white" :
                order.isCompleted ? "bg-gray-400 text-white" : "bg-gray-900 text-white"
                }`}>
                {index + 1}
            </div>

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

                {order.recipientName && !isEditing && (
                    <div className="flex flex-wrap items-center gap-2 mb-0.5">
                        <h3 className={`text-base font-black leading-tight ${order.isCompleted ? "text-gray-400" : "text-gray-900"}`}>
                            {order.recipientName}
                        </h3>
                        {order.zoneLabel && (
                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border opacity-80 whitespace-nowrap tracking-wide bg-white/50 border-gray-400 text-gray-700`}>
                                {order.zoneLabel}
                            </span>
                        )}
                    </div>
                )}

                {isEditing ? (
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

                {order.note && !isEditing && !order.isCompleted && (
                    <div className="bg-yellow-50 border border-yellow-100 text-yellow-800 text-xs p-2 rounded-lg mb-2">
                        <span className="font-bold">Catatan:</span> {order.note}
                    </div>
                )}

                {order.localNote && (
                    <div className="bg-yellow-100 border-l-4 border-yellow-400 p-2 rounded-r text-xs text-yellow-800 flex items-start justify-between mb-2">
                        <div>
                            <div className="font-bold flex items-center gap-1 mb-0.5">
                                <AlertTriangle className="w-3 h-3" />
                                Catatan Lokasi:
                            </div>
                            {order.localNote}
                        </div>
                        <button onClick={() => handleDeleteNote(order.localNote!)} className="text-yellow-600 hover:text-red-600 p-1">
                            <X className="w-3 h-3" />
                        </button>
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
                                    className={`p-1.5 rounded-lg transition ${order.isStartPoint ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-400 hover:bg-gray-200"}`}
                                    title="Jadikan Titik Berangkat"
                                >
                                    <Home className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => toggleEndPoint(order.id)}
                                    className={`p-1.5 rounded-lg transition ${order.isEndPoint ? "bg-red-600 text-white" : "bg-gray-100 text-gray-400 hover:bg-gray-200"}`}
                                    title="Jadikan Titik Akhir"
                                >
                                    <Flag className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => toggleEdit(order.id)}
                                    className={`p-1.5 rounded-lg transition ${isEditing ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-400 hover:bg-blue-100 hover:text-blue-600"}`}
                                    title="Edit Alamat"
                                >
                                    <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => {
                                        setEditingNoteId(editingNoteId === order.id ? null : order.id);
                                        setTempNote(order.localNote || "");
                                    }}
                                    className={`p-1.5 rounded-lg transition ${order.localNote ? "bg-yellow-100 text-yellow-600" : "bg-gray-100 text-gray-400 hover:bg-yellow-50 hover:text-yellow-600"}`}
                                    title={order.localNote ? "Edit Catatan Lokasi" : "Tambah Catatan Lokasi"}
                                >
                                    <Clipboard className="w-4 h-4" />
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

                {editingNoteId === order.id && (
                    <div className="mt-2 mb-2 p-2 bg-yellow-50 border border-yellow-100 rounded-lg animate-in slide-in-from-top-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Catatan untuk area ini:</label>
                        <textarea
                            value={tempNote}
                            onChange={(e) => setTempNote(e.target.value)}
                            className="w-full text-xs p-2 border rounded mb-2 h-16 resize-none focus:outline-none focus:border-yellow-400"
                            placeholder="Contoh: Awas anjing galak, Pagar hitam..."
                            autoFocus
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleSaveNote(order.id)}
                                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded flex-1 transition"
                            >
                                Simpan Catatan
                            </button>
                            <button
                                onClick={() => setEditingNoteId(null)}
                                className="bg-gray-200 hover:bg-gray-300 text-gray-600 text-xs font-bold px-3 py-1.5 rounded transition"
                            >
                                Batal
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
