export type OrderType = "Ambil" | "Antar";
export type Platform = "Grab" | "Shopee";

export interface LocationNote {
    id: string;
    keyword: string; // The triggered address part
    note: string;
    timestamp: number;
}

export interface Order {
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
    locationHint?: { guess: string; confidence: number; reason: string };
    localNote?: string; // From Local Intel
    groupColor?: string; // For Smart Grouping
    zoneLabel?: string; // e.g. "JAKSEL"
    lat?: number;
    lng?: number;
}

export interface HistorySession {
    date: string; // Display date
    timestamp?: number; // For sorting/cleaning (optional for backward compat)
    orders: Order[];
    totalRevenue: string;
}
