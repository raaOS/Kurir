import { useState, useEffect } from "react";
import { Order, OrderType, Platform } from "@/types/order";

export function useOrders() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [startPoint, setStartPoint] = useState("");
    const [loading, setLoading] = useState(false);
    const [inputText, setInputText] = useState("");
    const [selectedPlatform, setSelectedPlatform] = useState<Platform>("Grab");
    const [selectedType, setSelectedType] = useState<OrderType>("Ambil");
    const [previewOrders, setPreviewOrders] = useState<Order[]>([]);
    const [showPreview, setShowPreview] = useState(false);
    const [viewMode, setViewMode] = useState<"list" | "map">("list");

    useEffect(() => {
        const savedOrders = localStorage.getItem("kurir_orders");
        const savedStart = localStorage.getItem("kurir_startpoint");
        if (savedOrders) setOrders(JSON.parse(savedOrders));
        if (savedStart) setStartPoint(savedStart);
    }, []);

    useEffect(() => {
        localStorage.setItem("kurir_orders", JSON.stringify(orders));
        localStorage.setItem("kurir_startpoint", startPoint);
    }, [orders, startPoint]);

    // --- ID GENERATOR ---
    const generateId = () => Math.random().toString(36).substr(2, 9);

    // --- ZONE DETECTION ---
    const detectZone = (address: string): { color: string; label: string } | undefined => {
        const lower = address.toLowerCase();
        if (lower.match(/(jakarta selatan|jaksel|kebayoran|cilandak|mampang|tebet|pancoran|jagakarsa|pasar minggu|blok m|senopati|sudirman|fatmawati|kemang)/))
            return { color: "bg-blue-50 border-blue-200", label: "JAKSEL" };
        if (lower.match(/(tangerang selatan|tangsel|bsd|bintaro|pamulang|ciputat|serpong|pondok aren|alam sutera)/))
            return { color: "bg-teal-50 border-teal-200", label: "TANGSEL" };
        if (lower.match(/(depok|cimanggis|cinere|sawangan|margonda|beji|sukmajaya|cilodong)/))
            return { color: "bg-cyan-50 border-cyan-200", label: "DEPOK" };
        if (lower.match(/(bogor|cibinong|sentul|ciawi|puncak)/))
            return { color: "bg-green-50 border-green-200", label: "BOGOR" };
        if (lower.match(/(jakarta barat|jakbar|cengkareng|kalideres|grogol|kebon jeruk|palmerah|tomang|puri indah|joglo|meruya)/))
            return { color: "bg-orange-50 border-orange-200", label: "JAKBAR" };
        if (lower.match(/(tangerang|cikokol|karawaci|perumnas|batuceper|cipondoh|ciledug|modernland)/))
            return { color: "bg-yellow-50 border-yellow-200", label: "TANGERANG" };
        if (lower.match(/(jakarta timur|jaktim|cakung|duren sawit|pulo gadung|cipinang|rawamangun|cibubur|matraman|kramat jati)/))
            return { color: "bg-purple-50 border-purple-200", label: "JAKTIM" };
        if (lower.match(/(bekasi|cikarang|tambun|jatiasih|jatibening|galaxy|summarecon bekasi|pekayon)/))
            return { color: "bg-pink-50 border-pink-200", label: "BEKASI" };
        if (lower.match(/(jakarta pusat|jakpus|menteng|kemayoran|tanah abang|senen|gambir|cempaka putih)/))
            return { color: "bg-gray-50 border-gray-200", label: "PUSAT" };
        if (lower.match(/(jakarta utara|jakut|priok|pluit|kelapa gading|sunter|ancol|penjaringan|pademangan)/))
            return { color: "bg-slate-50 border-slate-200", label: "UTARA" };
        return undefined;
    };

    const assignSmartGrouping = (currentOrders: Order[]): Order[] => {
        return currentOrders.map(order => {
            const zone = detectZone(order.cleanedAddress || order.address);
            if (zone) return { ...order, groupColor: zone.color, zoneLabel: zone.label };
            return { ...order, groupColor: undefined, zoneLabel: undefined };
        });
    };

    // --- CORE ACTIONS ---
    const handleAdd = async (findLocalNote: (addr: string) => string | undefined) => {
        if (!inputText.trim()) return;
        setLoading(true);
        try {
            const res = await fetch("/api/extract-orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: inputText, platform: selectedPlatform }),
            });

            if (!res.ok) throw new Error("Gagal parsing via AI");
            const data = await res.json();

            if (data.orders && data.orders.length > 0) {
                const newPreview = data.orders.flatMap((o: any) => {
                    const results = [];
                    if (o.ambil && o.ambil.gps !== "UNKNOWN") {
                        results.push({
                            id: generateId(),
                            text: inputText,
                            address: o.ambil.gps,
                            note: o.ambil.note,
                            type: "Ambil" as OrderType,
                            platform: selectedPlatform,
                            recipientName: o.recipient_name,
                            orderId: o.order_id,
                            deadline: o.deadline,
                            serviceType: o.service_type,
                            isEndPoint: false,
                            isStartPoint: false,
                            confidence: o.confidence,
                            locationHint: o.location_type,
                            localNote: findLocalNote(o.ambil.gps)
                        });
                    }
                    if (o.antar && o.antar.gps !== "UNKNOWN") {
                        results.push({
                            id: generateId(),
                            text: inputText,
                            address: o.antar.gps,
                            note: o.antar.note,
                            type: "Antar" as OrderType,
                            platform: selectedPlatform,
                            recipientName: o.recipient_name,
                            orderId: o.order_id,
                            deadline: o.deadline,
                            serviceType: o.service_type,
                            isEndPoint: false,
                            isStartPoint: false,
                            confidence: o.confidence,
                            locationHint: o.location_type,
                            localNote: findLocalNote(o.antar.gps)
                        });
                    }
                    return results;
                });

                if (newPreview.length > 0) {
                    setPreviewOrders(newPreview);
                    setShowPreview(true);
                    setInputText("");
                } else {
                    alert("AI tidak menemukan alamat GPS yang valid.");
                }
            } else {
                alert("AI tidak mengenali format alamat ini.");
            }
        } catch (e) {
            console.error(e);
            alert("Terjadi kesalahan koneksi.");
        } finally {
            setLoading(false);
        }
    };

    const confirmPreview = () => {
        const withGroups = assignSmartGrouping([...orders, ...previewOrders]);
        setOrders(withGroups);
        setShowPreview(false);
        setPreviewOrders([]);
    };

    const handleOptimize = async (setTotalRevenue: (val: string) => void) => {
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

        let activeStartPoint = startPoint;
        if (lockedStart) {
            activeStartPoint = lockedStart.address;
        } else if (!activeStartPoint && navigator.geolocation) {
            try {
                const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
                });
                activeStartPoint = `${pos.coords.latitude},${pos.coords.longitude}`;
                setStartPoint(activeStartPoint);
            } catch (e) {
                console.log("GPS auto-detect failed.");
            }
        }

        try {
            const orderListText = activeOrders.map((o: any) =>
                `ID: ${o.id} | Name: ${o.recipientName || "-"} | OrderID: ${o.orderId || "-"} | Type: ${o.type} | Platform: ${o.platform} | Address: ${o.address}`
            ).join("\n");

            const response = await fetch("/api/optimize-route", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    orders: activeOrders,
                    orderListText,
                    endPointId: endPoint.id,
                    startPoint: activeStartPoint || undefined
                }),
            });

            if (!response.ok) throw new Error("Gagal optimasi");
            const { route, total_revenue } = await response.json();
            if (total_revenue) setTotalRevenue(total_revenue);

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
                        address: item.cleaned_address || original.address,
                        lat: item.lat,
                        lng: item.lng,
                        distanceSource: item.distanceSource
                    };
                }
                return null;
            }).filter(Boolean) as Order[];

            if (sortedActive.length === activeOrders.length) {
                setOrders([...completedOrders, ...sortedActive]);
            }
        } catch (error) {
            console.error(error);
            alert("Gagal optimasi rute.");
        } finally {
            setLoading(false);
        }
    };

    return {
        orders, setOrders,
        startPoint, setStartPoint,
        loading, setLoading,
        inputText, setInputText,
        selectedPlatform, setSelectedPlatform,
        selectedType, setSelectedType,
        previewOrders, setPreviewOrders,
        showPreview, setShowPreview,
        viewMode, setViewMode,
        handleAdd, confirmPreview, handleOptimize,
        assignSmartGrouping
    };
}
