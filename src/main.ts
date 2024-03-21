import { Constants } from "./utils/constants";
import { Viewer } from "./viewer";

const viewer = new Viewer();

let modelObjectUrl: string | null = null;

/* Data Buttons & Camera Manipulation */
document
  .getElementById("export-json-btn")
  ?.addEventListener("click", () => viewer.downloadDepthInformationAsJSON());

document
  .getElementById("toggle-depth-map-btn")
  ?.addEventListener("click", () => viewer.toggleDepthMap());

document
  .getElementById("render-image-btn")
  ?.addEventListener("click", () => viewer.captureScene());

const uploadBtn = document.getElementById("upload-btn");
const fileInput = document.getElementById("upload-obj-file");

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

const fovInput = document.getElementById("camera-fov");
fovInput!.addEventListener("change", (event) => {
  const input = event.target as HTMLInputElement;
  viewer.updateFov(parseFloat(input.value));
});

const nearInput = document.getElementById("camera-near");
nearInput!.addEventListener("change", (event) => {
  const input = event.target as HTMLInputElement;
  viewer.updateNear(parseFloat(input.value));
});

const farInput = document.getElementById("camera-far");
farInput!.addEventListener("change", (event) => {
  const input = event.target as HTMLInputElement;
  viewer.updateFar(parseFloat(input.value));
});

/* Object Registry Dropdown */
Constants.populateModelsDropdown();

// Render object!
viewer.animate();

// Clean up uploaded .obj file if required.
window.onbeforeunload = () => {
  if (modelObjectUrl) URL.revokeObjectURL(modelObjectUrl);
};
