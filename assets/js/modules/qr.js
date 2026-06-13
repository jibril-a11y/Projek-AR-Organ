/*
  Modul QR (barcode 2D).

  - Membuat gambar QR untuk tiap organ (dipakai sebagai marker yang dicetak).
  - Memindai QR lewat kamera untuk mengenali organ tanpa perlu marker gambar.

  QR jauh lebih efisien daripada marker gambar: tidak perlu kompilasi,
  dan langsung berisi id organ.
*/
import QRCode from "https://esm.sh/qrcode@1.5.3";
import { Html5Qrcode } from "https://esm.sh/html5-qrcode@2.3.8";

// Bangun isi (payload) QR untuk sebuah organ.
// Formatnya: organ:<id>  (sederhana dan mudah diuraikan).
export function organQrPayload(organId) {
  return `organ:${organId}`;
}

export function parseOrganPayload(text) {
  if (!text) return null;
  const t = text.trim();
  if (t.startsWith("organ:")) return t.slice("organ:".length);
  // Dukung juga bila QR berisi URL dengan parameter ?organ=<id>
  try {
    const url = new URL(t);
    const id = url.searchParams.get("organ");
    if (id) return id;
  } catch (e) {
    /* bukan URL */
  }
  return null;
}

// Marker KAYA FITUR tanpa QR, khusus untuk pelacakan MindAR (mode AR Marker).
// Pola acak + penanda sudut + nama organ memberi banyak titik fitur unik.
export async function makeMarkerImageBlob(label) {
  const S = 700;
  const canvas = document.createElement("canvas");
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, S, S);

  const colors = ["#32a3cd", "#3253cd", "#2fd0aa", "#16314a"];
  const rnd = (a, b) => a + Math.random() * (b - a);
  for (let i = 0; i < 70; i++) {
    ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
    ctx.globalAlpha = rnd(0.35, 0.95);
    const t = Math.floor(Math.random() * 3);
    const x = rnd(24, S - 24), y = rnd(24, S - 24), r = rnd(14, 52);
    if (t === 0) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    } else if (t === 1) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rnd(0, Math.PI));
      ctx.fillRect(-r / 2, -r / 2, r, r);
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.moveTo(x, y - r);
      ctx.lineTo(x + r, y + r);
      ctx.lineTo(x - r, y + r);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  const corner = (cx, cy, col) => {
    ctx.fillStyle = col;
    ctx.fillRect(cx, cy, 56, 56);
    ctx.fillStyle = "#fff";
    ctx.fillRect(cx + 14, cy + 14, 28, 28);
    ctx.fillStyle = col;
    ctx.fillRect(cx + 23, cy + 23, 10, 10);
  };
  corner(20, 20, "#16314a");
  corner(S - 76, 20, "#32a3cd");
  corner(20, S - 76, "#2fd0aa");
  corner(S - 76, S - 76, "#3253cd");

  ctx.strokeStyle = "#16314a";
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, S - 16, S - 16);

  // Pita nama organ di tengah (kontras tinggi, membantu pelacakan).
  ctx.fillStyle = "#16314a";
  ctx.fillRect(70, S / 2 - 60, S - 140, 120);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 52px Nunito, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText((label || "ORGAN").toUpperCase(), S / 2, S / 2);
  ctx.textBaseline = "alphabetic";

  return await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

// QR polos (dengan label) untuk mode Scan QR. Dipisah dari marker MindAR.
export async function makePlainQrBlob(payload, label) {
  const S = 600;
  const canvas = document.createElement("canvas");
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, S, S);
  ctx.strokeStyle = "#16314a";
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, S - 16, S - 16);

  const qrCanvas = document.createElement("canvas");
  await QRCode.toCanvas(qrCanvas, payload, {
    width: 440,
    margin: 1,
    color: { dark: "#16314a", light: "#ffffff" },
  });
  ctx.drawImage(qrCanvas, (S - 440) / 2, 60, 440, 440);

  ctx.fillStyle = "#16314a";
  ctx.font = "bold 38px Nunito, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText((label || "ORGAN").toUpperCase(), S / 2, S - 36);

  return await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

// QR sebagai data URL untuk diunduh cepat.
export async function makePlainQrDataUrl(payload) {
  return await QRCode.toDataURL(payload, {
    width: 600,
    margin: 2,
    color: { dark: "#16314a", light: "#ffffff" },
  });
}

// Pemindai QR berbasis kamera. Membungkus html5-qrcode.
export class QrScanner {
  constructor(elementId) {
    this.elementId = elementId;
    this.instance = null;
  }

  static async listCameras() {
    return await Html5Qrcode.getCameras(); // [{id, label}, ...]
  }

  async start(cameraId, onDecoded) {
    this.instance = new Html5Qrcode(this.elementId, { verbose: false });
    const config = { fps: 10, qrbox: { width: 260, height: 260 } };
    const source = cameraId ? cameraId : { facingMode: "environment" };
    await this.instance.start(
      source,
      config,
      (text) => onDecoded(text),
      () => {
        /* abaikan frame tanpa QR */
      }
    );
  }

  async stop() {
    if (!this.instance) return;
    try {
      await this.instance.stop();
      await this.instance.clear();
    } catch (e) {
      /* abaikan */
    }
    this.instance = null;
  }
}
