import * as THREE from "three";

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
};
