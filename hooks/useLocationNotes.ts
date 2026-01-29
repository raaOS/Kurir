import { useState, useEffect } from "react";
import { LocationNote } from "@/types/order";

export function useLocationNotes() {
    const [locationNotes, setLocationNotes] = useState<LocationNote[]>([]);

    useEffect(() => {
        const savedNotes = localStorage.getItem("kurir_location_notes");
        if (savedNotes) setLocationNotes(JSON.parse(savedNotes));
    }, []);

    useEffect(() => {
        localStorage.setItem("kurir_location_notes", JSON.stringify(locationNotes));
    }, [locationNotes]);

    const findLocalNote = (address: string): string | undefined => {
        if (!address) return undefined;
        const lowerAddr = address.toLowerCase();
        const found = locationNotes.find(n => lowerAddr.includes(n.keyword.toLowerCase()));
        return found ? found.note : undefined;
    };

    const handleDeleteNote = (noteContent: string) => {
        setLocationNotes(prev => prev.filter(n => n.note !== noteContent));
    };

    const addLocationNote = (keyword: string, note: string) => {
        const newNote: LocationNote = {
            id: Math.random().toString(36).substr(2, 9),
            keyword,
            note,
            timestamp: Date.now()
        };
        setLocationNotes(prev => [...prev, newNote]);
    };

    return {
        locationNotes,
        setLocationNotes,
        findLocalNote,
        handleDeleteNote,
        addLocationNote
    };
}
