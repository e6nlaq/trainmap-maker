export async function compressMapData(data: unknown): Promise<string> {
  const jsonString = JSON.stringify(data);
  const stream = new Blob([jsonString]).stream();
  const compressedStream = stream.pipeThrough(new CompressionStream("gzip"));
  const response = new Response(compressedStream);
  const buffer = await response.arrayBuffer();

  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function decompressMapData(base64: string): Promise<unknown> {
  let str = base64.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) {
    str += "=";
  }

  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  const stream = new Blob([bytes]).stream();
  const decompressedStream = stream.pipeThrough(new DecompressionStream("gzip"));
  const response = new Response(decompressedStream);
  const jsonString = await response.text();
  return JSON.parse(jsonString);
}
