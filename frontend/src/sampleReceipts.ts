export function createSampleReceiptImage(kind: "matching" | "mismatch"): File {
  const canvas = document.createElement("canvas");
  canvas.width = 450;
  canvas.height = 650;
  const ctx = canvas.getContext("2d")!;

  // Paper background
  ctx.fillStyle = "#fafaf7";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Receipt border & faint lines
  ctx.strokeStyle = "#e2e2dc";
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

  // Header
  ctx.fillStyle = "#102f29";
  ctx.textAlign = "center";
  ctx.font = "bold 20px monospace";
  ctx.fillText(kind === "matching" ? "PUREGOLD PRICE CLUB" : "CYBERTECH ELECTRONICS", canvas.width / 2, 50);

  ctx.font = "13px monospace";
  ctx.fillStyle = "#555";
  ctx.fillText("Official Receipt / Sales Invoice", canvas.width / 2, 75);
  ctx.fillText("TIN: 004-291-884-000", canvas.width / 2, 95);
  ctx.fillText(`Date: 2026-11-13   Time: 10:30 AM`, canvas.width / 2, 115);
  ctx.fillText("--------------------------------------------------", canvas.width / 2, 135);

  // Items
  ctx.textAlign = "left";
  ctx.fillStyle = "#111";
  ctx.font = "14px monospace";

  let y = 170;
  if (kind === "matching") {
    const items = [
      ["5x Rice 5kg Bag @ ₱50.00", "250.00"],
      ["3x Canned Sardines @ ₱25.00", "75.00"],
      ["4x Instant Noodles @ ₱15.00", "60.00"],
      ["2x Cooking Oil 500ml", "115.00"],
    ];
    items.forEach(([desc, price]) => {
      ctx.fillText(desc, 30, y);
      ctx.textAlign = "right";
      ctx.fillText(price, canvas.width - 30, y);
      ctx.textAlign = "left";
      y += 35;
    });

    y += 20;
    ctx.textAlign = "center";
    ctx.fillText("--------------------------------------------------", canvas.width / 2, y);
    y += 35;
    ctx.font = "bold 18px monospace";
    ctx.textAlign = "left";
    ctx.fillText("TOTAL (PHP):", 30, y);
    ctx.textAlign = "right";
    ctx.fillText("500.00", canvas.width - 30, y);
  } else {
    const items = [
      ["1x Wireless Gaming Mouse", "850.00"],
      ["1x Mechanical Keyboard Keycaps", "650.00"],
    ];
    items.forEach(([desc, price]) => {
      ctx.fillText(desc, 30, y);
      ctx.textAlign = "right";
      ctx.fillText(price, canvas.width - 30, y);
      ctx.textAlign = "left";
      y += 35;
    });

    y += 20;
    ctx.textAlign = "center";
    ctx.fillText("--------------------------------------------------", canvas.width / 2, y);
    y += 35;
    ctx.font = "bold 18px monospace";
    ctx.textAlign = "left";
    ctx.fillText("TOTAL (PHP):", 30, y);
    ctx.textAlign = "right";
    ctx.fillText("1,500.00", canvas.width - 30, y);
  }

  y += 50;
  ctx.textAlign = "center";
  ctx.font = "12px monospace";
  ctx.fillStyle = "#666";
  ctx.fillText("Payment Method: QR Ph (GCash Cashless)", canvas.width / 2, y);
  y += 25;
  ctx.fillText("Thank you for your purchase!", canvas.width / 2, y);

  // Convert canvas to File
  const dataUrl = canvas.toDataURL("image/png");
  const byteString = atob(dataUrl.split(",")[1]);
  const mimeString = dataUrl.split(",")[0].split(":")[1].split(";")[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new File([ab], kind === "matching" ? "receipt-grocery-500.png" : "receipt-electronics-1500.png", { type: mimeString });
}

