const blobToImage = blob => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(blob);
  const image = new Image();
  image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
  image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image-invalid")); };
  image.src = url;
});

export const compressImage = async (blob, maxSide, maxLength, initialQuality = 0.82) => {
  const image = await blobToImage(blob);
  let side = maxSide;
  let quality = initialQuality;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const ratio = Math.min(1, side / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * ratio));
    canvas.height = Math.max(1, Math.round(image.height * ratio));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("image-compression-failed");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    if (dataUrl.length <= maxLength) return dataUrl;
    side *= 0.85;
    quality = Math.max(0.55, quality - 0.04);
  }
  throw new Error("image-too-large");
};