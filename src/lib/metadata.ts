import exifr from 'exifr';
import { PDFDocument } from 'pdf-lib';

export interface ForensicMetadata {
  dateTimeOriginal?: string; // ISO-8601
  make?: string;
  model?: string;
  software?: string;
}

export async function extractMetadata(file: File): Promise<ForensicMetadata> {
  const metadata: ForensicMetadata = {};

  if (file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/tiff') {
    try {
      // Parse using exifr
      // We only extract specific fields as per requirements
      const output = await exifr.parse(file, {
        tiff: true,
        xmp: true,
        exif: true,
        gps: false, // Explicitly exclude GPS
      });

      if (output) {
        // Map fields
        if (output.DateTimeOriginal) {
          metadata.dateTimeOriginal = new Date(output.DateTimeOriginal).toISOString();
        } else if (output.CreateDate) {
          metadata.dateTimeOriginal = new Date(output.CreateDate).toISOString();
        }

        metadata.make = output.Make;
        metadata.model = output.Model;
        metadata.software = output.Software || output.CreatorTool;
      }
    } catch (e) {
      console.warn("Failed to extract image metadata", e);
    }
  } else if (file.type === 'application/pdf') {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true }); // We might want to catch password errors earlier

      const producer = pdfDoc.getProducer();
      const creationDate = pdfDoc.getCreationDate();

      if (creationDate) {
        metadata.dateTimeOriginal = creationDate.toISOString();
      }

      // PDFs don't typically have "Make/Model" in standard info dict,
      // but sometimes scanners leave it in Creator or Producer.
      // We will map Producer/Creator to Software if available.
      if (producer) {
        metadata.software = producer;
      } else if (pdfDoc.getCreator()) {
        metadata.software = pdfDoc.getCreator();
      }

      // If there is XMP, we could try to read it, but pdf-lib read support for XMP is limited to raw access.
      // For now, standard dict is the safer bet for extraction.

    } catch (e) {
       console.warn("Failed to extract PDF metadata", e);
       // Check if password error
       if (e instanceof Error && e.message.includes('password')) {
         throw new Error("Password protected PDF");
       }
    }
  }

  return metadata;
}

export async function injectMetadata(pdfDoc: PDFDocument, metadata: ForensicMetadata): Promise<void> {
  // Logic to write XMP
  // We construct a minimal XMP packet

  const createDate = metadata.dateTimeOriginal ? new Date(metadata.dateTimeOriginal).toISOString() : new Date().toISOString();
  const make = metadata.make || '';
  const model = metadata.model || '';
  const software = metadata.software || 'WASM Compression Tool';

  // Set standard metadata
  pdfDoc.setCreationDate(new Date(createDate));
  pdfDoc.setModificationDate(new Date());
  if (software) pdfDoc.setProducer(software);

  // Construct XMP
  // Note: pdf-lib doesn't have a high-level XMP builder, so we assume standard XMP structure.
  // However, pdf-lib DOES allow setting metadata via standard APIs which populate the Info dictionary.
  // For proper XMP (which is XML), strict forensic tools might prefer it.
  // The requirement says "Write this to PDF XMP Metadata stream".

  const xmpData = `
    <?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>
    <x:xmpmeta xmlns:x="adobe:ns:meta/">
      <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
        <rdf:Description rdf:about=""
          xmlns:xmp="http://ns.adobe.com/xap/1.0/"
          xmlns:tiff="http://ns.adobe.com/tiff/1.0/"
          xmlns:dc="http://purl.org/dc/elements/1.1/">
          <xmp:CreateDate>${createDate}</xmp:CreateDate>
          <xmp:ModifyDate>${new Date().toISOString()}</xmp:ModifyDate>
          <xmp:CreatorTool>${software}</xmp:CreatorTool>
          <tiff:Make>${make}</tiff:Make>
          <tiff:Model>${model}</tiff:Model>
        </rdf:Description>
      </rdf:RDF>
    </x:xmpmeta>
    <?xpacket end="w"?>
  `.trim();

  // We can't easily *replace* XMP in pdf-lib without accessing the catalog directly.
  // pdf-lib has a `setMetadata` method but it accepts a dict, not raw XML.
  // Actually, pdf-lib doesn't expose a direct "setXMP" method on the document.
  // BUT, we can add a Metadata stream to the catalog.

  const metadataStream = pdfDoc.context.flateStream(xmpData, {
      Type: 'Metadata',
      Subtype: 'XML',
  });

  const metadataRef = pdfDoc.context.register(metadataStream);

  pdfDoc.catalog.set(
      pdfDoc.context.obj('Metadata'),
      metadataRef
  );
}
