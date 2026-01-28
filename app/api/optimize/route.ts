import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';

export const maxDuration = 60; // Allow 60s for processing

const OrderSchema = z.object({
    orders: z.array(z.object({
        app: z.enum(['GRAB', 'SHOPEE', 'GOJEK', 'OTHER']).default('OTHER'),
        pickup: z.object({
            name: z.string().describe('Nama tempat penjemputan atau sender'),
            address: z.string().describe('Alamat lengkap penjemputan'),
        }),
        dropoff: z.object({
            name: z.string().describe('Nama penerima atau tujuan'),
            address: z.string().describe('Alamat lengkap tujuan'),
        }),
    })),
});

export async function POST(req: Request) {
    try {
        const { image } = await req.json();

        if (!image) {
            return Response.json({ error: 'No image provided' }, { status: 400 });
        }

        const result = await generateObject({
            model: google('gemini-1.5-flash'),
            schema: OrderSchema,
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: 'Analisis screenshot aplikasi kurir ini. Ekstrak data titik penjemputan (Pickup) dan pengantaran (Dropoff). Jika ada banyak order dalam satu layar, ambil semuanya. Pastikan alamat selengkap mungkin untuk Google Maps.' },
                        { type: 'image', image: image },
                    ],
                },
            ],
        });

        return Response.json({ success: true, data: result.object });
    } catch (error) {
        console.error('AI Processing Error:', error);
        return Response.json({ success: false, error: 'Failed to process image' }, { status: 500 });
    }
}
