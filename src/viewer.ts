import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Constants } from "./utils/constants";
import { Elevation } from "./enums/elevation";
import { Direction } from "./enums/direction";
import { Distance } from "./enums/distance";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { Shaders } from "./utils/shaders";
import { Depth, Space } from "./models/types";
import { Converter } from "./utils/converter";

export class Viewer {
  // Unprocessed
  private camera!: THREE.PerspectiveCamera;
  private scene!: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private object?: THREE.Object3D;
  // private initialCameraPosition!: THREE.Vector3;

  // Post-Processing
  private postScene!: THREE.Scene;
  private postCamera!: THREE.Camera;
  private postMaterial!: THREE.ShaderMaterial;
  private target!: THREE.WebGLRenderTarget | null;

  // Lighting
  private ambientLightId?: number;
  private directionalLightId?: number;

  // Status
  private supportsExtension: boolean = true;
  private useDepthShader: boolean = false;

  // Camera Positioning
  public lateralCameraPosition: Direction = Direction.CENTER;
  public cameraElevation: Elevation = Elevation.MIDDLE;
  public cameraDistance: Distance = Distance.REGULAR;

  constructor() {
    const width: number = window.innerWidth;
    const height: number = window.innerHeight;

    this.renderer = new THREE.WebGLRenderer({ antialias: true });

    if (
      this.renderer.capabilities.isWebGL2 === false &&
      this.renderer.extensions.has("WEBGL_depth_texture") === false
    ) {
      this.supportsExtension = false;
      // TODO: #error <div>
      return;
    }

    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(width, height);
    document.body.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(70, width / height, 0.1, 150);
    // this.initialCameraPosition = this.camera.position; // Save initial camera position for usage with auto-positioning later!

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;

    this.controls.minDistance = 10;
    this.controls.maxDistance = 100;

    // Handle model rendering & depth mapping.
    this.createRenderTarget();
    this.scene = new THREE.Scene();

    this.loadObject();
    this.setupLights();
    this.createDepthMap();

    this.onWindowResize();
    window.addEventListener("resize", this.onWindowResize);
  }

  public animate = () => {
    if (!this.supportsExtension) return;

    requestAnimationFrame(this.animate);

    this.updateCameraPositionDisplay();

    this.renderer.setRenderTarget(this.target);
    this.renderer.render(this.scene, this.camera);

    if (this.useDepthShader) {
      this.hideObjectById(this.ambientLightId);
      this.hideObjectById(this.directionalLightId);

      this.postMaterial.uniforms.tDiffuse.value = this.target?.texture;
      this.postMaterial.uniforms.tDepth.value = this.target?.depthTexture;

      this.renderer.setRenderTarget(null);
      this.renderer.render(this.postScene, this.postCamera);
    } else {
      this.showObjectById(this.ambientLightId);
      this.showObjectById(this.directionalLightId);

      this.renderer.setRenderTarget(null);
      this.renderer.render(this.scene, this.camera);
    }

    this.controls.update();
  };

  public updateCameraPositionDisplay = () => {
    const cameraPosElement = document.getElementById("camera-position");
    if (cameraPosElement) {
      cameraPosElement.textContent = `Camera Position: x: ${this.camera.position.x.toFixed(
        2
      )}, y: ${this.camera.position.y.toFixed(
        2
      )}, z: ${this.camera.position.z.toFixed(2)}`;
    }
  };

  private showObjectById = (id?: number) => {
    if (id === undefined) return;

    const objectToHide: THREE.Object3D | undefined =
      this.scene.getObjectById(id);

    if (objectToHide) objectToHide.visible = true;
  };

  private hideObjectById = (id?: number) => {
    if (id === undefined) return;

    const objectToHide: THREE.Object3D | undefined =
      this.scene.getObjectById(id);

    if (objectToHide) objectToHide.visible = false;
  };

  public parseDepthInformationToJSON = (): string => {
    let screenSpaceData: Depth[] | null = null;
    let worldDepthData: Depth[] | null = null;

    this.object!.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;

      const geometry: THREE.BufferGeometry = node.geometry;
      const vertices = this.getVertices(geometry);

      const screenSpaceVertices: THREE.Vector3[] =
        this.projectVerticesToScreenSpace();

      screenSpaceData = screenSpaceVertices.map((vertex): Depth => {
        const isVisible = this.isVertexVisible(vertex, node);
        return {
          position: Converter.vector3DtoVector2D(vertex),
          isVertexVisible: isVisible,
        };
      });

      worldDepthData = vertices.map((vertex): Depth => {
        const worldVertex = vertex.clone().applyMatrix4(node.matrixWorld);
        const isVisible = this.isVertexVisible(worldVertex, node);

        return {
          position: worldVertex,
          isVertexVisible: isVisible,
        };
      });
    });

    // Parse into Space model, which contains both 2D & 3D data.
    const data: Space = {
      cameraPosition: new THREE.Vector3(
        this.camera.position.x,
        this.camera.position.y,
        this.camera.position.z
      ),
      screenSpace: screenSpaceData ?? undefined,
      worldSpace: worldDepthData ?? undefined,
    };

    return JSON.stringify(data, null, 2);
  };

  public toggleDepthMap = () => (this.useDepthShader = !this.useDepthShader);

  private createRenderTarget = () => {
    const width: number = window.innerWidth;
    const height: number = window.innerHeight;

    if (this.target) this.target.dispose();

    const format = Constants.params.format;
    const type = Constants.params.type;

    this.target = new THREE.WebGLRenderTarget(width, height);
    this.target.texture.minFilter = THREE.NearestFilter;
    this.target.texture.magFilter = THREE.NearestFilter;
    this.target.stencilBuffer =
      format === (THREE.DepthStencilFormat as unknown as typeof format)
        ? true
        : false;
    this.target.depthTexture = new THREE.DepthTexture(width, height);
    this.target.depthTexture.format = format;
    this.target.depthTexture.type = type;
  };

  private loadObject = () => {
    // Load .obj model!
    const loader = new OBJLoader();
    loader.load(
      "/models/white-couch/86.obj",
      (obj: THREE.Object3D) => {
        this.object = obj;
        this.scene.add(this.object);

        // Find central point of model.
        const box = new THREE.Box3().setFromObject(this.object);
        const center = box.getCenter(new THREE.Vector3());

        // Set camera slightly away in the z direction, but still looking at the central point.
        this.camera.position.set(center.x, center.y, center.z + 50);
        this.camera.lookAt(center);

        // Update controls as necessary.
        this.controls.target.set(center.x, center.y, center.z);
        this.controls.update();
      },
      (xhr: ProgressEvent<EventTarget>) => {
        console.log((xhr.loaded / xhr.total) * 100 + "% loaded.");
      },
      (error: string | unknown) => {
        console.error("An error occurred: " + error);
      }
    );
  };

  private createDepthMap = () => {
    this.postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.postMaterial = new THREE.ShaderMaterial({
      vertexShader: Shaders.depthMap.vertexShader,
      fragmentShader: Shaders.depthMap.fragmentShader,
      uniforms: {
        cameraNear: { value: this.camera.near },
        cameraFar: { value: this.camera.far },
        tDiffuse: { value: null },
        tDepth: { value: null },
      },
    });

    const postPlane: THREE.PlaneGeometry = new THREE.PlaneGeometry(2, 2);
    const postQuad: THREE.Mesh = new THREE.Mesh(postPlane, this.postMaterial);

    this.postScene = new THREE.Scene();

    this.postScene.add(postQuad);
  };

  private setupLights = () => {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.ambientLightId = ambientLight.id;
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(0, 10, 10);
    this.directionalLightId = directionalLight.id;
    this.scene.add(directionalLight);
  };

  private getVertices = (geometry: THREE.BufferGeometry): THREE.Vector3[] => {
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

  private isVertexVisible = (
    worldVertex: THREE.Vector3,
    meshNode: THREE.Mesh
  ): boolean => {
    const direction = worldVertex.clone().sub(this.camera.position).normalize();

    const raycaster = new THREE.Raycaster(this.camera.position, direction);
    raycaster.params.Mesh.threshold = 0.1;

    const intersections = raycaster.intersectObjects(this.scene.children, true);

    if (intersections.length === 0) return true;

    const distanceToVertex: number = worldVertex.distanceTo(
      this.camera.position
    );
    const distanceToClosestIntersection: number = intersections[0].distance;

    if (intersections[0].object === meshNode)
      return (
        intersections.length < 2 || intersections[1].distance > distanceToVertex
      );

    return distanceToClosestIntersection > distanceToVertex;
  };

  private projectVerticesToScreenSpace = (): THREE.Vector3[] => {
    let tempVertices: THREE.Vector3[] = [];

    this.object!.traverse((node: unknown) => {
      if (!(node instanceof THREE.Mesh)) return;

      const geometry: THREE.BufferGeometry = node.geometry;
      const width: number = this.renderer.getContext().canvas.width;
      const height: number = this.renderer.getContext().canvas.height;

      const vertices = this.getVertices(geometry);
      const widthHalf: number = 0.5 * width;
      const heightHalf: number = 0.5 * height;

      tempVertices = vertices.map((vertex): THREE.Vector3 => {
        const projectedVertex = vertex.clone().project(this.camera);

        // Convert projectedVertex to pixel space...
        projectedVertex.x = projectedVertex.x * widthHalf + widthHalf;
        projectedVertex.y = -(projectedVertex.y * heightHalf) + heightHalf;
        return projectedVertex;
      });
    });

    return tempVertices;
  };

  private onWindowResize = () => {
    const aspect = window.innerWidth / window.innerHeight;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();

    const dpr = this.renderer.getPixelRatio();
    this.target?.setSize(window.innerWidth * dpr, window.innerHeight * dpr);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };
}