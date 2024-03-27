import { Vector2, Vector3 } from "three";

/**
 * Holds any required value converters. At this time, there is only one: `vector3DtoVector2D().`
 */
export class Converter {
  /**
   * Converts `Vector3` values to `Vector2`, i.e. removes the `z` value.
   * @param v3 a 3D Vector (`Vector3`).
   * @returns `Vector2`
   */
  public static vector3DtoVector2D = (v3: Vector3): Vector2 =>
    new Vector2(v3.x, v3.y);
}
