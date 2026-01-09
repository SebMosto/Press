import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument } from 'pdf-lib';
import { injectMetadata, type ForensicMetadata } from './metadata';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = '/assets/pdf.worker.min.mjs';

// Singleton FFmpeg instance
let ffmpeg: FFmpeg | null = null;

export async function loadFFmpeg() {
    if (ffmpeg) return ffmpeg;
    ffmpeg = new FFmpeg();

    // We need to load the WASM files.
    // In a real generic setup, these are hosted on unpkg or similar CDN.
    // For this specific environment, we can rely on unpkg defaults OR host them locally.
    // Given the constraints, let's try the default CDN loading first.
    // Note: The user environment should have internet access.

    // Using unpkg for core and wasm
    // Matching version with package.json (0.12.x) to ensure compatibility
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm';

    await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    return ffmpeg;
}

export interface ProcessStatus {
    step: 'idle' | 'reading' | 'rasterizing' | 'compressing' | 'building' | 'done' | 'error';
    message?: string;
    progress?: number;
}

export async function rasterizePDF(file: File, onProgress: (msg: string) => void): Promise<Blob[]> {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument(arrayBuffer);
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    const images: Blob[] = [];

    for (let i = 1; i <= numPages; i++) {
        onProgress(`Rasterizing page ${i}/${numPages}`);
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 }); // 2.0 scale for decent quality before compression

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        if (!context) throw new Error("Canvas context not available");

        // pdfjs-dist types sometimes require 'canvasContext' or 'canvas' depending on version.
        // In recent versions, it expects RenderParameters which might need a cast if the types are strict.
        const renderContext = {
            canvasContext: context,
            viewport: viewport
        };
        // @ts-expect-error - pdfjs-dist types are inconsistent with implementation for RenderParameters
        await page.render(renderContext).promise;

        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 1.0));
        if (blob) images.push(blob);
    }

    return images;
}

export async function compressImage(file: Blob, ffmpegInstance: FFmpeg): Promise<Uint8Array> {
    // Write file to FFmpeg FS
    const inputName = 'input.jpg';
    const outputName = 'output.jpg';

    await ffmpegInstance.writeFile(inputName, await fetchFile(file));

    // Run compression
    // -q:v 31 is roughly equal to 75% quality in standard jpeg
    // Scale filter can be used if dimensions are huge
    // strict -2 is sometimes needed for experimental codecs, but standard mjpeg is fine.

    // We can be more aggressive if needed.
    await ffmpegInstance.exec(['-i', inputName, '-q:v', '15', outputName]);

    const data = await ffmpegInstance.readFile(outputName);
    return data as Uint8Array;
}

export async function createPDF(imageBytesList: Uint8Array[], metadata: ForensicMetadata): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();

    for (const imageBytes of imageBytesList) {
        const image = await pdfDoc.embedJpg(imageBytes);
        const page = pdfDoc.addPage([image.width, image.height]);
        page.drawImage(image, {
            x: 0,
            y: 0,
            width: image.width,
            height: image.height,
        });
    }

    await injectMetadata(pdfDoc, metadata);
    return await pdfDoc.save();
}

export async function processDocument(
    file: File,
    metadata: ForensicMetadata,
    onStatus: (status: ProcessStatus) => void
): Promise<Blob> {
    try {
        const ffmpegInstance = await loadFFmpeg();

        let imageBlobs: Blob[] = [];

        if (file.type === 'application/pdf') {
            onStatus({ step: 'rasterizing', message: 'Converting PDF pages to images...' });
            imageBlobs = await rasterizePDF(file, (msg) => onStatus({ step: 'rasterizing', message: msg }));
        } else {
            // It's an image
            imageBlobs = [file];
        }

        onStatus({ step: 'compressing', message: 'Compressing images...' });
        const compressedImages: Uint8Array[] = [];

        for (let i = 0; i < imageBlobs.length; i++) {
            onStatus({ step: 'compressing', message: `Compressing image ${i + 1}/${imageBlobs.length}` });
            const compressed = await compressImage(imageBlobs[i], ffmpegInstance);
            compressedImages.push(compressed);
        }

        onStatus({ step: 'building', message: 'Rebuilding PDF with metadata...' });
        const pdfBytes = await createPDF(compressedImages, metadata);

        onStatus({ step: 'done', message: 'Complete!' });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return new Blob([pdfBytes as any], { type: 'application/pdf' });

    } catch (error) {
        console.error(error);
        onStatus({ step: 'error', message: error instanceof Error ? error.message : 'Unknown error' });
        throw error;
    }
}
