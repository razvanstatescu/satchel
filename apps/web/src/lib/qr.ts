import QRCode from "qrcode";

/**
 * A QR as SVG (ECC M, a 4-module quiet zone, drawn in `currentColor`), shared by Add coins (deposit addresses) and
 * Give by link (A2 claim links): the plate is always a Day island, so its modules read as ink on white in both
 * Day and Night.
 */
export async function qrSvg(value: string): Promise<string> {
  const svg = await QRCode.toString(value, { type: "svg", errorCorrectionLevel: "M", margin: 4, color: { dark: "#000000", light: "#0000" } });
  return svg.replace(/stroke="#000000"/g, 'stroke="currentColor"').replace("<svg ", '<svg aria-hidden="true" focusable="false" ');
}
