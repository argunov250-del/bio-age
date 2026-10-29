// Чтение одного файла из ZIP через оглавление в конце архива (а не потоком с начала):
// так надёжно читаются архивы с «дескрипторами данных» и ZIP64 — именно такие
// делает экспорт «Здоровья» на iPhone. handle — { size, offset, readBytes(n) }.
import { Inflate } from 'fflate';

const u16 = (b, i) => b[i] | (b[i + 1] << 8);
const u32 = (b, i) => (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0;
const u64 = (b, i) => u32(b, i) + u32(b, i + 4) * 4294967296;
const MAX32 = 0xffffffff;

async function readAt(h, pos, len) {
  h.offset = pos;
  const out = new Uint8Array(len);
  let got = 0;
  while (got < len) {
    const part = await h.readBytes(len - got);
    if (!part.length) break;
    out.set(part, got);
    got += part.length;
  }
  return got === len ? out : out.subarray(0, got);
}

// Найти файл в оглавлении: { name, method, comp, dataStart } или null.
export async function findZipEntry(h, test) {
  const size = h.size;
  const tailLen = Math.min(size, 65557 + 20);
  const tail = await readAt(h, size - tailLen, tailLen);
  let e = -1;
  for (let i = tail.length - 22; i >= 0; i--) if (u32(tail, i) === 0x06054b50) { e = i; break; }
  if (e < 0) throw new Error('notZip');
  let count = u16(tail, e + 10);
  let cdSize = u32(tail, e + 12);
  let cdOffset = u32(tail, e + 16);
  // ZIP64: настоящие значения — в отдельной записи, на которую указывает «локатор».
  if ((cdOffset === MAX32 || cdSize === MAX32 || count === 0xffff) && e >= 20 && u32(tail, e - 20) === 0x07064b50) {
    const z = await readAt(h, u64(tail, e - 20 + 8), 56);
    if (u32(z, 0) === 0x06064b50) { count = u64(z, 32); cdSize = u64(z, 40); cdOffset = u64(z, 48); }
  }
  const cd = await readAt(h, cdOffset, cdSize);
  let p = 0;
  for (let n = 0; n < count && p + 46 <= cd.length; n++) {
    if (u32(cd, p) !== 0x02014b50) break;
    const method = u16(cd, p + 10);
    let comp = u32(cd, p + 20);
    let uncomp = u32(cd, p + 24);
    const nameLen = u16(cd, p + 28), extraLen = u16(cd, p + 30), commentLen = u16(cd, p + 32);
    let local = u32(cd, p + 42);
    let name = '';
    for (let i = 0; i < nameLen; i++) name += String.fromCharCode(cd[p + 46 + i]);
    // Поле ZIP64 (id 1): там лежат размеры/смещение, если в основной записи 0xFFFFFFFF.
    let x = p + 46 + nameLen;
    const xEnd = x + extraLen;
    while (x + 4 <= xEnd) {
      const id = u16(cd, x), len = u16(cd, x + 2);
      if (id === 1) {
        let q = x + 4;
        if (uncomp === MAX32) { uncomp = u64(cd, q); q += 8; }
        if (comp === MAX32) { comp = u64(cd, q); q += 8; }
        if (local === MAX32) { local = u64(cd, q); q += 8; }
      }
      x += 4 + len;
    }
    if (test(name)) {
      const lh = await readAt(h, local, 30);
      if (u32(lh, 0) !== 0x04034b50) throw new Error('badZip');
      return { name, method, comp, uncomp, dataStart: local + 30 + u16(lh, 26) + u16(lh, 28) };
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  return null;
}

// Распаковать файл по кускам: onData(байты, последний). onProgress(0…1).
export async function streamZipEntry(h, entry, onData, onProgress = () => {}, chunk = 1 << 20, tick = async () => {}) {
  if (entry.method !== 0 && entry.method !== 8) throw new Error('zipMethod' + entry.method);
  const inflate = entry.method === 8 ? new Inflate((data, final) => onData(data, final)) : null;
  h.offset = entry.dataStart;
  let left = entry.comp;
  if (!left) { if (inflate) inflate.push(new Uint8Array(0), true); else onData(new Uint8Array(0), true); return; }
  while (left > 0) {
    const part = await h.readBytes(Math.min(chunk, left));
    if (!part.length) throw new Error('truncated');
    left -= part.length;
    if (inflate) inflate.push(part, left <= 0);
    else onData(part, left <= 0);
    onProgress(1 - left / entry.comp);
    await tick();
  }
}
