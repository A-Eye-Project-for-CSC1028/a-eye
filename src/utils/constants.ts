import * as THREE from "three";
import { RegistryEntry } from "../models/types";

/**
 * Contains a wide range of constant values used throughout the codebase.
 * - `params` & `types`: Three.js render target configuration values.
 * - `objectRegistry`: Collection of RegistryEntry objects - contains valid object names and their paths.
 * - `positionRegistry`: List of valid positional keywords.
 * - `populateModelsDropdown()`: The sole function in this class - used to populate a constant list of bundled objects.
 */
export const Constants = {
  params: { format: THREE.DepthFormat, type: THREE.UnsignedShortType },
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
