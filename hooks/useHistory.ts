import { useState, useEffect } from "react";
import { Order, HistorySession } from "@/types/order";

export function useHistory() {
    const [history, setHistory] = useState<HistorySession[]>([]);
    const [totalRevenue, setTotalRevenue] = useState<string>("");

    useEffect(() => {
        const savedRevenue = localStorage.getItem("kurir_revenue");
        if (savedRevenue) setTotalRevenue(savedRevenue);

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

    useEffect(() => {
        localStorage.setItem("kurir_revenue", totalRevenue);
    }, [totalRevenue]);

    const handleBackupToCloud = async (currentHistory: HistorySession[]) => {
        try {
            const res = await fetch("/api/backup-history", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ history: currentHistory })
            });
            if (res.ok) alert("Backup Cloud Berhasil!");
        } catch (e) {
            alert("Backup Gagal!");
        }
    };

    const handleRestoreFromCloud = async () => {
        try {
            const res = await fetch("/api/backup-history");
            if (res.ok) {
                const data = await res.json();
                if (data.history) {
                    setHistory(data.history);
                    alert("Restore Berhasil!");
                }
            }
        } catch (e) {
            alert("Restore Gagal!");
        }
    };

    return {
        history,
        setHistory,
        totalRevenue,
        setTotalRevenue,
        handleBackupToCloud,
        handleRestoreFromCloud
    };
}
