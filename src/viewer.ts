import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Constants } from "./utils/constants";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { Shaders } from "./utils/shaders";
import { Depth, SceneMetadata, Space } from "./models/types";
import { Converter } from "./utils/converter";
import { Exporter } from "./utils/exporter";

export class Viewer {
  // Unprocessed
  private camera!: THREE.PerspectiveCamera;
  private scene!: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private object?: THREE.Object3D;

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
  private isTakingCapture: boolean = false;

  /**
   * Sets up scene, i.e. object, lighting, depth mapping capability, etc.
   * Error message gets displayed if WebGL is not supported by the user's browser.
   */
  constructor() {
    const width: number = window.innerWidth;
    const height: number = window.innerHeight;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      preserveDrawingBuffer: true,
    });

    if (
      (this.renderer.capabilities.isWebGL2 === false &&
        this.renderer.extensions.has("WEBGL_depth_texture") === false) ||
      this.supportsExtension === false
    ) {
      this.supportsExtension = false;
      document.getElementById("error")!.style.display = "block";
      return;
    }

    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(width, height);
    document.body.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(70, width / height, 0.1, 150);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;

    this.controls.minDistance = 10;
    this.controls.maxDistance = 100;

    // Handle model rendering & depth mapping.
    this.createRenderTarget();
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x00ff00);

    this.loadObject();
    this.setupLights();
    this.createDepthMap();

    this.onWindowResize();
    window.addEventListener("resize", this.onWindowResize);
  }

  /**
   * Updates scene as necessary, i.e. if controls are moved, depth map is enabled, or capture is being taken. Called from main.ts!
   */
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

    if (this.isTakingCapture) {
      const imgDataUrl = this.capture();
      Exporter.download(imgDataUrl, "image/png", "scene.png");
    }

    this.controls.update();
  };

  /**
   * Renders the current camera position to the screen.
   */
  public updateCameraPositionDisplay = () => {
    const cameraPosElement = document.getElementById("camera-position");
    if (cameraPosElement) {
      cameraPosElement.textContent = `x: ${this.camera.position.x.toFixed(
        2
      )}, y: ${this.camera.position.y.toFixed(
        2
      )}, z: ${this.camera.position.z.toFixed(2)}`;
    }
  };

  /**
   * Setter function for the camera's field-of-view.
   * @param fov Numerical value between 1 and 360.
   */
  public updateFov = (fov: number) => {
    if (!(fov >= 1 && fov <= 360)) return;

    this.camera.fov = fov;
    this.camera.updateProjectionMatrix();
  };

  /**
   * Setter function for the camera's near field.
   * @param near Positive numerical value.
   */
  public updateNear = (near: number) => {
    if (!(near >= 0)) return;

    this.camera.near = near;
    this.camera.updateProjectionMatrix();
  };

  /**
   * Setter function for the camera's near field.
   * @param far Positive numerical value.
   */
  public updateFar = (far: number) => {
    if (!(far >= 0)) return;

    this.camera.far = far;
    this.camera.updateProjectionMatrix();
  };

  /**
   * Calculates all positioning data for the rendered object and exports it to the JSON format governed by SceneMetadata and its child types.
   */
  public downloadDepthInformationAsJSON = () => {
    let screenSpaceData: Depth[] | null = null;
    let worldDepthData: Depth[] | null = null;

    this.object!.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;

      const geometry: THREE.BufferGeometry = node.geometry;
      const vertices = this.getVertices(geometry);

      const screenSpaceVertices: THREE.Vector3[] =
        this.projectVerticesToScreenSpace(this.getScreenSpaceDimensions());

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
    const spaceData: Space = {
      cameraPosition: new THREE.Vector3(
        this.camera.position.x,
        this.camera.position.y,
        this.camera.position.z
      ),
      screenSpace: screenSpaceData ?? undefined,
      worldSpace: worldDepthData ?? undefined,
    };

    // Parse all required data into a SceneMetadata object for exportation.
    const data: SceneMetadata = {
      canvasSize: this.getScreenSpaceDimensions(),
      space: spaceData,
    };

    // Download the JSON!
    Exporter.download(
      JSON.stringify(data, null, 2),
      "application/json",
      "data.json"
    );
  };

  /**
   * Loads a new 3D model into the scene, removing the old one.
   */
  public loadNewObject = (url: string) => {
    this.removeOldObjectFromScene();
    this.loadObject(url);
  };

  /**
   * Toggles depth map functionality.
   */
  public toggleDepthMap = () => {
    this.useDepthShader = !this.useDepthShader;
  };

  /**
   * Updates status to begin handling screen capture processing.
   */
  public captureScene = () => {
    this.isTakingCapture = true;
  };

  /**
   * Renders the current scene out to a PNG image.
   *
   * @returns The Data URL for the finalised scene image.
   */
  private capture = (): string => {
    const canvas = document.querySelector("canvas");
    const dataUrl: string = canvas!.toDataURL("image/png");

    this.isTakingCapture = false;

    return dataUrl;
  };

  /**
   * Makes a hidden object visible again.
   *
   * @param id Unique identifier for an object in the Three.js scene.
   */
  private showObjectById = (id?: number) => {
    if (id === undefined) return;

    const objectToHide: THREE.Object3D | undefined =
      this.scene.getObjectById(id);

    if (objectToHide) objectToHide.visible = true;
  };

  /**
   * Hides a visible object.
   *
   * @param id Unique identifier for an object in the Three.js scene.
   */
  private hideObjectById = (id?: number) => {
    if (id === undefined) return;

    const objectToHide: THREE.Object3D | undefined =
      this.scene.getObjectById(id);

    if (objectToHide) objectToHide.visible = false;
  };

  /**
   * Prepares an object for rendering within the scene by creating a render target.
   */
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

  /**
   * Deletes unwanted object from the scene.
   */
  private removeOldObjectFromScene() {
    if (this.object) {
      this.scene.remove(this.object);
      this.object.traverse((child) => {
        const mesh: THREE.Mesh = child as THREE.Mesh;

        if (mesh.isMesh) {
          if (mesh.geometry) mesh.geometry.dispose();

          if (mesh.material) {
            const material = mesh.material;

            if (Array.isArray(material))
              material.forEach((mat) => mat.dispose());
            else material.dispose();
          }
        }
      });

      this.object = undefined;
    }
  }

  /**
   * Renders 3D model from .obj file to the scene.
   *
   * @param url Location of the model to be loaded in.
   */
  private loadObject = (url: string = Constants.objectRegistry.sofa.path) => {
    // Load .obj model!
    const loader = new OBJLoader();
    loader.load(
      url,
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

  /**
   * Calculates depth map projection using shaders - displays when toggled in the UI.
   */
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

  /**
   * Points 'lights' at the object.
   */
  private setupLights = () => {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.ambientLightId = ambientLight.id;
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(0, 10, 10);
    this.directionalLightId = directionalLight.id;
    this.scene.add(directionalLight);
  };

  /**
   * Finds all vertices on a given 3D object in world space.
   *
   * @param geometry
   * @returns `Vector3[]`
   */
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

  /**
   * Figures out whether or not a vertex is visible to the user - i.e. might be hidden behind other vertices.
   *
   * @param worldVertex Vertex's location in 3D space.
   * @param meshNode
   * @returns `boolean`
   */
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

  /**
   * Calculates whereabouts each vertex would be placed when translated to a 2D space, i.e. position on a screen.
   *
   * @param canvasDimensions Dimensions to which the points in 3D space should be projected to.
   * @returns `Vector3[]`
   */
  private projectVerticesToScreenSpace = (
    canvasDimensions: THREE.Vector2
  ): THREE.Vector3[] => {
    let tempVertices: THREE.Vector3[] = [];

    this.object!.traverse((node: unknown) => {
      if (!(node instanceof THREE.Mesh)) return;

      const geometry: THREE.BufferGeometry = node.geometry;
      const vertices = this.getVertices(geometry);

      const widthHalf: number = 0.5 * canvasDimensions.width;
      const heightHalf: number = 0.5 * canvasDimensions.height;

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

  /**
   * Obtain either actual or scaled screen size.
   *
   * @returns `Vector2`
   */
  private getScreenSpaceDimensions = () => {
    const needToScale = (
      document.getElementById("should-scale-screen-space") as HTMLInputElement
    ).checked;

    let width: number, height: number;

    switch (needToScale) {
      case true:
        const xInput: HTMLInputElement = document.getElementById(
          "scale-screen-space-x"
        ) as HTMLInputElement;

        const yInput: HTMLInputElement = document.getElementById(
          "scale-screen-space-y"
        ) as HTMLInputElement;

        // Set width + height, ensuring they are both at least 1px.
        width = parseInt(xInput.value);
        width = width > 0 ? width : 1;

        height = parseInt(yInput.value);
        height = height > 0 ? height : 1;

        break;

      case false:
        const canvas = document.querySelector("canvas");
        width = canvas!.clientWidth;
        height = canvas!.clientHeight;

        break;
    }

    return new THREE.Vector2(width, height);
  };

  /**
   * Handles proper resizing of the scene in the case of a browser window resize.
   */
  private onWindowResize = () => {
    const aspect = window.innerWidth / window.innerHeight;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();

    const dpr = this.renderer.getPixelRatio();
    this.target?.setSize(window.innerWidth * dpr, window.innerHeight * dpr);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };
}
