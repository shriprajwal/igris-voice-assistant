export class ImageProcessor {
  private static instance: ImageProcessor | null = null;

  private constructor() {}

  public static getInstance(): ImageProcessor {
    if (!ImageProcessor.instance) {
      ImageProcessor.instance = new ImageProcessor();
    }
    return ImageProcessor.instance;
  }

  /**
   * Helper to strip base64 header if present, returning pure base64 data.
   */
  public getCleanBase64(base64Data: string): string {
    if (base64Data.includes("base64,")) {
      return base64Data.split("base64,")[1];
    }
    return base64Data;
  }

  /**
   * Converts a dataURL base64 representation into a standard Blob.
   */
  public dataURLtoBlob(dataurl: string): Blob {
    const arr = dataurl.split(",");
    const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }
}
