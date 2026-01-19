# Secure Document Compress & Metadata Preserver

A secure, client-side application for compressing documents (PDF, JPEG, PNG) while preserving forensic metadata. This tool uses WebAssembly (WASM) to process files entirely within the browser—**no data is ever uploaded to a server**, ensuring zero-knowledge privacy.

## Features

- **Client-Side Compression:** Reduces file size (target < 4MB) using `ffmpeg.wasm` and `pdf-lib`.
- **Metadata Preservation:** Extracts key forensic metadata (Original Date, Device Make/Model, Software) from the original file and re-injects it into the output PDF via XMP.
- **Privacy First:**
  - **GPS Stripping:** Automatically removes GPS coordinates to protect location privacy.
  - **Zero Server Uploads:** All processing happens in the user's browser.
- **Standardization:** Outputs valid PDF/A-1b (Level B) files suitable for archiving.

## Quick Start (How to use locally)

To download and test this application on your local machine:

1.  **Prerequisites:** Ensure you have [Node.js](https://nodejs.org/) (version 18 or higher) installed.
2.  **Install Dependencies:**
    ```bash
    npm install
    ```
3.  **Run the Development Server:**
    ```bash
    npm run dev
    ```
4.  **Open in Browser:** Visit the URL shown in the terminal (usually `http://localhost:5173`).

### Usage Instructions
1.  **Drag & Drop:** Drag a file (PDF, JPG, PNG) onto the drop zone.
2.  **Process:** The app will extract metadata, strip GPS data, and compress the file.
3.  **Download:** Once complete, the compressed PDF will automatically download (or click "Download Again").

## Deployment Guide (Getting it into Production)

### 1. Build for Production
To create the static files for deployment:

```bash
npm run build
```

This will generate a `dist/` folder containing the optimized HTML, CSS, and JavaScript files.

### 2. Hosting & Integration ("How to hook it up")

Since this is a client-side Single Page Application (SPA), you can host the contents of the `dist/` folder on any static hosting provider (Vercel, Netlify, AWS S3, etc.).

**Crucial Requirement: Security Headers**
This application uses `SharedArrayBuffer` for high-performance WASM processing (ffmpeg). This requires your web server to serve the following response headers:

```http
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

**If these headers are missing, the application will fail with an error.**

#### Hosting Options:

*   **Vercel:** A `vercel.json` file is already included in this repository. Deploying to Vercel requires zero configuration—it will just work.
*   **Netlify:** Create a `netlify.toml` with the headers specified above.
*   **Nginx/Apache:** Configure your server block/htaccess to send the headers.

### Integration with an Existing Site

If you want to "hook this up" to your existing website, you have two main options:

1.  **Subdomain (Recommended):**
    Deploy this app to `compress.your-site.com` and link to it from your main site. This is the cleanest and most reliable method given the strict security headers required.

2.  **Iframe Embedding:**
    You can embed the app in an `<iframe>`, but your parent page *must* also comply with the Cross-Origin isolation requirements, or the iframe must be permitted to run in isolation. This can be complex to set up correctly. We strongly recommend the subdomain approach.

## Project Structure

- `src/lib/metadata.ts`: Logic for extracting EXIF/XMP and injecting it back into PDFs.
- `src/lib/processor.ts`: Core pipeline—rasterizes PDFs, compresses images via FFmpeg, and rebuilds the document.
- `src/App.tsx`: Main UI component.
