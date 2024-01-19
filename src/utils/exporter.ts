export class Exporter {
  public static downloadJSON = (data: string, filename?: string) => {
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "data.json";

    a.click();
    URL.revokeObjectURL(url);
    a.remove();
  };
}
