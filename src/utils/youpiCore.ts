/**
 * YouPI-PG V2 Core Engine for PG Hostel Management System
 * Ports authentic ISO/IEC 18004 Vector QR generation, integer paise financial utilities,
 * canonical UPI URI / Android Intent builders, HMAC-SHA256 webhook signing & constant-time
 * verification, and Bank Statement CSV parsing/reconciliation from YouPI-PG-main.
 */
import { qrcode } from './qr-lib';
import { YoupiSessionRecord } from '../types/hostel';

// ── 1. Integer Minor Units (Paise) Financial Utilities ─────────────────────
export function toPaise(rupees: string | number): number {
  if (typeof rupees === 'number') {
    if (!Number.isFinite(rupees) || Number.isNaN(rupees)) {
      throw new Error(`Invalid monetary amount: ${rupees}`);
    }
    rupees = rupees.toFixed(2);
  }
  const clean = String(rupees).trim().replace(/[₹,\s]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) {
    throw new Error(`Invalid INR rupee format: "${rupees}". Must be non-negative with max 2 decimals.`);
  }
  const parts = clean.split('.');
  const whole = parseInt(parts[0] || '0', 10);
  const fraction = parseInt((parts[1] || '').padEnd(2, '0'), 10);
  const totalPaise = whole * 100 + fraction;
  if (totalPaise <= 0) {
    throw new Error(`Monetary amount must be strictly greater than 0: ${rupees}`);
  }
  return totalPaise;
}

export function toRupeesString(paise: number): string {
  const p = Math.max(0, Math.floor(Number(paise) || 0));
  const whole = Math.floor(p / 100);
  const fraction = p % 100;
  return `${whole}.${String(fraction).padStart(2, '0')}`;
}

// ── 2. Canonical UPI VPA & URI Builders ────────────────────────────────────
export function isValidVpa(vpa: string): boolean {
  if (!vpa || typeof vpa !== 'string') return false;
  return /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z0-9.\-_]{2,64}$/.test(vpa.trim());
}

export interface BuildUpiUriOptions {
  payeeVpa: string;
  payeeName: string;
  amountPaise: number;
  transactionRef: string;
  transactionNote?: string;
}

export function buildUpiUri(options: BuildUpiUriOptions): string {
  const vpa = isValidVpa(options.payeeVpa) ? options.payeeVpa.trim() : 'royalheightspg@okhdfcbank';
  const amountStr = toRupeesString(options.amountPaise);
  const params = new URLSearchParams();
  params.set('pa', vpa);
  params.set('pn', (options.payeeName || 'Royal Heights PG Hostel').trim());
  params.set('am', amountStr);
  params.set('cu', 'INR');
  const txnId = (options.transactionRef || options.transactionNote || '').trim();
  if (txnId) {
    params.set('tn', txnId);
  }
  return `upi://pay?${params.toString()}`;
}

export function buildUpiIntentUri(options: BuildUpiUriOptions & { packageName: string }): string {
  const upiUri = buildUpiUri(options);
  const query = upiUri.split('?')[1] || '';
  return `intent://pay?${query}#Intent;scheme=upi;package=${options.packageName.trim()};end`;
}

// ── 3. Official UPI Providers Registry ─────────────────────────────────────
export interface UpiAppProvider {
  id: string;
  name: string;
  shortName: string;
  packageName: string;
  iconUrl: string;
  brandColor: string;
}

export const UPI_PROVIDERS: UpiAppProvider[] = [
  {
    id: 'google-pay',
    name: 'Google Pay',
    shortName: 'GPay',
    packageName: 'com.google.android.apps.nbu.paisa.user',
    iconUrl: '/icons/gpay.png',
    brandColor: '#1a73e8',
  },
  {
    id: 'phonepe',
    name: 'PhonePe',
    shortName: 'PhonePe',
    packageName: 'com.phonepe.app',
    iconUrl: '/icons/phonepe.png',
    brandColor: '#5f259f',
  },
  {
    id: 'paytm',
    name: 'Paytm',
    shortName: 'Paytm',
    packageName: 'net.one97.paytm',
    iconUrl: '/icons/paytm.png',
    brandColor: '#00b9f5',
  },
  {
    id: 'cred',
    name: 'CRED',
    shortName: 'CRED',
    packageName: 'com.dreamplug.androidapp',
    iconUrl: '/icons/cred.png',
    brandColor: '#121212',
  },
  {
    id: 'bhim',
    name: 'BHIM UPI',
    shortName: 'BHIM',
    packageName: 'in.org.npci.upiapp',
    iconUrl: '/icons/bhim.png',
    brandColor: '#00796b',
  },
  {
    id: 'amazon-pay',
    name: 'Amazon Pay',
    shortName: 'Amazon',
    packageName: 'in.amazon.mShop.android.shopping',
    iconUrl: '/icons/amazonpay.png',
    brandColor: '#232f3e',
  },
];

// ── 4. Authentic ISO/IEC 18004 Pure Vector SVG QR Code Generator ───────────
export function generateQrSvg(
  text: string,
  boxSize = 220,
  errorCorrection: 'L' | 'M' | 'Q' | 'H' = 'M'
): string {
  try {
    const qr = qrcode(0, errorCorrection);
    qr.addData(text);
    qr.make();
    const numModules = qr.getModuleCount();
    const padding = 2; // quiet zone in modules
    const totalModules = numModules + padding * 2;
    const moduleSize = boxSize / totalModules;

    let rects = '';
    for (let r = 0; r < numModules; r++) {
      for (let c = 0; c < numModules; c++) {
        if (qr.isDark(r, c)) {
          const x = ((c + padding) * moduleSize).toFixed(2);
          const y = ((r + padding) * moduleSize).toFixed(2);
          const s = (moduleSize + 0.06).toFixed(2);
          rects += `<rect x="${x}" y="${y}" width="${s}" height="${s}" fill="#0f172a" />`;
        }
      }
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${boxSize} ${boxSize}" width="100%" height="100%" shape-rendering="crispEdges"><rect width="${boxSize}" height="${boxSize}" fill="#ffffff" rx="10" />${rects}</svg>`;
  } catch (err) {
    console.error('[YouPI QR Engine] Fallback QR render:', err);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 220" width="100%" height="100%"><rect width="220" height="220" fill="#ffffff" rx="10"/><text x="110" y="115" text-anchor="middle" fill="#0f172a" font-size="12" font-family="monospace">UPI QR Ready</text></svg>`;
  }
}

// ── 5. Pure JS SHA-256 & HMAC-SHA256 + Constant-Time Verifier ──────────────
const SHA256_K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

function rotr(n: number, x: number): number {
  return (x >>> n) | (x << (32 - n));
}

function utf8ToBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

function sha256Bytes(msgBytes: Uint8Array): Uint8Array {
  const l = msgBytes.length;
  const bitLenHi = Math.floor((l * 8) / 0x100000000);
  const bitLenLo = (l * 8) >>> 0;
  const padLen = (l + 9 + 63) & ~63;
  const padded = new Uint8Array(padLen);
  padded.set(msgBytes);
  padded[l] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padLen - 8, bitLenHi, false);
  view.setUint32(padLen - 4, bitLenLo, false);

  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
  const w = new Uint32Array(64);

  for (let offset = 0; offset < padLen; offset += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(7, w[i - 15]) ^ rotr(18, w[i - 15]) ^ (w[i - 15] >>> 3);
      const s1 = rotr(17, w[i - 2]) ^ rotr(19, w[i - 2]) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(6, e) ^ rotr(11, e) ^ rotr(25, e);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + SHA256_K[i] + w[i]) >>> 0;
      const S0 = rotr(2, a) ^ rotr(13, a) ^ rotr(22, a);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g; g = f; f = e; e = (d + temp1) >>> 0;
      d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0; h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
  }

  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  [h0, h1, h2, h3, h4, h5, h6, h7].forEach((val, idx) => outView.setUint32(idx * 4, val, false));
  return out;
}

export function computeHmacSha256Sync(message: string, secret: string): string {
  const blockSize = 64;
  let keyBytes = utf8ToBytes(secret);
  if (keyBytes.length > blockSize) {
    keyBytes = sha256Bytes(keyBytes);
  }
  const paddedKey = new Uint8Array(blockSize);
  paddedKey.set(keyBytes);

  const oKeyPad = new Uint8Array(blockSize);
  const iKeyPad = new Uint8Array(blockSize);
  for (let i = 0; i < blockSize; i++) {
    oKeyPad[i] = paddedKey[i] ^ 0x5c;
    iKeyPad[i] = paddedKey[i] ^ 0x36;
  }

  const msgBytes = utf8ToBytes(message);
  const innerInput = new Uint8Array(blockSize + msgBytes.length);
  innerInput.set(iKeyPad);
  innerInput.set(msgBytes, blockSize);
  const innerHash = sha256Bytes(innerInput);

  const outerInput = new Uint8Array(blockSize + 32);
  outerInput.set(oKeyPad);
  outerInput.set(innerHash, blockSize);
  const digest = sha256Bytes(outerInput);

  return Array.from(digest)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function verifyWebhookSignature(
  rawBody: string,
  secret: string,
  signatureHeader: string
): boolean {
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) return false;
  const expected = `sha256=${computeHmacSha256Sync(rawBody, secret)}`;
  if (expected.length !== signatureHeader.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signatureHeader.charCodeAt(i);
  }
  return diff === 0;
}

// ── 6. Bank Statement CSV Parser & Reconciler (Per MERCHANT_INTEGRATION.md) ──
export interface ParsedStatementLine {
  bookedOn: string;
  amountPaise: number;
  direction: 'CREDIT' | 'DEBIT';
  utr: string | null;
  referenceCount: number;
  narration: string;
  ref: string;
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  const src = String(text || '').replace(/^\uFEFF/, '');
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += c;
      }
      continue;
    }
    if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(cell);
      cell = '';
    } else if (c === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (c !== '\r') {
      cell += c;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function classifyCsvHeader(value: string): string | null {
  const h = String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (!h) return null;
  if (h === 'date' || h === 'txn date' || h === 'transaction date' || h === 'tran date') return 'date';
  if (h === 'value dt' || h === 'value date' || h.startsWith('value dt')) return 'valueDate';
  if (h === 'narration' || h === 'description' || h.includes('particular') || h.includes('remark')) return 'narration';
  if (h.includes('withdrawal') || h === 'debit' || h.startsWith('debit ')) return 'debit';
  if (h.includes('deposit') || h === 'credit' || h.startsWith('credit ')) return 'credit';
  if (h.includes('chq') || h.includes('ref') || h === 'utr') return 'ref';
  return null;
}

function parseStatementDate(raw: string): string | null {
  const text = String(raw || '').trim();
  let match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  match = /^(\d{2})[/-](\d{2})[/-](\d{4})$/.exec(text);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  match = /^(\d{2})[/-](\d{2})[/-](\d{2})$/.exec(text);
  if (match) {
    const year = Number(match[3]) < 70 ? 2000 + Number(match[3]) : 1900 + Number(match[3]);
    return `${year}-${match[2]}-${match[1]}`;
  }
  return null;
}

function csvRupeesToPaise(raw: string): number | null {
  const text = String(raw ?? '').trim();
  if (!text || text === '-' || text === '0' || text === '0.00' || text === '0.0') return 0;
  const cleaned = text.replace(/[₹,\s]/g, '').replace(/(cr|dr)$/i, '');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole, frac = ''] = cleaned.split('.');
  return Number(whole) * 100 + Number(frac.padEnd(2, '0'));
}

export function parseStatementCsv(csvText: string): { error?: string; lines: ParsedStatementLine[] } {
  const rows = parseCsvRows(csvText);
  let headerAt = -1;
  let columns: Record<string, number> | null = null;

  for (let i = 0; i < Math.min(rows.length, 40); i++) {
    const map: Record<string, number> = {};
    rows[i].forEach((cell, idx) => {
      const kind = classifyCsvHeader(cell);
      if (kind && map[kind] === undefined) map[kind] = idx;
    });
    if (map.date !== undefined && map.narration !== undefined && map.credit !== undefined) {
      headerAt = i;
      columns = map;
      break;
    }
  }

  if (!columns) {
    return { error: 'UNSUPPORTED_STATEMENT_HEADER: Expected Date, Narration, and Deposit/Credit columns.', lines: [] };
  }

  const lines: ParsedStatementLine[] = [];
  for (let i = headerAt + 1; i < rows.length; i++) {
    const row = rows[i];
    const bookedOn = parseStatementDate(row[columns.valueDate ?? columns.date] || row[columns.date] || '');
    const narration = String(row[columns.narration] || '').trim();
    const ref = columns.ref === undefined ? '' : String(row[columns.ref] || '').trim();
    if (!bookedOn && !narration) continue;
    const creditPaise = csvRupeesToPaise(row[columns.credit] || '');
    const debitPaise = columns.debit === undefined ? 0 : csvRupeesToPaise(row[columns.debit] || '');
    if (creditPaise === null || debitPaise === null || !bookedOn) continue;
    if (creditPaise === 0 && debitPaise === 0) continue;
    const refs = Array.from(new Set(`${ref} ${narration}`.match(/\d{12}/g) || []));
    lines.push({
      bookedOn,
      amountPaise: creditPaise > 0 ? creditPaise : debitPaise,
      direction: creditPaise > 0 ? 'CREDIT' : 'DEBIT',
      utr: refs.length === 1 ? refs[0] : null,
      referenceCount: refs.length,
      narration,
      ref,
    });
  }
  return { lines };
}

export function generateSampleBankStatementCsv(
  sessions: YoupiSessionRecord[],
  payeeVpa = 'royalheightspg@okhdfcbank'
): string {
  const today = new Date().toISOString().split('T')[0];
  const header = 'Date,Narration,Chq./Ref.No.,Value Dt,Withdrawal Amt.,Deposit Amt.,Closing Balance';
  const targetSessions = sessions.filter(
    (s) => s.status === 'OBSERVED_SUCCESS' || s.status === 'MANUAL_REVIEW' || s.status === 'ACTIVE'
  );

  let balance = 145000;
  const rows = targetSessions.map((s, idx) => {
    const utr = s.utr && /^\d{12}$/.test(s.utr) ? s.utr : `63049182${String(7100 + idx).slice(-4)}`;
    const rupees = toRupeesString(s.amountPaise);
    balance += Math.round(s.amountPaise / 100);
    return `${today},"UPI-${s.tenantName.toUpperCase().replace(/[^A-Z ]/g, '')}-${payeeVpa}-HDFC0000240-${utr}-${s.orderId}",${utr},${today},0.00,${rupees},${balance}.00`;
  });

  if (rows.length === 0) {
    rows.push(
      `${today},"UPI-PUSHKAR JOSHI-${payeeVpa}-HDFC0000240-630491827104-PG-ORD-089",630491827104,${today},0.00,9500.00,154500.00`,
      `${today},"UPI-VIKRAM PATEL-${payeeVpa}-HDFC0000240-582910472911-PG-ORD-042",582910472911,${today},0.00,10000.00,164500.00`
    );
  }

  return [header, ...rows].join('\n');
}
