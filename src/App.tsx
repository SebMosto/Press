import { useState } from 'react';
import { DropZone } from './components/DropZone';
import { ProcessingStatus } from './components/ProcessingStatus';
import { StatsPanel } from './components/StatsPanel';
import { extractMetadata, type ForensicMetadata } from './lib/metadata';
import { processDocument, type ProcessStatus } from './lib/processor';

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<ProcessStatus>({ step: 'idle' });
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [metadata, setMetadata] = useState<ForensicMetadata | null>(null);

  const handleFileSelect = async (selectedFile: File) => {
    // Check size first
    const MB = 1024 * 1024;
    if (selectedFile.size < 4 * MB) {
        const confirmProcess = window.confirm(
            "This file is already under 4MB.\n\nDo you still want to process it to standardize the metadata and format?"
        );
        if (!confirmProcess) return;
    }

    setFile(selectedFile);
    setStatus({ step: 'reading', message: 'Extracting forensic metadata...' });
    setResultBlob(null);
    setMetadata(null);

    try {
      // 1. Extract Metadata
      const meta = await extractMetadata(selectedFile);
      setMetadata(meta);
      console.log("Extracted Metadata:", meta);

      // 2. Process Document
      const processedBlob = await processDocument(selectedFile, meta, setStatus);
      setResultBlob(processedBlob);

      // Auto download
      const url = URL.createObjectURL(processedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compressed-${selectedFile.name.split('.')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

    } catch (error) {
      console.error(error);
      setStatus({ step: 'error', message: error instanceof Error ? error.message : "An error occurred" });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">

      {/* Header */}
      <header className="bg-white border-b border-slate-200 py-6 px-4 shadow-sm">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white p-2 rounded-lg font-bold">
              DOC
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Secure Document Compress
            </h1>
          </div>
          <div className="text-xs font-medium bg-green-100 text-green-700 px-3 py-1 rounded-full border border-green-200">
            Client-Side Only • WASM
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 py-12 max-w-2xl">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="p-8">
            <div className="mb-8 text-center">
              <h2 className="text-xl font-semibold mb-2">Compress Evidence & Preserve Metadata</h2>
              <p className="text-slate-500">
                Drag and drop your file below. We will compress it to under 4MB while preserving critical forensic tags.
              </p>
            </div>

            <DropZone onFileSelect={handleFileSelect} disabled={status.step !== 'idle' && status.step !== 'done' && status.step !== 'error'} />

            <ProcessingStatus status={status} />

            {status.step === 'error' && (
               <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
                 <strong>Error:</strong> {status.message}
               </div>
            )}

            {(file || resultBlob) && (
              <StatsPanel
                originalSize={file?.size || 0}
                newSize={resultBlob?.size}
              />
            )}

            {metadata && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100 text-sm">
                    <h3 className="font-semibold text-blue-900 mb-2">Forensic Metadata Preserved:</h3>
                    <ul className="space-y-1 text-blue-800 font-mono text-xs">
                        <li>Original Date: {metadata.dateTimeOriginal || 'N/A'}</li>
                        <li>Device Make: {metadata.make || 'N/A'}</li>
                        <li>Device Model: {metadata.model || 'N/A'}</li>
                        <li>Software: {metadata.software || 'N/A'}</li>
                    </ul>
                </div>
            )}

          </div>

          <div className="bg-slate-50 p-4 text-center border-t border-slate-200">
             {resultBlob && (
                 <button
                    onClick={() => {
                        const url = URL.createObjectURL(resultBlob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `compressed-${file?.name.split('.')[0]}.pdf`;
                        a.click();
                    }}
                    className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                 >
                    Download Again
                 </button>
             )}
          </div>
        </div>
      </main>

      {/* Footer Disclaimer */}
      <footer className="py-8 text-center text-slate-400 text-sm">
        <div className="max-w-2xl mx-auto px-4">
          <p className="mb-2">
            <strong>Security Notice:</strong> This tool runs 100% in your browser using WebAssembly.
          </p>
          <p>
            Your files are <strong>NEVER</strong> uploaded to any server.
            GPS data is automatically stripped for privacy.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
