/**
 * Provides functionality for exporting various data types - including scene renders and
 * JSON metadata, to downloadable files.
 */
export class Exporter {
  /**
   * Downloads the provided data as a file, handling image decoding and file type appropriately.
   *
   * @param data The actual data you would like to export, as a string.
   * @param mimeString File type as a MIME string, i.e. image/png
   * @param fileName Denotes what the name of the file should be after exportation.
   */
  public static download = (
    data: string,
    mimeString: string,
    fileName: string
  ) => {
    let blob;

    // Handle image decoding...
    if (mimeString.startsWith("image/")) {
      const byteString = atob(data.split(",")[1]);
      const arrayBuffer = new ArrayBuffer(byteString.length);
      const uintArray = new Uint8Array(arrayBuffer);
      for (let i = 0; i < byteString.length; i++)
        uintArray[i] = byteString.charCodeAt(i);

      blob = new Blob([arrayBuffer], { type: mimeString });
    } else {
      blob = new Blob([data], { type: mimeString }); // Anything else, i.e. JSON.
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 0);
  };
}
