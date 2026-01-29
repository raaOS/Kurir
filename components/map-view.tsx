"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useState } from "react";
import { Navigation } from "lucide-react";

// Fix for Leaflet default icon issues in Webpack/Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Order {
    id: string;
    address: string;
    cleanedAddress?: string;
    recipientName?: string;
    zoneLabel?: string;
    groupColor?: string;
    lat?: number;
    lng?: number;
    deadline?: string;
    platform?: string;
    type?: string;
    note?: string; // AI Extracted
    localNote?: string; // Local Intel
    serviceType?: string;
    orderId?: string;
    distance?: string;
}

interface MapViewProps {
    orders: Order[];
}

// Component to update map center when orders change
function MapReCenter({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center, map.getZoom());
    }, [center, map]);
    return null;
}

export function MapView({ orders }: MapViewProps) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Default: Monas, Jakarta
    const defaultCenter: [number, number] = [-6.175110, 106.827211];

    // Find first valid coordinate to center map
    const validOrder = orders.find(o => o.lat && o.lng);
    const center: [number, number] = validOrder && validOrder.lat && validOrder.lng
        ? [validOrder.lat, validOrder.lng]
        : defaultCenter;

    // Helper to create colored DivIcon
    const createCustomIcon = (zoneLabel?: string, index?: number) => {
        let color = "#ef4444"; // Default Red

        switch (zoneLabel) {
            case "JAKSEL": color = "#3b82f6"; break; // Blue
            case "DEPOK": color = "#06b6d4"; break; // Cyan
            case "TANGSEL": color = "#14b8a6"; break; // Teal
            case "JAKBAR": color = "#f97316"; break; // Orange
            case "TANGERANG": color = "#eab308"; break; // Yellow
            case "JAKTIM": color = "#a855f7"; break; // Purple
            case "BEKASI": color = "#ec4899"; break; // Pink
            case "BOGOR": color = "#22c55e"; break; // Green
            case "PUSAT": color = "#4b5563"; break; // Gray
            case "UTARA": color = "#64748b"; break; // Slate
        }

        const sequenceLabel = index !== undefined ? index + 1 : "";

        return L.divIcon({
            className: "custom-pin",
            html: `<div style="background-color: ${color}; border: 2px solid white; width: 28px; height: 28px; border-radius: 50%; box-shadow: 0 4px 10px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; position: relative;">
                    <div style="background-color: white; width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 900; color: ${color};">
                        ${sequenceLabel}
                    </div>
                    <div style="position: absolute; bottom: -8px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 8px solid transparent; border-right: 8px solid transparent; border-top: 10px solid ${color};"></div>
                   </div>`,
            iconSize: [28, 36],
            iconAnchor: [14, 36],
            popupAnchor: [0, -36]
        });
    };

    if (!isMounted) return <div className="h-[500px] w-full bg-gray-100 flex items-center justify-center rounded-xl">Loading Map...</div>;

    const pinnedOrders = orders.filter(o => o.lat && o.lng);
    const hasPins = pinnedOrders.length > 0;

    const zones = [
        { label: "JAKSEL", color: "#3b82f6" },
        { label: "DEPOK", color: "#06b6d4" },
        { label: "TANGSEL", color: "#14b8a6" },
        { label: "JAKBAR", color: "#f97316" },
        { label: "TANG/KOT", color: "#eab308" },
        { label: "JAKTIM", color: "#a855f7" },
        { label: "BEKASI", color: "#ec4899" },
        { label: "BOGOR", color: "#22c55e" },
    ];

    return (
        <div className="w-full h-[500px] rounded-xl overflow-hidden shadow-lg border border-gray-200 relative z-0 bg-gray-50">
            {/* Guidance Overlay if No Pins */}
            {!hasPins && orders.length > 0 && (
                <div className="absolute inset-0 z-[2000] bg-white/60 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center">
                    <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-200 animate-in zoom-in-95 duration-300">
                        <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Navigation className="w-8 h-8 text-blue-600 animate-bounce" />
                        </div>
                        <h3 className="text-gray-900 font-black text-lg mb-2">Titik Peta Belum Muncul?</h3>
                        <p className="text-gray-600 text-sm mb-4 max-w-[250px] mx-auto leading-relaxed">
                            Klik tombol <strong className="text-blue-600">"Atur Rute Otomatis"</strong> terlebih dahulu agar AI bisa melacak koordinat GPS dari alamat Pesanan Anda.
                        </p>
                        <div className="text-[10px] text-gray-400 italic">
                            Koordinat diambil otomatis saat optimasi jalur.
                        </div>
                    </div>
                </div>
            )}


            <MapContainer
                center={center}
                zoom={12}
                scrollWheelZoom={true}
                style={{ height: "100%", width: "100%" }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <MapReCenter center={center} />

                {orders.map((order, idx) => {
                    if (!order.lat || !order.lng) return null;
                    const customIcon = createCustomIcon(order.zoneLabel, idx);

                    return (
                        <Marker
                            key={order.id}
                            position={[order.lat, order.lng]}
                            icon={customIcon}
                        >
                            <Popup>
                                <div className="text-sm min-w-[220px] p-1 font-sans">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-black">
                                                {idx + 1}
                                            </div>
                                            <h3 className="font-bold text-gray-900 text-base leading-tight truncate max-w-[140px]">
                                                {order.recipientName || "Order"}
                                            </h3>
                                        </div>
                                        {order.distance && (
                                            <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                                {order.distance}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap gap-1 mb-2">
                                        {order.platform && (
                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${order.platform.toLowerCase().includes('grab') ? 'bg-green-50 text-green-700 border-green-200' :
                                                order.platform.toLowerCase().includes('shope') ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                                    'bg-gray-50 text-gray-600 border-gray-200'
                                                }`}>
                                                {order.platform}
                                            </span>
                                        )}
                                        {order.serviceType && (
                                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                                                {order.serviceType}
                                            </span>
                                        )}
                                        {order.deadline && (
                                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-100">
                                                {order.deadline}
                                            </span>
                                        )}
                                    </div>

                                    <div className="bg-gray-50 p-2 rounded-lg border border-gray-100 mb-2">
                                        <p className="text-gray-700 text-xs leading-normal font-medium italic">
                                            "{order.cleanedAddress || order.address}"
                                        </p>
                                    </div>

                                    {order.note && (
                                        <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg text-[11px] text-yellow-800 leading-tight">
                                            <span className="font-bold block mb-0.5 text-[9px] uppercase tracking-wider opacity-60">Catatan AI:</span>
                                            {order.note}
                                        </div>
                                    )}

                                    {order.localNote && (
                                        <div className="mb-3 p-2 bg-yellow-100 border-l-4 border-yellow-400 rounded-r-lg text-[11px] text-yellow-900 leading-tight shadow-sm">
                                            <span className="font-bold block mb-1 text-[9px] uppercase tracking-wider text-yellow-700">⚠️ INTEL LOKASI:</span>
                                            {order.localNote}
                                        </div>
                                    )}

                                    <div className="flex gap-2 mt-auto">
                                        <a
                                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.cleanedAddress || order.address)}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="grow text-center bg-blue-600 text-white text-[11px] font-black py-2.5 rounded-xl hover:bg-blue-700 transition shadow-md shadow-blue-100 uppercase tracking-wide"
                                        >
                                            NAVIGASI
                                        </a>
                                        {order.id && (
                                            <div className="px-2 py-0.5 bg-gray-100 rounded-lg text-[9px] text-gray-900 font-mono flex items-center border border-gray-200">
                                                ID-{order.id.slice(-4).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>
        </div>
    );
}
