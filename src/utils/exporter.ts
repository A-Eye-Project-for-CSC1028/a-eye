export class Exporter {
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
