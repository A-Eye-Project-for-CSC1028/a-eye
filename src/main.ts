import * as THREE from "three";
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

// Define variables related to post-processing, i.e. depth-mapping.
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

const createScene = () => (scene = new THREE.Scene());

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

initialise();
animate();
