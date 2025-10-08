import JSZip from "jszip";

export type ZipFile = { name: string; content: string };

export async function downloadZip(filename: string, files: ZipFile[]) {
  const zip = new JSZip();
  files.forEach((f) => zip.file(f.name, f.content));
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
