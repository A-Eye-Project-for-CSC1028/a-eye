import { Viewer } from "./viewer";

const viewer = new Viewer();

document
  .getElementById("export-json-btn")
  ?.addEventListener("click", () => viewer.downloadDepthInformationAsJSON());

document
  .getElementById("toggle-depth-map-btn")
  ?.addEventListener("click", () => viewer.toggleDepthMap());

document
  .getElementById("render-image-btn")
  ?.addEventListener("click", () => viewer.captureScene());

viewer.animate();
