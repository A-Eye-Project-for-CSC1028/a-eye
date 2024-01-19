import { Vector2, Vector3 } from "three";

export interface Depth {
  position: Vector2 | Vector3; // V2 (Screen Space) | V3 (World Space)
  isVertexVisible: boolean;
}

export interface Space {
  cameraPosition: Vector3;
  screenSpace?: Depth;
  worldSpace?: Depth;
}
