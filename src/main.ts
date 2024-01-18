import * as THREE from "three";
import { Depth, Space } from "./models/types";
import { Shaders } from "./utils/shaders";
import { Constants } from "./utils/constants";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

// Define variables related to the original/ordinary scene.
let camera: THREE.PerspectiveCamera,
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  controls: OrbitControls,
  object: THREE.Object3D;

// Define variables related to post-processing, pos.e. depth-mapping.
let postScene: THREE.Scene,
  postCamera: THREE.Camera,
  postMaterial: THREE.ShaderMaterial,
  target: THREE.WebGLRenderTarget | null;

let supportsExtension = true;

const initialise = () => {
  const width: number = window.innerWidth;
  const height: number = window.innerHeight;

  renderer = new THREE.WebGLRenderer();

  if (
    renderer.capabilities.isWebGL2 === false &&
    renderer.extensions.has("WEBGL_depth_texture") === false
  ) {
    supportsExtension = false;
    // TODO: #error <div>
    return;
  }

  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(width, height);
  document.body.appendChild(renderer.domElement);

  camera = new THREE.PerspectiveCamera(70, width / height, 0.01, 50);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  controls.minDistance = 10;
  controls.maxDistance = 100;

  // Handle model rendering & depth mapping.
  createRenderTarget();
  createScene();
  loadObject();
  createDepthMap();

  onWindowResize();
  window.addEventListener("resize", onWindowResize);
};

const createRenderTarget = () => {
  const width: number = window.innerWidth;
  const height: number = window.innerHeight;

  if (target) target.dispose();

  const format = Constants.params.format;
  const type = Constants.params.type;

  target = new THREE.WebGLRenderTarget(width, height);
  target.texture.minFilter = THREE.NearestFilter;
  target.texture.magFilter = THREE.NearestFilter;
  target.stencilBuffer =
    format === (THREE.DepthStencilFormat as unknown as typeof format)
      ? true
      : false;
  target.depthTexture = new THREE.DepthTexture(width, height);
  target.depthTexture.format = format;
  target.depthTexture.type = type;
};

const createScene = (): THREE.Scene => (scene = new THREE.Scene());

const loadObject = () => {
  // Load .obj model!
  const loader = new OBJLoader();
  loader.load(
    "/models/white-couch/86.obj",
    (obj: THREE.Object3D) => {
      object = obj;
      scene.add(object);

      // Find central point of model.
      const box = new THREE.Box3().setFromObject(object);
      const center = box.getCenter(new THREE.Vector3());

      // Set camera slightly away in the z direction, but still looking at the central point.
      camera.position.set(center.x, center.y, center.z + 50);
      camera.lookAt(center);

      // Update controls as necessary.
      controls.target.set(center.x, center.y, center.z);
      controls.update();
    },
    (xhr: ProgressEvent<EventTarget>) => {
      console.log((xhr.loaded / xhr.total) * 100 + "% loaded.");
    },
    (error: string | unknown) => {
      console.error("An error occurred: " + error);
    }
  );
};

const createDepthMap = () => {
  postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  postMaterial = new THREE.ShaderMaterial({
    vertexShader: Shaders.depthMap.vertexShader,
    fragmentShader: Shaders.depthMap.fragmentShader,
    uniforms: {
      cameraNear: { value: camera.near },
      cameraFar: { value: camera.far },
      tDiffuse: { value: null },
      tDepth: { value: null },
    },
  });

  const postPlane: THREE.PlaneGeometry = new THREE.PlaneGeometry(2, 2);
  const postQuad: THREE.Mesh = new THREE.Mesh(postPlane, postMaterial);

  postScene = new THREE.Scene();

  postScene.add(postQuad);
};

const getVertices = (geometry: THREE.BufferGeometry): THREE.Vector3[] => {
  const vertices: THREE.Vector3[] = [];

  if (!geometry.attributes.position)
    throw new Error("The geometry does not have a position attribute.");

  const positions = geometry.attributes.position;

  for (let pos = 0; pos < positions.count; pos++) {
    const x = positions.getX(pos);
    const y = positions.getY(pos);
    const z = positions.getZ(pos);

    const vector: THREE.Vector3 = new THREE.Vector3(x, y, z);
    vertices.push(vector);
  }

  return vertices;
};

const isVertexVisible = (
  worldVertex: THREE.Vector3,
  meshNode: THREE.Mesh
): boolean => {
  const direction = worldVertex.clone().sub(camera.position).normalize();

  const raycaster = new THREE.Raycaster(camera.position, direction);
  raycaster.params.Mesh.threshold = 0.1;

  const intersections = raycaster.intersectObjects(scene.children, true);

  if (intersections.length === 0) return true;

  const distanceToVertex: number = worldVertex.distanceTo(camera.position);
  const distanceToClosestIntersection: number = intersections[0].distance;

  if (intersections[0].object === meshNode)
    return (
      intersections.length < 2 || intersections[1].distance > distanceToVertex
    );

  return distanceToClosestIntersection > distanceToVertex;
};

const projectVerticesToScreenSpace = (): THREE.Vector3[] => {
  let tempVertices: THREE.Vector3[] = [];

  object.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;

    const geometry: THREE.BufferGeometry = node.geometry;
    const width: number = renderer.getContext().canvas.width;
    const height: number = renderer.getContext().canvas.height;

    const vertices = getVertices(geometry);
    const widthHalf: number = 0.5 * width;
    const heightHalf: number = 0.5 * height;

    tempVertices = vertices.map((vertex): THREE.Vector3 => {
      const projectedVertex = vertex.clone().project(camera);

      // Convert projectedVertex to pixel space...
      projectedVertex.x = projectedVertex.x * widthHalf + widthHalf;
      projectedVertex.y = -(projectedVertex.y * heightHalf) + heightHalf;
      return projectedVertex;
    });
  });

  return tempVertices;
};

const parseDepthInformationToJSON = (): string => {
  let screenSpaceData: Depth[] | null = null;
  let worldDepthData: Depth[] | null = null;

  object.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;

    const geometry: THREE.BufferGeometry = node.geometry;
    const vertices = getVertices(geometry);

    const screenSpaceVertices: THREE.Vector3[] = projectVerticesToScreenSpace();
    screenSpaceData = screenSpaceVertices.map((vertex): Depth => {
      const isVisible = isVertexVisible(vertex, node);
      return { x: vertex.x, y: vertex.y, isVertexVisible: isVisible };
    });

    worldDepthData = vertices.map((vertex): Depth => {
      const worldVertex = vertex.clone().applyMatrix4(node.matrixWorld);
      const isVisible = isVertexVisible(worldVertex, node);

      return {
        x: worldVertex.x,
        y: worldVertex.y,
        z: worldVertex.z,
        isVertexVisible: isVisible,
      };
    });
  });

  // Parse into Space model, which contains both 2D & 3D data.
  const data: Space = {
    screenSpace: screenSpaceData ?? undefined,
    worldSpace: worldDepthData ?? undefined,
  };

  return JSON.stringify(data, null, 4);
};

const downloadJSON = (data: string, filename?: string) => {
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "data.json";

  a.click();
  URL.revokeObjectURL(url);
  a.remove();
};

const animate = () => {
  if (!supportsExtension) return;

  requestAnimationFrame(animate);

  renderer.setRenderTarget(target);
  renderer.render(scene, camera);

  postMaterial.uniforms.tDiffuse.value = target?.texture;
  postMaterial.uniforms.tDepth.value = target?.depthTexture;

  renderer.setRenderTarget(null);
  renderer.render(postScene, postCamera);

  controls.update();
};

const onWindowResize = () => {
  const aspect = window.innerWidth / window.innerHeight;
  camera.aspect = aspect;
  camera.updateProjectionMatrix();

  const dpr = renderer.getPixelRatio();
  target?.setSize(window.innerWidth * dpr, window.innerHeight * dpr);
  renderer.setSize(window.innerWidth, window.innerHeight);
};

document.getElementById("export-json-btn")?.addEventListener("click", () => {
  const depthDataAsJSON: string = parseDepthInformationToJSON();
  downloadJSON(depthDataAsJSON);
});

initialise();
animate();
