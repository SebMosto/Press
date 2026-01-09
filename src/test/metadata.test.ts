
import { describe, it, expect, vi } from 'vitest';
import { extractMetadata } from '../lib/metadata';

// Mock exifr
vi.mock('exifr', () => ({
  default: {
    parse: vi.fn().mockResolvedValue({
      DateTimeOriginal: '2023-01-01T12:00:00Z',
      Make: 'TestMake',
      Model: 'TestModel',
      Software: 'TestSoftware'
    })
  }
}));

// Mock pdf-lib
vi.mock('pdf-lib', () => ({
  PDFDocument: {
    load: vi.fn().mockResolvedValue({
      getProducer: () => 'PDFProducer',
      getCreationDate: () => new Date('2023-01-01T12:00:00Z'),
      getCreator: () => 'PDFCreator',
    })
  }
}));

describe('Metadata Extraction', () => {
  it('extracts metadata from image files', async () => {
    const file = new File(['dummy content'], 'test.jpg', { type: 'image/jpeg' });
    const metadata = await extractMetadata(file);

    expect(metadata.dateTimeOriginal).toBeDefined();
    expect(metadata.make).toBe('TestMake');
    expect(metadata.model).toBe('TestModel');
    expect(metadata.software).toBe('TestSoftware');
  });

  it('extracts metadata from PDF files', async () => {
    // Create a mock File object that behaves like a real File/Blob in the test environment
    // jsdom's File/Blob doesn't have arrayBuffer() implemented in some older versions or specific setups,
    // but in recent jsdom it should be there. However, if it fails, we can mock it.
    const file = new File(['dummy content'], 'test.pdf', { type: 'application/pdf' });

    // Explicitly adding arrayBuffer mock to the file object if missing or to ensure it works
    if (!file.arrayBuffer) {
        file.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8));
    } else {
        vi.spyOn(file, 'arrayBuffer').mockResolvedValue(new ArrayBuffer(8));
    }

    const metadata = await extractMetadata(file);

    expect(metadata.dateTimeOriginal).toBeDefined();
    expect(metadata.software).toBe('PDFProducer');
  });
});
