
export interface HistorySession {
    date: string;
    timestamp?: number;
    orders: any[];
    totalRevenue: string;
}

export function mergeHistorySessions(local: HistorySession[], cloud: HistorySession[]): HistorySession[] {
    const uniqueMap = new Map<number | string, HistorySession>();

    // Helper to get unique key (Timestamp is best, fallback to date string)
    const getUniqueKey = (h: HistorySession) => h.timestamp || h.date;

    // Cloud first, then Local (Local overwrites if conflict? Usually we want latest. 
    // But here we just want union. If keys match, last one wins.
    // We assume identical content for same key, or we prefer one.
    // Let's combine both lists.
    [...cloud, ...local].forEach(h => uniqueMap.set(getUniqueKey(h), h));

    return Array.from(uniqueMap.values()).sort((a, b) => {
        const tA = a.timestamp || new Date(a.date).getTime() || 0;
        const tB = b.timestamp || new Date(b.date).getTime() || 0;
        return tB - tA; // Newest first
    });
}
