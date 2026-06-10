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

// Hasilkan QR sebagai PNG blob lengkap dengan bingkai dan label nama organ,
// siap diunggah/dicetak sebagai marker.
export async function makeQrMarkerBlob(payload, label) {
  const S = 600;
  const canvas = document.createElement("canvas");
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d");

  // Latar putih + bingkai.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, S, S);
  ctx.strokeStyle = "#16314a";
  ctx.lineWidth = 10;
  ctx.strokeRect(8, 8, S - 16, S - 16);

  // QR di tengah.
  const qrCanvas = document.createElement("canvas");
  await QRCode.toCanvas(qrCanvas, payload, {
    width: 440,
    margin: 1,
    color: { dark: "#16314a", light: "#ffffff" },
  });
  ctx.drawImage(qrCanvas, (S - 440) / 2, 70, 440, 440);

  // Label nama organ.
  ctx.fillStyle = "#16314a";
  ctx.font = "bold 40px Nunito, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText((label || "ORGAN").toUpperCase(), S / 2, S - 40);

  return await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
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
