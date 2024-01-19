import { Vector2, Vector3 } from "three";

export class Converter {
  public static vector3DtoVector2D = (v3: Vector3): Vector2 =>
    new Vector2(v3.x, v3.y);
}
