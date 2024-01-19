import { Exporter } from "./utils/exporter";
import { Viewer } from "./viewer";

const viewer = new Viewer();

document.getElementById("export-json-btn")?.addEventListener("click", () => {
  const depthDataAsJSON: string = viewer.parseDepthInformationToJSON();
  Exporter.downloadJSON(depthDataAsJSON);
});

viewer.animate();
