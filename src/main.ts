import { Exporter } from "./utils/exporter";
import { Viewer } from "./viewer";

const viewer = new Viewer();

document.getElementById("export-json-btn")?.addEventListener("click", () => {
  const depthDataAsJSON: string = viewer.parseDepthInformationToJSON();
  Exporter.downloadJSON(depthDataAsJSON);
});

document
  .getElementById("toggle-depth-map-btn")
  ?.addEventListener("click", () => viewer.toggleDepthMap());

viewer.animate();
