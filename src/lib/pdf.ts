"use client";

import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";

async function renderPdf(node: HTMLElement) {
  if (document.fonts?.ready) await document.fonts.ready;
  const dataUrl = await toPng(node, {
    pixelRatio: 2.2,
    cacheBust: true,
    backgroundColor: "#ffffff",
    style: { transform: "none", margin: "0" },
  });
  const img = new Image();
  img.src = dataUrl;
  await new Promise((r) => (img.onload = r));

  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
  const pageW = 210;
  const pageH = 297;
  const imgH = (img.height * pageW) / img.width;
  if (imgH <= pageH * 1.18) {
    // חריגה קטנה — מקטינים מעט כדי שהכל ייכנס בעמוד אחד
    const h = Math.min(imgH, pageH);
    const w = (pageW * h) / imgH;
    pdf.addImage(dataUrl, "PNG", (pageW - w) / 2, 0, w, h, undefined, "FAST");
    return pdf;
  }
  let offset = 0;
  pdf.addImage(dataUrl, "PNG", 0, 0, pageW, imgH, undefined, "FAST");
  offset += pageH;
  while (imgH - offset > 1) {
    pdf.addPage();
    pdf.addImage(dataUrl, "PNG", 0, -offset, pageW, imgH, undefined, "FAST");
    offset += pageH;
  }
  return pdf;
}

export async function downloadPdf(node: HTMLElement, filename: string) {
  const pdf = await renderPdf(node);
  pdf.save(filename);
}

export async function pdfFile(node: HTMLElement, filename: string) {
  const pdf = await renderPdf(node);
  const blob = pdf.output("blob");
  return new File([blob], filename, { type: "application/pdf" });
}
