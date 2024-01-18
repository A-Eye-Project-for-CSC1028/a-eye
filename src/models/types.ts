export interface Depth {
  x: number;
  y: number;
  z?: number; // Only required for position in 3D space!
  isVertexVisible: boolean;
}

export interface Space {
  screenSpace?: Depth;
  worldSpace?: Depth;
}
