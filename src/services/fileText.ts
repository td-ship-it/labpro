/**
 * Lấy chữ từ file tài liệu ngay trên trình duyệt (không tải file lên máy chủ):
 * PDF (có lớp chữ), Word .docx, văn bản .txt / .md / .csv.
 * Thư viện chỉ được tải khi cần, không làm nặng trang.
 */

export const ACCEPTED_DOC_TYPES = '.pdf,.docx,.txt,.md,.csv';

export async function extractTextFromFile(file: File, onProgress?: (msg: string) => void): Promise<string> {
  const name = file.name.toLowerCase();
  if (file.size > 30 * 1024 * 1024) throw new Error('File lớn hơn 30 MB. Hãy tách nhỏ tài liệu.');

  if (name.endsWith('.txt') || name.endsWith('.md') || name.endsWith('.csv')) {
    return cleanup(await file.text());
  }

  if (name.endsWith('.docx')) {
    onProgress?.('Đang đọc file Word...');
    const mammoth: any = await import('mammoth');
    const lib = mammoth.default || mammoth;
    const result = await lib.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return cleanup(result.value || '');
  }

  if (name.endsWith('.pdf')) {
    onProgress?.('Đang đọc file PDF...');
    const pdfjs: any = await import('pdfjs-dist');
    const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
    const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false }).promise;
    const pages: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      onProgress?.(`Đang đọc trang ${i}/${doc.numPages}...`);
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      let text = '';
      for (const item of content.items as any[]) {
        if (typeof item.str !== 'string') continue;
        text += item.str;
        text += item.hasEOL ? '\n' : item.str && !item.str.endsWith(' ') ? ' ' : '';
      }
      pages.push(text.trim());
    }
    const all = cleanup(pages.join('\n\n'));
    if (all.replace(/\s/g, '').length < 30) {
      throw new Error('PDF này không có lớp chữ (thường là bản scan/ảnh chụp). Hãy dùng bản PDF gốc, file Word, hoặc dán nội dung vào ô bên dưới.');
    }
    return all;
  }

  if (name.endsWith('.doc')) throw new Error('Định dạng .doc cũ chưa hỗ trợ. Hãy mở bằng Word và lưu lại thành .docx.');
  throw new Error('Chỉ hỗ trợ file PDF, Word (.docx), .txt, .md, .csv.');
}

function cleanup(s: string): string {
  return s
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .normalize('NFC')
    .trim();
}
