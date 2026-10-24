import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { Grid, Crosshair, Compass, ChevronDown, ChevronUp, Layers, CheckCircle2, Sliders, ExternalLink } from "lucide-react";
import { SimulatedVehicle, CameraNode } from "../types/reid";
import { CAMERA_NODES } from "../lib/reidEngine";
import { buildProceduralVehicleMesh } from "./ThreeVehicleModels";

interface ThreeCorridorSceneProps {
  vehicles: SimulatedVehicle[];
  selectedVehicleId: string | null;
  activeCameraView: "overview" | "CAM_A" | "CAM_B" | "CAM_C" | "CAM_D" | "chase";
  onSelectVehicle: (id: string) => void;
  onVehicleCameraPass: (vehicle: SimulatedVehicle, camera: CameraNode) => void;
  showFrustums: boolean;
  showTrajectories?: boolean;
  showCalibration?: boolean;
  congestionSpeedFactor: number;
  onSelectCameraView?: (view: "overview" | "CAM_A" | "CAM_B" | "CAM_C" | "CAM_D" | "chase") => void;
  isNightMode?: boolean;
  enhancerMode?: "none" | "retinex_net" | "thermal_ir";
  offlineCameraId?: string | null;
}

// Scratch reusable math objects pre-allocated at module scope (Zero GC in tick)
const _scratchVec3A = new THREE.Vector3();
const _scratchVec3B = new THREE.Vector3();

// Trail points limit
const MAX_TRAIL_POINTS = 32;

interface VehicleTrailData {
  line: THREE.Line;
  geometry: THREE.BufferGeometry;
  positions: Float32Array;
  points: { x: number; y: number; z: number }[];
  material: THREE.LineBasicMaterial;
}

export const ThreeCorridorScene: React.FC<ThreeCorridorSceneProps> = ({
  vehicles,
  selectedVehicleId,
  activeCameraView,
  onSelectVehicle,
  onVehicleCameraPass,
  showFrustums,
  showTrajectories = true,
  showCalibration = false,
  congestionSpeedFactor,
  onSelectCameraView,
  isNightMode = false,
  enhancerMode = "retinex_net",
  offlineCameraId = null,
}) => {
  const [selectedCalibCam, setSelectedCalibCam] = useState<"CAM_A" | "CAM_B" | "CAM_C" | "CAM_D">("CAM_A");
  const [isCalibHudCollapsed, setIsCalibHudCollapsed] = useState(false);
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const keyLightRef = useRef<THREE.DirectionalLight | null>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight | null>(null);
  const vehicleMeshesMap = useRef<Map<string, THREE.Group>>(new Map());
  const frustumGroupRef = useRef<THREE.Group | null>(null);
  const trajectoryGroupRef = useRef<THREE.Group | null>(null);
  const flowConduitsGroupRef = useRef<THREE.Group | null>(null);
  const calibrationGroupRef = useRef<THREE.Group | null>(null);
  const selectedTrajectoryArcRef = useRef<THREE.Line | null>(null);
  const vehicleTrailsMap = useRef<Map<string, VehicleTrailData>>(new Map());
  const flowPulsesRef = useRef<THREE.Mesh[]>([]);
  const isSoftwareGlRef = useRef<boolean>(false);

  // Keep latest props in refs for animation loop
  const vehiclesRef = useRef(vehicles);
  vehiclesRef.current = vehicles;
  const selectedIdRef = useRef(selectedVehicleId);
  selectedIdRef.current = selectedVehicleId;
  const cameraViewRef = useRef(activeCameraView);
  cameraViewRef.current = activeCameraView;
  const speedFactorRef = useRef(congestionSpeedFactor);
  speedFactorRef.current = congestionSpeedFactor;
  const onPassRef = useRef(onVehicleCameraPass);
  onPassRef.current = onVehicleCameraPass;
  const showTrajectoriesRef = useRef(showTrajectories);
  showTrajectoriesRef.current = showTrajectories;

  // Track vehicles passed through cameras to fire notifications
  const passedCameraState = useRef<Map<string, Set<string>>>(new Map());

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Detect software WebGL
    const isSoftwareGl = (() => {
      try {
        const gl = document.createElement("canvas").getContext("webgl2");
        if (!gl) return true;
        const ext = gl.getExtension("WEBGL_debug_renderer_info");
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension("WEBGL_lose_context")?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return false;
      }
    })();
    isSoftwareGlRef.current = isSoftwareGl;

    // Setup Three.js scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const skyColor = new THREE.Color(0xf1f5f9);
    scene.background = skyColor;
    scene.fog = new THREE.FogExp2(0xf1f5f9, 0.007);

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.5,
      350
    );
    camera.position.set(-15, 48, 50);
    camera.lookAt(8, 0, -2);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: "high-performance",
    });
    rendererRef.current = renderer;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Studio Environment Reflection via RoomEnvironment
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Studio 3-Point Lighting Rig
    const keyLight = new THREE.DirectionalLight(0xfff7ed, 2.2);
    keyLight.position.set(-35, 45, 25);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 10;
    keyLight.shadow.camera.far = 120;
    keyLight.shadow.camera.left = -60;
    keyLight.shadow.camera.right = 60;
    keyLight.shadow.camera.top = 25;
    keyLight.shadow.camera.bottom = -25;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);
    keyLightRef.current = keyLight;

    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x1e293b, 1.0);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);
    hemiLightRef.current = hemiLight;

    // Build Ground and Urban Corridor Road Network
    buildEnvironment(scene);

    // Build CCTV Camera Towers & Frustums
    const frustumGroup = new THREE.Group();
    frustumGroupRef.current = frustumGroup;
    scene.add(frustumGroup);
    buildCameraPoles(scene, frustumGroup);

    // Build Trajectory Groups:
    // 1. Vehicle dynamic motion trails group
    const trajectoryGroup = new THREE.Group();
    trajectoryGroupRef.current = trajectoryGroup;
    scene.add(trajectoryGroup);

    // 2. Inter-Camera Spatio-Temporal Corridor Flow Conduits
    const { conduitGroup, pulseMeshes } = buildInterCameraFlowConduits();
    flowConduitsGroupRef.current = conduitGroup;
    flowPulsesRef.current = pulseMeshes;
    scene.add(conduitGroup);

    // 3. Highlighted Spatio-Temporal Route Arc for selected vehicle
    const arcGeo = new THREE.BufferGeometry();
    const arcPositions = new Float32Array(100 * 3);
    arcGeo.setAttribute("position", new THREE.BufferAttribute(arcPositions, 3));
    const arcMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.9,
      linewidth: 3,
    });
    const selectedArc = new THREE.Line(arcGeo, arcMat);
    selectedArc.visible = false;
    selectedArc.renderOrder = 4;
    selectedTrajectoryArcRef.current = selectedArc;
    scene.add(selectedArc);

    // 4. Homography Calibration Grids & Perspective Projection Rays
    const calibrationGroup = buildHomographyCalibrationSystem();
    calibrationGroupRef.current = calibrationGroup;
    calibrationGroup.visible = showCalibration;
    scene.add(calibrationGroup);

    // Resize listener
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    // Raycasting for vehicle click inspection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const handlePointerDown = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const vehicleMeshes: THREE.Object3D[] = [];
      vehicleMeshesMap.current.forEach((group) => {
        vehicleMeshes.push(group);
      });

      const intersects = raycaster.intersectObjects(vehicleMeshes, true);
      if (intersects.length > 0) {
        let obj: THREE.Object3D | null = intersects[0].object;
        while (obj && !obj.userData?.vehicleId && obj.parent) {
          obj = obj.parent;
        }
        if (obj?.userData?.vehicleId) {
          onSelectVehicle(obj.userData.vehicleId);
        }
      }
    };
    container.addEventListener("pointerdown", handlePointerDown);

    // Render loop
    let frameId = 0;
    let lastTime = performance.now();

    const tick = () => {
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      // Update vehicle positions, trail histories, and flow pulses
      updateVehicles(dt, now);

      // Smooth camera position damping
      updateCameraPosition(dt);

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
      container.removeEventListener("pointerdown", handlePointerDown);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update frustums visibility
  useEffect(() => {
    if (frustumGroupRef.current) {
      frustumGroupRef.current.visible = showFrustums;
    }
  }, [showFrustums]);

  // Update trajectory visibility
  useEffect(() => {
    if (trajectoryGroupRef.current) {
      trajectoryGroupRef.current.visible = showTrajectories;
    }
    if (flowConduitsGroupRef.current) {
      flowConduitsGroupRef.current.visible = showTrajectories;
    }
    if (selectedTrajectoryArcRef.current) {
      selectedTrajectoryArcRef.current.visible = showTrajectories && !!selectedVehicleId;
    }
  }, [showTrajectories, selectedVehicleId]);

  // Update calibration visibility
  useEffect(() => {
    if (calibrationGroupRef.current) {
      calibrationGroupRef.current.visible = !!showCalibration;
    }
  }, [showCalibration]);

  // Dynamic Day/Night Lighting and Thermal/IR view mode
  useEffect(() => {
    const scene = sceneRef.current;
    const keyLight = keyLightRef.current;
    const hemiLight = hemiLightRef.current;
    if (!scene || !keyLight || !hemiLight) return;

    if (isNightMode) {
      if (enhancerMode === "thermal_ir") {
        scene.background = new THREE.Color(0x022c22);
        if (scene.fog) scene.fog.color = new THREE.Color(0x022c22);
        keyLight.intensity = 0.65;
        keyLight.color.setHex(0x34d399);
        hemiLight.color.setHex(0x10b981);
        hemiLight.groundColor.setHex(0x064e3b);
      } else {
        scene.background = new THREE.Color(0x040814);
        if (scene.fog) scene.fog.color = new THREE.Color(0x040814);
        keyLight.intensity = 0.45;
        keyLight.color.setHex(0x93c5fd);
        hemiLight.color.setHex(0x38bdf8);
        hemiLight.groundColor.setHex(0x020617);
      }
    } else {
      scene.background = new THREE.Color(0xf1f5f9);
      if (scene.fog) scene.fog.color = new THREE.Color(0xf1f5f9);
      keyLight.intensity = 2.4;
      keyLight.color.setHex(0xfffbeb);
      hemiLight.color.setHex(0xffffff);
      hemiLight.groundColor.setHex(0xe2e8f0);
    }
  }, [isNightMode, enhancerMode]);

  // Sync vehicle meshes with React state
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const currentMap = vehicleMeshesMap.current;
    const trailMap = vehicleTrailsMap.current;
    const activeIds = new Set(vehicles.map((v) => v.id));

    // Remove obsolete meshes and trails
    currentMap.forEach((mesh, id) => {
      if (!activeIds.has(id)) {
        scene.remove(mesh);
        currentMap.delete(id);

        const trail = trailMap.get(id);
        if (trail) {
          if (trajectoryGroupRef.current) {
            trajectoryGroupRef.current.remove(trail.line);
          }
          trail.geometry.dispose();
          trail.material.dispose();
          trailMap.delete(id);
        }
      }
    });

    // Add new or update existing
    vehicles.forEach((veh) => {
      let group = currentMap.get(veh.id);
      if (!group) {
        group = buildProceduralVehicleMesh(
          veh.type,
          veh.primaryColorHex,
          veh.secondaryColorHex,
          veh.microFeatures,
          veh.fastagPlacement
        );
        group.userData = { vehicleId: veh.id };
        scene.add(group);
        currentMap.set(veh.id, group);
      }

      // Initialize trail line if not present
      if (!trailMap.has(veh.id) && trajectoryGroupRef.current) {
        const positions = new Float32Array(MAX_TRAIL_POINTS * 3);
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        const mat = new THREE.LineBasicMaterial({
          color: new THREE.Color(veh.primaryColorHex || "#38bdf8"),
          transparent: true,
          opacity: 0.7,
          linewidth: 2,
        });
        const line = new THREE.Line(geo, mat);
        line.renderOrder = 2;
        trajectoryGroupRef.current.add(line);

        trailMap.set(veh.id, {
          line,
          geometry: geo,
          positions,
          points: [],
          material: mat,
        });
      }

      group.position.set(veh.currentPosition[0], veh.currentPosition[1], veh.currentPosition[2]);
      group.rotation.y = Math.PI / 2;
    });
  }, [vehicles]);

  // Vehicle motion, trajectory lines update & camera pass detection
  const updateVehicles = (dt: number, timeMs: number) => {
    const speedFactor = speedFactorRef.current;
    const currentVehicles = vehiclesRef.current;
    const meshes = vehicleMeshesMap.current;
    const trailMap = vehicleTrailsMap.current;
    const isTrajectoriesVisible = showTrajectoriesRef.current;
    const selectedId = selectedIdRef.current;

    // 1. Animate Spatio-Temporal Inter-Camera Conduit Pulses
    const pulseMeshes = flowPulsesRef.current;
    if (pulseMeshes.length > 0 && isTrajectoriesVisible) {
      const cycleTime = (timeMs / 1000) * 1.5;
      pulseMeshes.forEach((pulse, idx) => {
        // Offset each pulse slightly
        const progress = ((cycleTime + idx * 0.28) % 1.0);
        // Map from Cam 01 (-45) to Cam 03 (+45)
        pulse.position.x = -50 + progress * 100;
      });
    }

    // 2. Update each vehicle position and trajectory ribbon
    currentVehicles.forEach((veh) => {
      const step = veh.velocity * speedFactor * dt;
      veh.currentPosition[0] += step;

      const trail = trailMap.get(veh.id);

      // Wrap around corridor from -65 to +65
      if (veh.currentPosition[0] > 65) {
        veh.currentPosition[0] = -65;
        passedCameraState.current.delete(veh.id);
        if (trail) {
          trail.points = [];
          trail.geometry.setDrawRange(0, 0);
        }
      }

      const mesh = meshes.get(veh.id);
      if (mesh) {
        mesh.position.set(veh.currentPosition[0], veh.currentPosition[1], veh.currentPosition[2]);

        const isSelected = veh.id === selectedId;
        if (isSelected) {
          mesh.scale.set(1.08, 1.08, 1.08);
        } else {
          mesh.scale.set(1.0, 1.0, 1.0);
        }
      }

      // Update visible trajectory line trail
      if (trail && isTrajectoriesVisible) {
        // Record current position
        const currentPt = {
          x: veh.currentPosition[0],
          y: veh.currentPosition[1] + 0.14, // elevated slightly above asphalt
          z: veh.currentPosition[2],
        };

        trail.points.push(currentPt);
        if (trail.points.length > MAX_TRAIL_POINTS) {
          trail.points.shift();
        }

        const count = trail.points.length;
        const posArray = trail.positions;
        for (let i = 0; i < count; i++) {
          const pt = trail.points[i];
          posArray[i * 3] = pt.x;
          posArray[i * 3 + 1] = pt.y;
          posArray[i * 3 + 2] = pt.z;
        }

        trail.geometry.attributes.position.needsUpdate = true;
        trail.geometry.setDrawRange(0, count);

        // Enhance appearance for selected vehicle
        if (veh.id === selectedId) {
          trail.material.color.setHex(0x38bdf8);
          trail.material.opacity = 1.0;
        } else {
          trail.material.color.set(veh.primaryColorHex || "#38bdf8");
          trail.material.opacity = 0.65;
        }
      }

      // Check if vehicle passes under any Camera Node
      CAMERA_NODES.forEach((cam) => {
        const dist = Math.abs(veh.currentPosition[0] - cam.worldPos[0]);
        if (dist < 4.0) {
          let passedSet = passedCameraState.current.get(veh.id);
          if (!passedSet) {
            passedSet = new Set();
            passedCameraState.current.set(veh.id, passedSet);
          }
          if (!passedSet.has(cam.id)) {
            passedSet.add(cam.id);
            onPassRef.current(veh, cam);
          }
        }
      });
    });

    // 3. Update Selected Vehicle Full-Corridor Spatio-Temporal Waypoint Arc
    const selectedArc = selectedTrajectoryArcRef.current;
    if (selectedArc && isTrajectoriesVisible) {
      const selectedVeh = currentVehicles.find((v) => v.id === selectedId);
      if (selectedVeh) {
        selectedArc.visible = true;
        const laneZ = selectedVeh.currentLane * 2.4;
        const arcPos = selectedArc.geometry.attributes.position.array as Float32Array;

        // Draw curved parabolic arc connecting Cam 01 (-45) -> Cam 02 (0) -> Cam 03 (45)
        const numPts = 100;
        for (let i = 0; i < numPts; i++) {
          const t = i / (numPts - 1);
          const x = -50 + t * 100;
          // Arch height peaks at flyover
          const arcHeight = 1.8 + Math.sin(t * Math.PI) * 2.5;
          arcPos[i * 3] = x;
          arcPos[i * 3 + 1] = arcHeight;
          arcPos[i * 3 + 2] = laneZ;
        }
        selectedArc.geometry.attributes.position.needsUpdate = true;
        selectedArc.geometry.setDrawRange(0, numPts);
      } else {
        selectedArc.visible = false;
      }
    }
  };

  // Smooth camera position transitions
  const updateCameraPosition = (dt: number) => {
    const camera = cameraRef.current;
    if (!camera) return;

    const view = cameraViewRef.current;
    let targetPos = _scratchVec3A;
    let lookTarget = _scratchVec3B;

    if (view === "CAM_A") {
      targetPos.set(-45, 14, -8);
      lookTarget.set(-35, 0, 0);
    } else if (view === "CAM_B") {
      targetPos.set(0, 14, 8);
      lookTarget.set(10, 0, 0);
    } else if (view === "CAM_C") {
      targetPos.set(45, 14, -8);
      lookTarget.set(55, 0, 0);
    } else if (view === "CAM_D") {
      targetPos.set(65, 14, 8);
      lookTarget.set(50, 0, 0);
    } else if (view === "chase") {
      const targetVehicle =
        vehiclesRef.current.find((v) => v.id === selectedIdRef.current) ||
        vehiclesRef.current[0];
      if (targetVehicle) {
        targetPos.set(
          targetVehicle.currentPosition[0] - 12,
          7,
          targetVehicle.currentPosition[2] + 6
        );
        lookTarget.set(
          targetVehicle.currentPosition[0] + 8,
          1,
          targetVehicle.currentPosition[2]
        );
      } else {
        targetPos.set(0, 36, 50);
        lookTarget.set(0, 0, 0);
      }
    } else {
      // "overview" - Elevated bird's-eye isometric perspective with clear road visibility
      targetPos.set(-15, 48, 50);
      lookTarget.set(8, 0, -2);
    }

    const lambda = 4.5;
    camera.position.x = THREE.MathUtils.damp(camera.position.x, targetPos.x, lambda, dt);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, targetPos.y, lambda, dt);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, targetPos.z, lambda, dt);

    camera.lookAt(lookTarget);
  };

  const calibData: Record<"CAM_A" | "CAM_B" | "CAM_C" | "CAM_D", {
    name: string;
    junction: string;
    pos: string;
    matrix: [string, string, string][];
    pitch: string;
    gsd: string;
    focalLength: string;
    reprojectionRms: string;
    fiducials: { id: string; world: string; img: string }[];
  }> = {
    CAM_A: {
      name: "Camera 01: Silk Board Entry",
      junction: "Hosur Road Junction",
      pos: "[-45.0m, +14.0m, -8.0m]",
      matrix: [
        ["+1.3420", "-0.4285", "-45.120"],
        ["+0.0241", "+1.9164", "+4.8520"],
        ["+0.0012", "-0.0315", "+1.0000"],
      ],
      pitch: "32.5° Downward Pitch",
      gsd: "2.4 cm/pixel",
      focalLength: "8.2 mm",
      reprojectionRms: "0.38 px RMS",
      fiducials: [
        { id: "P1", world: "[-52m, 0m, -5.5m]", img: "(312, 842)" },
        { id: "P2", world: "[-38m, 0m, -5.5m]", img: "(780, 836)" },
        { id: "P3", world: "[-38m, 0m, +5.5m]", img: "(896, 410)" },
        { id: "P4", world: "[-52m, 0m, +5.5m]", img: "(194, 422)" },
      ],
    },
    CAM_B: {
      name: "Camera 02: Koramangala Flyover",
      junction: "100ft Arterial Flyover",
      pos: "[0.0m, +14.0m, +8.0m]",
      matrix: [
        ["+1.2850", "+0.3952", "+2.4010"],
        ["-0.0184", "+1.8841", "-5.1040"],
        ["-0.0011", "+0.0294", "+1.0000"],
      ],
      pitch: "32.5° Downward Pitch",
      gsd: "2.5 cm/pixel",
      focalLength: "8.0 mm",
      reprojectionRms: "0.41 px RMS",
      fiducials: [
        { id: "P1", world: "[0m, 0m, -5.5m]", img: "(280, 420)" },
        { id: "P2", world: "[14m, 0m, -5.5m]", img: "(820, 415)" },
        { id: "P3", world: "[14m, 0m, +5.5m]", img: "(940, 850)" },
        { id: "P4", world: "[0m, 0m, +5.5m]", img: "(180, 845)" },
      ],
    },
    CAM_C: {
      name: "Camera 03: HSR Layout Exit",
      junction: "Outer Ring Road Exit Gate",
      pos: "[+45.0m, +14.0m, -8.0m]",
      matrix: [
        ["+1.3502", "-0.4150", "+44.802"],
        ["+0.0225", "+1.9080", "+4.9010"],
        ["+0.0011", "-0.0302", "+1.0000"],
      ],
      pitch: "32.5° Downward Pitch",
      gsd: "2.4 cm/pixel",
      focalLength: "8.2 mm",
      reprojectionRms: "0.39 px RMS",
      fiducials: [
        { id: "P1", world: "[38m, 0m, -5.5m]", img: "(320, 835)" },
        { id: "P2", world: "[52m, 0m, -5.5m]", img: "(770, 840)" },
        { id: "P3", world: "[52m, 0m, +5.5m]", img: "(880, 415)" },
        { id: "P4", world: "[38m, 0m, +5.5m]", img: "(210, 420)" },
      ],
    },
    CAM_D: {
      name: "Camera 04: HSR Outer Ring Road Link",
      junction: "HSR Outer Ring Road Underpass Link",
      pos: "[+65.0m, +14.0m, +8.0m]",
      matrix: [
        ["+1.4120", "-0.3890", "+64.120"],
        ["+0.0195", "+1.8840", "+7.9150"],
        ["+0.0009", "-0.0298", "+1.0000"],
      ],
      pitch: "30.0° Downward Pitch",
      gsd: "2.3 cm/pixel",
      focalLength: "8.5 mm",
      reprojectionRms: "0.42 px RMS",
      fiducials: [
        { id: "P1", world: "[58m, 0m, -5.5m]", img: "(310, 820)" },
        { id: "P2", world: "[72m, 0m, -5.5m]", img: "(790, 825)" },
        { id: "P3", world: "[72m, 0m, +5.5m]", img: "(905, 410)" },
        { id: "P4", world: "[58m, 0m, +5.5m]", img: "(205, 415)" },
      ],
    },
  };

  const activeCalib = calibData[selectedCalibCam];

  return (
    <div className="relative w-full h-full overflow-hidden select-none">
      <div ref={mountRef} className="w-full h-full" />

      {/* Floating Homography Calibration HUD */}
      {showCalibration && (
        <div
          style={{
            position: "fixed",
            top: "76px",
            left: "18px",
            zIndex: 35,
            width: "360px",
            maxWidth: "calc(100vw - 36px)",
          }}
          className="bg-slate-950/95 border border-cyan-500/50 rounded-2xl shadow-2xl shadow-cyan-950/60 p-4 text-slate-100 flex flex-col gap-3 transition-all"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-cyan-950/80 text-cyan-400 border border-cyan-800/80">
                <Grid className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-xs font-bold text-white tracking-wide uppercase flex items-center gap-1.5">
                  Homography Matrix (IPM)
                </h3>
                <p className="text-[10px] text-cyan-400/90 font-mono">
                  2D Pixel (u,v) ↔ 3D World (X,Z)
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsCalibHudCollapsed(!isCalibHudCollapsed)}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title={isCalibHudCollapsed ? "Expand Calibration HUD" : "Collapse Calibration HUD"}
            >
              {isCalibHudCollapsed ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </button>
          </div>

          {!isCalibHudCollapsed && (
            <>
              {/* Camera Selector Tabs */}
              <div className="grid grid-cols-3 gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-[11px] font-semibold">
                <button
                  onClick={() => setSelectedCalibCam("CAM_A")}
                  className={`py-1 px-2 rounded-lg transition-all cursor-pointer ${
                    selectedCalibCam === "CAM_A"
                      ? "bg-cyan-500 text-slate-950 font-bold shadow"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  Cam 01
                </button>
                <button
                  onClick={() => setSelectedCalibCam("CAM_B")}
                  className={`py-1 px-2 rounded-lg transition-all cursor-pointer ${
                    selectedCalibCam === "CAM_B"
                      ? "bg-emerald-500 text-slate-950 font-bold shadow"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  Cam 02
                </button>
                <button
                  onClick={() => setSelectedCalibCam("CAM_C")}
                  className={`py-1 px-2 rounded-lg transition-all cursor-pointer ${
                    selectedCalibCam === "CAM_C"
                      ? "bg-amber-400 text-slate-950 font-bold shadow"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  Cam 03
                </button>
              </div>

              {/* Active Camera Specs */}
              <div className="flex flex-col gap-2 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">{activeCalib.name}</span>
                  <span className="text-[10px] text-cyan-400 font-mono">{activeCalib.pitch}</span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  Pole Rig: {activeCalib.pos}
                </div>

                {/* 3x3 Homography Matrix Visualization */}
                <div className="mt-1 bg-slate-950 p-2.5 rounded-lg border border-cyan-900/40 font-mono text-[11px]">
                  <div className="text-[10px] text-slate-400 mb-1 flex items-center justify-between">
                    <span>H (Planar Homography 3×3):</span>
                    <span className="text-emerald-400 text-[10px] flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {activeCalib.reprojectionRms}
                    </span>
                  </div>
                  <div className="space-y-0.5 text-cyan-300">
                    {activeCalib.matrix.map((row: string[], rIdx: number) => (
                      <div key={rIdx} className="flex justify-between tracking-wider">
                        <span>{row[0]}</span>
                        <span>{row[1]}</span>
                        <span>{row[2]}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ground Sample Distance & Fiducial Geometry */}
                <div className="grid grid-cols-2 gap-2 mt-1 text-[11px]">
                  <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Ground Resolution</span>
                    <span className="font-bold text-white font-mono">{activeCalib.gsd}</span>
                  </div>
                  <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Focal Optics</span>
                    <span className="font-bold text-white font-mono">{activeCalib.focalLength}</span>
                  </div>
                </div>

                {/* Ground Fiducial Points Table */}
                <div className="mt-1 bg-slate-950/50 p-2 rounded-lg border border-slate-800/80">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    4-Point Fiducial Correspondences (P1–P4)
                  </span>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] font-mono">
                    {activeCalib.fiducials.map((f: { id: string; world: string; img: string }) => (
                      <div key={f.id} className="flex items-center justify-between text-slate-300">
                        <span className="text-cyan-400 font-bold">{f.id}:</span>
                        <span>{f.img}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 mt-1 pt-1 border-t border-slate-800">
                  <button
                    onClick={() => onSelectCameraView?.(selectedCalibCam)}
                    className="flex-1 py-1.5 px-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Crosshair className="w-3.5 h-3.5" />
                    <span>View Camera Angle</span>
                  </button>
                  <button
                    onClick={() => onSelectCameraView?.("overview")}
                    className="py-1.5 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg text-xs transition-colors cursor-pointer"
                  >
                    Corridor
                  </button>
                </div>
              </div>

              {/* Informative Explanation */}
              <p className="text-[10px] text-slate-400 leading-relaxed bg-cyan-950/30 p-2 rounded-lg border border-cyan-900/30">
                <strong className="text-cyan-300">Why Homography?</strong> Re-ID without license plates relies on kinematic travel-time feasibility <span className="font-mono text-cyan-200">Δt = ΔX / v</span>. Homography strips perspective distortion from CCTV feeds, projecting vehicle bounding boxes onto metrically true road planes.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// Procedural Urban Corridor Environment (Light Architectural Digital Twin)
function buildEnvironment(scene: THREE.Scene) {
  // Vast Architectural Ground Canvas
  const groundGeo = new THREE.PlaneGeometry(360, 280);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.92,
    metalness: 0.02,
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.05, 0);
  ground.receiveShadow = true;
  scene.add(ground);

  // Main Arterial Road Canvas
  const roadWidth = 14;
  const roadLength = 180;
  const roadGeo = new THREE.PlaneGeometry(roadLength, roadWidth);
  const roadMat = new THREE.MeshStandardMaterial({
    color: 0xdbe2ea,
    roughness: 0.8,
    metalness: 0.08,
  });
  const road = new THREE.Mesh(roadGeo, roadMat);
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0, 0);
  road.receiveShadow = true;
  scene.add(road);

  // Road Curbs / Sidewalks (Matte Architectural Stone)
  const curbMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.85 });
  const curbN = new THREE.Mesh(new THREE.BoxGeometry(roadLength, 0.35, 3.8), curbMat);
  curbN.position.set(0, 0.18, -roadWidth / 2 - 1.9);
  curbN.receiveShadow = true;
  curbN.castShadow = true;
  scene.add(curbN);

  const curbS = new THREE.Mesh(new THREE.BoxGeometry(roadLength, 0.35, 3.8), curbMat);
  curbS.position.set(0, 0.18, roadWidth / 2 + 1.9);
  curbS.receiveShadow = true;
  curbS.castShadow = true;
  scene.add(curbS);

  // Lane Markings (Clean White Dashes)
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const numDashes = 42;
  for (let laneOffset of [-2.4, 2.4]) {
    for (let i = 0; i < numDashes; i++) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.22), lineMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(-80 + i * 4.0, 0.03, laneOffset);
      scene.add(dash);
    }
  }

  // Amber Center Divider Line
  const amberLineMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
  const centerLine = new THREE.Mesh(new THREE.PlaneGeometry(roadLength, 0.28), amberLineMat);
  centerLine.rotation.x = -Math.PI / 2;
  centerLine.position.set(0, 0.03, 0);
  scene.add(centerLine);

  // Crossings
  for (let jx of [-45, 0, 45]) {
    for (let z = -5; z <= 5; z += 1.4) {
      const zebra = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.7), lineMat);
      zebra.rotation.x = -Math.PI / 2;
      zebra.position.set(jx - 4, 0.03, z);
      scene.add(zebra);
    }
  }

  // Street Light Poles
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.5, metalness: 0.5 });
  for (let x = -70; x <= 70; x += 22) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 8, 8), poleMat);
    pole.position.set(x, 4, -roadWidth / 2 - 2.5);
    scene.add(pole);

    const arm = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.1, 0.1), poleMat);
    arm.position.set(x, 7.9, -roadWidth / 2 - 1.3);
    arm.rotation.y = Math.PI / 2;
    scene.add(arm);
  }

  // Build 3D Isometric White Architectural City Blocks (Matching Reference Image)
  buildProceduralCity(scene);
}

// Procedural Architectural White Isometric City Blocks
function buildProceduralCity(scene: THREE.Scene) {
  const buildingMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.88,
    metalness: 0.05,
  });
  const buildingAccentMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.85,
    metalness: 0.1,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.4,
    metalness: 0.4,
  });
  const parkMat = new THREE.MeshStandardMaterial({
    color: 0xdcfce7,
    roughness: 0.95,
  });
  const treeMat = new THREE.MeshStandardMaterial({
    color: 0x86efac,
    roughness: 0.8,
  });

  // North Side Skyline Blocks (z < -22, safely behind the road corridor)
  const northBuildings = [
    { x: -65, z: -30, w: 14, d: 16, h: 22 },
    { x: -48, z: -34, w: 16, d: 18, h: 32 },
    { x: -28, z: -28, w: 18, d: 14, h: 18 },
    { x: -8, z: -36, w: 16, d: 20, h: 36 },
    { x: 12, z: -30, w: 18, d: 16, h: 24 },
    { x: 34, z: -35, w: 15, d: 18, h: 30 },
    { x: 54, z: -30, w: 18, d: 16, h: 20 },
    { x: 74, z: -34, w: 14, d: 18, h: 26 },

    // Outer North row
    { x: -55, z: -55, w: 18, d: 16, h: 42 },
    { x: -25, z: -52, w: 22, d: 18, h: 28 },
    { x: 8, z: -56, w: 20, d: 20, h: 46 },
    { x: 42, z: -54, w: 22, d: 18, h: 36 },

    // Far East & West Flank Blocks (Outside roadway corridor x in [-70, 70])
    { x: -84, z: 12, w: 16, d: 22, h: 24 },
    { x: 84, z: 12, w: 16, d: 22, h: 24 },
    { x: -84, z: 36, w: 18, d: 20, h: 30 },
    { x: 84, z: 36, w: 18, d: 20, h: 30 },
  ];

  // Foreground (South side, z in [12, 45]):
  // ZERO tall buildings here to ensure 100% unobstructed visibility of road, vehicles & trajectories.
  // Instead: low architectural terraces, pedestrian promenade decks (height 0.4 - 1.2m)
  const southPlazas = [
    { x: -50, z: 20, w: 24, d: 14, h: 0.6 },
    { x: -20, z: 22, w: 26, d: 16, h: 0.8 },
    { x: 15, z: 20, w: 30, d: 14, h: 0.6 },
    { x: 52, z: 22, w: 28, d: 16, h: 0.8 },
  ];

  northBuildings.forEach((b, idx) => {
    // Main building volume
    const geo = new THREE.BoxGeometry(b.w, b.h, b.d);
    const mesh = new THREE.Mesh(geo, idx % 2 === 0 ? buildingMat : buildingAccentMat);
    mesh.position.set(b.x, b.h / 2, b.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    // Rooftop elevator penthouse / mechanical setback
    if (b.h > 20) {
      const roofBoxGeo = new THREE.BoxGeometry(b.w * 0.45, 3.5, b.d * 0.45);
      const roofBox = new THREE.Mesh(roofBoxGeo, glassMat);
      roofBox.position.set(b.x, b.h + 1.75, b.z);
      roofBox.castShadow = true;
      scene.add(roofBox);
    }
  });

  southPlazas.forEach((p) => {
    const geo = new THREE.BoxGeometry(p.w, p.h, p.d);
    const mesh = new THREE.Mesh(geo, buildingAccentMat);
    mesh.position.set(p.x, p.h / 2, p.z);
    mesh.receiveShadow = true;
    scene.add(mesh);
  });

  // Green Courtyard / Park Patches
  const parks = [
    { x: -35, z: -18, w: 8, d: 6 },
    { x: 20, z: -18, w: 10, d: 6 },
    { x: -8, z: 18, w: 12, d: 7 },
    { x: 38, z: 18, w: 10, d: 6 },
  ];

  parks.forEach((p) => {
    const park = new THREE.Mesh(new THREE.PlaneGeometry(p.w, p.d), parkMat);
    park.rotation.x = -Math.PI / 2;
    park.position.set(p.x, 0.02, p.z);
    scene.add(park);

    // Stylized low-poly trees
    for (let i = 0; i < 3; i++) {
      const tree = new THREE.Mesh(new THREE.SphereGeometry(1.0, 7, 7), treeMat);
      tree.position.set(p.x - 2 + i * 2, 1.2, p.z);
      tree.castShadow = true;
      scene.add(tree);
    }
  });

  // Glowing Orange Route Trajectory Line (Matching Reference Screenshot)
  const routePoints = [
    new THREE.Vector3(-70, 0.15, -2.4),
    new THREE.Vector3(-45, 0.15, -2.4), // Cam 01
    new THREE.Vector3(-25, 0.15, 2.4),  // S-curve corridor diversion
    new THREE.Vector3(0, 0.15, 2.4),    // Cam 02
    new THREE.Vector3(25, 0.15, -2.4),
    new THREE.Vector3(45, 0.15, -2.4),  // Cam 03
    new THREE.Vector3(70, 0.15, -2.4),
  ];

  const routeCurve = new THREE.CatmullRomCurve3(routePoints);
  const routeGeo = new THREE.TubeGeometry(routeCurve, 64, 0.25, 8, false);
  const routeMat = new THREE.MeshBasicMaterial({
    color: 0xea580c,
    transparent: true,
    opacity: 0.95,
  });
  const routeMesh = new THREE.Mesh(routeGeo, routeMat);
  scene.add(routeMesh);

  // Waypoint Nodes (Orange, Yellow, Green)
  const waypoints = [
    { pos: [-45, 0.35, -2.4], color: 0xea580c },
    { pos: [-25, 0.35, 2.4], color: 0xf59e0b },
    { pos: [0, 0.35, 2.4], color: 0x10b981 },
    { pos: [25, 0.35, -2.4], color: 0xf59e0b },
    { pos: [45, 0.35, -2.4], color: 0xea580c },
  ];

  waypoints.forEach((wp) => {
    const node = new THREE.Mesh(
      new THREE.SphereGeometry(0.65, 12, 12),
      new THREE.MeshBasicMaterial({ color: wp.color })
    );
    node.position.set(wp.pos[0], wp.pos[1], wp.pos[2]);
    scene.add(node);
  });
}


// Procedural CCTV Camera Poles & Visual Frustums
function buildCameraPoles(scene: THREE.Scene, frustumGroup: THREE.Group) {
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.3, metalness: 0.8 });
  const camMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.2, metalness: 0.7 });
  const lensMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1, metalness: 0.95 });

  CAMERA_NODES.forEach((node) => {
    const [cx, cy, cz] = node.worldPos;

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.28, cy, 12), poleMat);
    pole.position.set(cx, cy / 2, cz);
    scene.add(pole);

    const housing = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 1.4), camMat);
    housing.position.set(cx, cy, cz);
    housing.lookAt(cx + node.viewDirection[0] * 10, cy + node.viewDirection[1] * 10, cz + node.viewDirection[2] * 10);
    scene.add(housing);

    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.2, 16), lensMat);
    lens.position.set(0, 0, 0.75);
    lens.rotation.x = Math.PI / 2;
    housing.add(lens);

    const signMat = new THREE.MeshStandardMaterial({ color: 0x0369a1, roughness: 0.4 });
    const sign = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.8, 0.15), signMat);
    sign.position.set(cx, cy - 2.5, cz);
    scene.add(sign);

    // Visual Detection Frustum
    const frustumGeo = new THREE.ConeGeometry(7.5, 14, 4);
    frustumGeo.rotateY(Math.PI / 4);
    const frustumMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.18,
      wireframe: false,
      depthWrite: false,
    });
    const frustum = new THREE.Mesh(frustumGeo, frustumMat);
    frustum.position.set(cx, cy / 2, 0);
    frustum.rotation.x = Math.PI;
    frustumGroup.add(frustum);

    const wireMat = new THREE.LineBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.4 });
    const wire = new THREE.LineSegments(new THREE.WireframeGeometry(frustumGeo), wireMat);
    wire.position.copy(frustum.position);
    wire.rotation.copy(frustum.rotation);
    frustumGroup.add(wire);

    // Camera Checkpoint Ground Beacon Ring
    const ringGeo = new THREE.RingGeometry(2.8, 3.2, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(cx, 0.04, 0);
    scene.add(ring);

    // Dynamic Road Surface Tyre Pressure Sensor Strip (TPMS / Piezoelectric Grid)
    const sensorStripGeo = new THREE.PlaneGeometry(1.6, 13.8);
    const sensorStripMat = new THREE.MeshBasicMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });
    const sensorStrip = new THREE.Mesh(sensorStripGeo, sensorStripMat);
    sensorStrip.rotation.x = -Math.PI / 2;
    sensorStrip.position.set(cx, 0.038, 0);
    scene.add(sensorStrip);

    // Wheel piezoelectric contact pads per lane
    for (const laneZ of [-2.4, 0, 2.4]) {
      [-0.85, 0.85].forEach((wheelOffset) => {
        const padGeo = new THREE.PlaneGeometry(0.9, 0.5);
        const padMat = new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.75,
        });
        const pad = new THREE.Mesh(padGeo, padMat);
        pad.rotation.x = -Math.PI / 2;
        pad.position.set(cx, 0.042, laneZ + wheelOffset);
        scene.add(pad);
      });
    }
  });
}

// Spatio-Temporal Inter-Camera Corridor Flow Conduits
function buildInterCameraFlowConduits(): { conduitGroup: THREE.Group; pulseMeshes: THREE.Mesh[] } {
  const conduitGroup = new THREE.Group();
  const pulseMeshes: THREE.Mesh[] = [];

  const laneOffsets = [-2.4, 0, 2.4];
  const conduitColors = [0x38bdf8, 0x06b6d4, 0x0284c7];

  laneOffsets.forEach((laneZ, idx) => {
    // 1. Static ground trajectory line running from Cam 01 through Cam 03
    const lineGeo = new THREE.BufferGeometry();
    const pts = [
      new THREE.Vector3(-60, 0.06, laneZ),
      new THREE.Vector3(-45, 0.06, laneZ), // Cam 01
      new THREE.Vector3(0, 0.06, laneZ),   // Cam 02
      new THREE.Vector3(45, 0.06, laneZ),  // Cam 03
      new THREE.Vector3(60, 0.06, laneZ),
    ];
    lineGeo.setFromPoints(pts);

    const lineMat = new THREE.LineDashedMaterial({
      color: conduitColors[idx],
      dashSize: 2.5,
      gapSize: 1.5,
      transparent: true,
      opacity: 0.35,
    });
    const line = new THREE.Line(lineGeo, lineMat);
    line.computeLineDistances();
    conduitGroup.add(line);

    // 2. Animated spatio-temporal flow pulse beads along lane
    for (let p = 0; p < 2; p++) {
      const pulseGeo = new THREE.SphereGeometry(0.28, 8, 8);
      const pulseMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.8,
      });
      const pulseMesh = new THREE.Mesh(pulseGeo, pulseMat);
      pulseMesh.position.set(-45 + p * 45, 0.2, laneZ);
      conduitGroup.add(pulseMesh);
      pulseMeshes.push(pulseMesh);
    }
  });

  return { conduitGroup, pulseMeshes };
}

// Homography Calibration System (Ground Metric Grids, Fiducials & Perspective Projection Rays)
function buildHomographyCalibrationSystem(): THREE.Group {
  const group = new THREE.Group();
  group.name = "HomographyCalibrationSystem";

  const calibrationConfigs = [
    {
      camId: "CAM_A",
      camPos: new THREE.Vector3(-45, 14, -8),
      groundCenter: new THREE.Vector3(-38, 0.05, 0),
      gridSizeX: 14,
      gridSizeZ: 11,
      accentColor: 0x06b6d4, // Cyan
      secondaryColor: 0x38bdf8,
    },
    {
      camId: "CAM_B",
      camPos: new THREE.Vector3(0, 14, 8),
      groundCenter: new THREE.Vector3(7, 0.05, 0),
      gridSizeX: 14,
      gridSizeZ: 11,
      accentColor: 0x10b981, // Emerald
      secondaryColor: 0x34d399,
    },
    {
      camId: "CAM_C",
      camPos: new THREE.Vector3(45, 14, -8),
      groundCenter: new THREE.Vector3(52, 0.05, 0),
      gridSizeX: 14,
      gridSizeZ: 11,
      accentColor: 0xf59e0b, // Amber
      secondaryColor: 0xfbbf24,
    },
  ];

  calibrationConfigs.forEach((cfg) => {
    const camGroup = new THREE.Group();
    camGroup.name = `Calibration_${cfg.camId}`;

    const halfX = cfg.gridSizeX / 2;
    const halfZ = cfg.gridSizeZ / 2;
    const gY = cfg.groundCenter.y;
    const gX = cfg.groundCenter.x;
    const gZ = cfg.groundCenter.z;

    // 1. Semi-transparent planar calibration carpet (IPM Ground Plane)
    const planeGeo = new THREE.PlaneGeometry(cfg.gridSizeX, cfg.gridSizeZ);
    const planeMat = new THREE.MeshBasicMaterial({
      color: cfg.accentColor,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const planeMesh = new THREE.Mesh(planeGeo, planeMat);
    planeMesh.rotation.x = -Math.PI / 2;
    planeMesh.position.set(gX, gY, gZ);
    camGroup.add(planeMesh);

    // 2. Homography Metric Grid lines (1m intervals)
    const gridHelper = new THREE.GridHelper(
      cfg.gridSizeX,
      14,
      cfg.accentColor,
      0x334155
    );
    gridHelper.position.set(gX, gY + 0.005, gZ);
    gridHelper.scale.set(1, 1, cfg.gridSizeZ / cfg.gridSizeX);
    camGroup.add(gridHelper);

    // 3. Perimeter bounding quad lines
    const corners = [
      new THREE.Vector3(gX - halfX, gY + 0.01, gZ - halfZ), // P1 (Top-Left)
      new THREE.Vector3(gX + halfX, gY + 0.01, gZ - halfZ), // P2 (Top-Right)
      new THREE.Vector3(gX + halfX, gY + 0.01, gZ + halfZ), // P3 (Bottom-Right)
      new THREE.Vector3(gX - halfX, gY + 0.01, gZ + halfZ), // P4 (Bottom-Left)
    ];

    const borderGeo = new THREE.BufferGeometry().setFromPoints([
      ...corners,
      corners[0], // Close loop
    ]);
    const borderMat = new THREE.LineBasicMaterial({
      color: cfg.secondaryColor,
      transparent: true,
      opacity: 0.85,
    });
    const borderLine = new THREE.Line(borderGeo, borderMat);
    camGroup.add(borderLine);

    // 4. Ground Fiducial Targets P1, P2, P3, P4
    corners.forEach((corner) => {
      // Fiducial outer ring
      const ringGeo = new THREE.RingGeometry(0.35, 0.5, 20);
      const ringMat = new THREE.MeshBasicMaterial({
        color: cfg.secondaryColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(corner.x, gY + 0.015, corner.z);
      camGroup.add(ring);

      // Fiducial inner center dot
      const dotGeo = new THREE.CircleGeometry(0.12, 12);
      const dotMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
      });
      const dot = new THREE.Mesh(dotGeo, dotMat);
      dot.rotation.x = -Math.PI / 2;
      dot.position.set(corner.x, gY + 0.02, corner.z);
      camGroup.add(dot);

      // Fiducial crosshair lines
      const chGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(corner.x - 0.7, gY + 0.015, corner.z),
        new THREE.Vector3(corner.x + 0.7, gY + 0.015, corner.z),
        new THREE.Vector3(corner.x, gY + 0.015, corner.z - 0.7),
        new THREE.Vector3(corner.x, gY + 0.015, corner.z + 0.7),
      ]);
      const chMat = new THREE.LineBasicMaterial({
        color: cfg.secondaryColor,
        transparent: true,
        opacity: 0.8,
      });
      const crosshair = new THREE.LineSegments(chGeo, chMat);
      camGroup.add(crosshair);

      // 5. Perspective Projection Ray from Camera Optical Center to Ground Fiducial
      const rayGeo = new THREE.BufferGeometry().setFromPoints([
        cfg.camPos,
        corner,
      ]);
      const rayMat = new THREE.LineDashedMaterial({
        color: cfg.accentColor,
        dashSize: 0.8,
        gapSize: 0.5,
        transparent: true,
        opacity: 0.55,
      });
      const ray = new THREE.Line(rayGeo, rayMat);
      ray.computeLineDistances();
      camGroup.add(ray);
    });

    // Optical Center Principal Axis Ray (from camera to ground center)
    const centerRayGeo = new THREE.BufferGeometry().setFromPoints([
      cfg.camPos,
      new THREE.Vector3(gX, gY + 0.02, gZ),
    ]);
    const centerRayMat = new THREE.LineDashedMaterial({
      color: 0xffffff,
      dashSize: 0.5,
      gapSize: 0.3,
      transparent: true,
      opacity: 0.75,
    });
    const centerRay = new THREE.Line(centerRayGeo, centerRayMat);
    centerRay.computeLineDistances();
    camGroup.add(centerRay);

    // Center Coordinate Axis indicators on ground
    const axisXGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(gX, gY + 0.02, gZ),
      new THREE.Vector3(gX + 2.5, gY + 0.02, gZ),
    ]);
    const axisX = new THREE.Line(axisXGeo, new THREE.LineBasicMaterial({ color: 0xef4444 }));
    camGroup.add(axisX);

    const axisZGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(gX, gY + 0.02, gZ),
      new THREE.Vector3(gX, gY + 0.02, gZ + 2.5),
    ]);
    const axisZ = new THREE.Line(axisZGeo, new THREE.LineBasicMaterial({ color: 0x3b82f6 }));
    camGroup.add(axisZ);

    group.add(camGroup);
  });

  return group;
}
