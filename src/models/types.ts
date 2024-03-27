import { Vector2, Vector3 } from "three";

/**
 * Used within Constants - used to record valid objects.
 */
export interface RegistryEntry {
  name: string;
  path: string;
}

/**
 * Individual point/vertex on a 3D model in 2D/3D space, as appropriate.
 */
export interface Depth {
  position: Vector2 | Vector3; // V2 (Screen Space) | V3 (World Space)
  isVertexVisible: boolean;
}

/**
 * Main content of a JSON export, encapsulating all space information using `Depth` + camera position (in 3D space).
 */
export interface Space {
  cameraPosition: Vector3;
  screenSpace?: Depth;
  worldSpace?: Depth;
}

/**
 * Composed of `Space` object, plus the scaled/original (decided by user via UI tickbox) size of the HTML canvas.
 */
export interface SceneMetadata {
  canvasSize: Vector2;
  space: Space;
}

/**
 * Stores data relevant to calculating the position in a scene where an object should be placed according to a natural language prompt.
 */
export interface NLPosition {
  objectName?: string;
  objectPath?: string;
  positionalKeywords: string[];
}
