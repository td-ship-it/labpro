/**
 * Xuất vùng báo cáo thành file PDF A4 nhiều trang (không phụ thuộc hộp thoại in của trình duyệt).
 * Vùng được chụp thành ảnh bằng html2canvas, nên tiếng Việt luôn hiển thị đúng font trình duyệt.
 * Thư viện được nạp khi người dùng bấm xuất, không làm chậm lần tải trang đầu.
 */

/** Tailwind 4 dùng màu oklch / lab / color-mix, html2canvas không đọc được: đổi các màu đó sang rgb. */
const MODERN_COLOR = /(oklch|oklab|lab|lch|color-mix|color)\(/i;

function toRgb(value: string, ctx: CanvasRenderingContext2D): string {
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = '#000000';
  ctx.fillStyle = value;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  return a === 255 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`;
}

function normalizeColors(doc: Document) {
  const view = doc.defaultView;
  if (!view) return;
  const canvas = doc.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;
  const all = doc.querySelectorAll<HTMLElement>('*');
  all.forEach((el) => {
    const cs = view.getComputedStyle(el);
    for (let i = 0; i < cs.length; i++) {
      const prop = cs.item(i);
      if (prop.startsWith('--')) continue; // biến CSS tùy chỉnh không được html2canvas đọc
      const v = cs.getPropertyValue(prop);
      if (!v || !MODERN_COLOR.test(v)) continue;
      if (/color|fill|stroke/.test(prop)) {
        try {
          el.style.setProperty(prop, toRgb(v, ctx));
        } catch {
          el.style.setProperty(prop, 'transparent');
        }
      } else {
        // bóng đổ, ảnh nền gradient...: bỏ trong bản PDF
        el.style.setProperty(prop, 'none');
      }
    }
  });
}

/** Xuất một phần tử DOM thành file PDF và tải về. Ném lỗi nếu không tạo được. */
export async function downloadElementAsPdf(node: HTMLElement, fileName: string): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);

  const canvas = await html2canvas(node, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
    windowWidth: Math.max(node.scrollWidth, 900),
    onclone: (doc: Document) => normalizeColors(doc),
  });

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const imgW = pageW - margin * 2;
  const pxPerMm = canvas.width / imgW;
  const pageHeightPx = Math.floor((pageH - margin * 2) * pxPerMm);

  let y = 0;
  let first = true;
  while (y < canvas.height) {
    const sliceH = Math.min(pageHeightPx, canvas.height - y);
    const slice = document.createElement('canvas');
    slice.width = canvas.width;
    slice.height = sliceH;
    const ctx = slice.getContext('2d');
    if (!ctx) throw new Error('Trình duyệt không hỗ trợ vẽ ảnh.');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, slice.width, slice.height);
    ctx.drawImage(canvas, 0, y, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
    if (!first) pdf.addPage();
    pdf.addImage(slice.toDataURL('image/jpeg', 0.95), 'JPEG', margin, margin, imgW, sliceH / pxPerMm, undefined, 'FAST');
    first = false;
    y += sliceH;
  }

  pdf.save(fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
}
