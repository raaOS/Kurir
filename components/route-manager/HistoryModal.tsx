import { X, Archive, CloudUpload, CloudDownload, Trash2, ArrowDownUp } from "lucide-react";
import { HistorySession } from "@/types/order";

interface HistoryModalProps {
    showHistory: boolean;
    setShowHistory: (val: boolean) => void;
    history: HistorySession[];
    setHistory: (val: HistorySession[]) => void;
    loading: boolean;
    handleBackupToCloud: () => void;
    handleRestoreFromCloud: () => void;
    handleSmartCleanup: (days: number) => void;
}

export function HistoryModal({
    showHistory,
    setShowHistory,
    history,
    setHistory,
    loading,
    handleBackupToCloud,
    handleRestoreFromCloud,
    handleSmartCleanup
}: HistoryModalProps) {
    if (!showHistory) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
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
                                    {session.orders.map((o) => (
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
    );
}
