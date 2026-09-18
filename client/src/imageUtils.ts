const MAX_IMAGE_DIMENSION = 1600;
const MAX_JPEG_BYTES = 2 * 1024 * 1024;

function loadImage(file: File): Promise<{ image: CanvasImageSource; width: number; height: number; close?: () => void }> {
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(file).then((bitmap) => ({ image: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() }));
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ image, width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo leer la imagen seleccionada"));
    };
    image.src = url;
  });
}

export async function optimizeCedulaImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) throw new Error("Seleccione una imagen JPEG o PNG");
  if (file.size <= MAX_JPEG_BYTES && file.type === "image/jpeg") return file;

  const source = await loadImage(file);
  try {
    if (!source.width || !source.height) throw new Error("La imagen seleccionada no es válida");
    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(source.width, source.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(source.width * scale));
    canvas.height = Math.max(1, Math.round(source.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("El navegador no permite preparar la imagen");
    context.drawImage(source.image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => result ? resolve(result) : reject(new Error("No se pudo comprimir la imagen")), "image/jpeg", 0.82);
    });
    const name = file.name.replace(/\.[^.]+$/, "") || "cedula";
    return new File([blob], `${name}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
  } finally {
    source.close?.();
  }
}
