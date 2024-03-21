import * as THREE from "three";
import { RegistryEntry } from "../models/types";

export const Constants = {
  params: { format: THREE.DepthFormat, type: THREE.UnsignedShortType },
  formats: {
    DepthFormat: THREE.DepthFormat,
    DepthStencilFormat: THREE.DepthStencilFormat,
  },
  types: {
    UnsignedShortType: THREE.UnsignedShortType,
    UnsignedIntType: THREE.UnsignedIntType,
    UnsignedInt248Type: THREE.UnsignedInt248Type,
  },
  objectRegistry: {
    chair: { path: "/models/chair.obj", name: "Chair" },
    coffeetable: {
      path: "/models/coffee-table.obj",
      name: "Coffee Table",
    },
    sofa: { path: "/models/sofa.obj", name: "Sofa" },
  } as { [key: string]: RegistryEntry },
  positionRegistry: ["top", "bottom", "left", "right", "centre", "center"],
  populateModelsDropdown: () => {
    const modelsDropdown = document.getElementById(
      "models"
    ) as HTMLSelectElement;

    for (const key in Constants.objectRegistry) {
      const object: RegistryEntry = Constants.objectRegistry[key];

      const option = document.createElement("option");
      option.value = object.path;
      option.text = object.name;

      // "Sofa" is the default object.
      if (object.name === "Sofa") option.selected = true;

      modelsDropdown.appendChild(option);
    }
  },
};
