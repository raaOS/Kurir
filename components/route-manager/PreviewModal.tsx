import { X, CloudDownload, Trash2, MapPin, Pencil, AlertTriangle, Check } from "lucide-react";
import { Order } from "@/types/order";

interface PreviewModalProps {
    showPreview: boolean;
    setShowPreview: (val: boolean) => void;
    previewOrders: Order[];
    setPreviewOrders: (val: Order[]) => void;
    confirmPreview: () => void;
    updatePreviewOrder: (id: string, field: keyof Order, value: any) => void;
    removePreviewOrder: (id: string) => void;
}

export function PreviewModal({
    showPreview,
    setShowPreview,
    previewOrders,
    setPreviewOrders,
    confirmPreview,
    updatePreviewOrder,
    removePreviewOrder
}: PreviewModalProps) {
    if (!showPreview) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
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
                    {previewOrders.map((order) => (
                        <div key={order.id} className={`p-4 rounded-xl border bg-white shadow-sm transition-all ${order.label === 'conflict' ? 'border-red-300 ring-2 ring-red-50' :
                            order.label === 'warning' ? 'border-orange-300' : 'border-gray-100'
                            }`}>
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
                                {order.locationHint && (
                                    <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full flex items-center gap-1 mx-2">
                                        🏢 {order.locationHint.guess}
                                    </span>
                                )}
                                {order.label === 'conflict' && (
                                    <span className="text-[10px] font-bold bg-red-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                                        <AlertTriangle size={10} /> KONFLIK
                                    </span>
                                )}
                                <button onClick={() => removePreviewOrder(order.id)} className="text-gray-300 hover:text-red-500">
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1 mb-1">
                                        <MapPin size={10} /> Alamat Maps (Bersih)
                                    </label>
                                    <input
                                        type="text"
                                        value={order.address}
                                        onChange={(e) => updatePreviewOrder(order.id, 'address', e.target.value)}
                                        className="w-full text-sm font-medium text-black border-b border-gray-200 focus:border-blue-500 focus:outline-none py-1 bg-white"
                                        placeholder="Jalan..."
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1 mb-1">
                                        <Pencil size={10} /> Catatan / Patokan
                                    </label>
                                    <textarea
                                        value={order.note || ""}
                                        onChange={(e) => updatePreviewOrder(order.id, 'note', e.target.value)}
                                        className="w-full text-xs text-black bg-yellow-50 p-2 rounded-lg border border-yellow-100 focus:border-yellow-300 focus:outline-none resize-none"
                                        rows={2}
                                        placeholder="Warna rumah, pagar, atau peringatan..."
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <input
                                        value={order.recipientName || ""}
                                        onChange={(e) => updatePreviewOrder(order.id, 'recipientName', e.target.value)}
                                        placeholder="Nama Penerima"
                                        className="text-xs border p-1 rounded bg-white text-black pl-2"
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
    );
}
