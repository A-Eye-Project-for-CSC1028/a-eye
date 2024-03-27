import { Constants } from "./utils/constants";
import { Viewer } from "./viewer";

const viewer = new Viewer();

let modelObjectUrl: string | null = null;

Constants.populateModelsDropdown();

/* -- Data Buttons -- */
document
  .getElementById("export-json-btn")
  ?.addEventListener("click", () => viewer.downloadDepthInformationAsJSON());

document
  .getElementById("toggle-depth-map-btn")
  ?.addEventListener("click", () => viewer.toggleDepthMap());

document
  .getElementById("render-image-btn")
  ?.addEventListener("click", () => viewer.captureScene());

const uploadBtn = document.getElementById("upload-btn") as HTMLSelectElement;
const fileInput = document.getElementById(
  "upload-obj-file"
) as HTMLSelectElement;

// Trigger file upload from relevant <input> tag; acts as a proxy for upload.
uploadBtn!.addEventListener("click", () => fileInput!.click());

// Change button text and render new object to scene:
fileInput!.addEventListener("change", (event) => {
  const input = event.target as HTMLInputElement;

  if (input.files && input.files.length > 0) {
    const file = input.files[0];
    uploadBtn!.textContent = file.name;

    modelObjectUrl = URL.createObjectURL(file);
    viewer.loadNewObject(modelObjectUrl);
  } else {
    uploadBtn!.textContent = "Select Model";
  }
});

const modelSelector = document.getElementById("models") as HTMLSelectElement;
modelSelector.addEventListener("change", () => {
  modelObjectUrl = modelSelector.value;
  viewer.loadNewObject(modelObjectUrl);
});

/* -- Camera Manipulation -- */
const fovInput = document.getElementById("camera-fov") as HTMLSelectElement;
fovInput!.addEventListener("change", (event) => {
  const input = event.target as HTMLInputElement;
  viewer.updateFov(parseFloat(input.value));
});

const nearInput = document.getElementById("camera-near") as HTMLSelectElement;
nearInput!.addEventListener("change", (event) => {
  const input = event.target as HTMLInputElement;
  viewer.updateNear(parseFloat(input.value));
});

const farInput = document.getElementById("camera-far") as HTMLSelectElement;
farInput!.addEventListener("change", (event) => {
  const input = event.target as HTMLInputElement;
  viewer.updateFar(parseFloat(input.value));
});

// Render object!
viewer.animate();

// Clean up uploaded .obj file link if required.
window.onbeforeunload = () => {
  if (modelObjectUrl) URL.revokeObjectURL(modelObjectUrl);
};
