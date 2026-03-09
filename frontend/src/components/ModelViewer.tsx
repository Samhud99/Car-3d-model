import { useEffect, useRef, useState } from "react";
import { getToken } from "../api/client.js";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

interface ModelViewerProps {
  jobId: string;
  carName: string;
  onClose: () => void;
}

export function ModelViewer({ jobId, carName, onClose }: ModelViewerProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let renderer: THREE.WebGLRenderer | null = null;
    let animationId: number | null = null;

    async function init() {
      if (!canvasRef.current) return;

      const container = canvasRef.current;
      const width = container.clientWidth;
      const height = 500;

      // Scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x1a1a2e);

      // Camera
      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
      camera.position.set(6, 4, 8);

      // Renderer
      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;

      if (cancelled) { renderer.dispose(); return; }

      container.appendChild(renderer.domElement);

      // Orbit controls
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 1.5;
      controls.target.set(0, 0.8, 0);

      // Lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(ambientLight);

      const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
      keyLight.position.set(5, 8, 5);
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      scene.add(keyLight);

      const fillLight = new THREE.DirectionalLight(0x8888ff, 0.4);
      fillLight.position.set(-5, 3, -3);
      scene.add(fillLight);

      const rimLight = new THREE.DirectionalLight(0xffffff, 0.6);
      rimLight.position.set(0, 5, -8);
      scene.add(rimLight);

      // Ground plane
      const groundGeo = new THREE.PlaneGeometry(20, 20);
      const groundMat = new THREE.MeshStandardMaterial({
        color: 0x111122,
        roughness: 0.8,
        metalness: 0.2,
      });
      const ground = new THREE.Mesh(groundGeo, groundMat);
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      scene.add(ground);

      // Grid
      const grid = new THREE.GridHelper(20, 40, 0x333355, 0x222244);
      scene.add(grid);

      // Fetch and load GLB
      try {
        const token = getToken();
        const res = await fetch(`/api/models/${jobId}.glb`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });

        if (!res.ok) {
          setError(res.status === 404
            ? "Model file not found — it may still be generating"
            : `Failed to load model (HTTP ${res.status})`
          );
          setLoading(false);
          return;
        }

        const arrayBuffer = await res.arrayBuffer();

        if (cancelled) { renderer.dispose(); return; }

        const loader = new GLTFLoader();
        loader.parse(
          arrayBuffer,
          "",
          (gltf) => {
            if (cancelled) return;

            const model = gltf.scene;

            // Center and scale the model
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 4 / maxDim;

            model.scale.setScalar(scale);
            model.position.sub(center.multiplyScalar(scale));
            model.position.y += (size.y * scale) / 2;

            // Enable shadows on all meshes
            model.traverse((child) => {
              if (child instanceof THREE.Mesh) {
                child.castShadow = true;
                child.receiveShadow = true;
              }
            });

            scene.add(model);

            // Adjust camera to fit
            controls.target.set(0, (size.y * scale) / 2, 0);
            camera.position.set(
              maxDim * scale * 1.5,
              maxDim * scale * 1,
              maxDim * scale * 1.5
            );
            controls.update();

            setLoading(false);
          },
          (err) => {
            console.error("GLB parse error:", err);
            setError("Failed to parse 3D model file");
            setLoading(false);
          }
        );
      } catch (err) {
        console.error("Model fetch error:", err);
        setError("Failed to load 3D model");
        setLoading(false);
        return;
      }

      // Animation loop
      function animate() {
        if (cancelled) return;
        animationId = requestAnimationFrame(animate);
        controls.update();
        renderer!.render(scene, camera);
      }
      animate();

      // Handle resize
      const onResize = () => {
        if (!container || !renderer) return;
        const w = container.clientWidth;
        camera.aspect = w / height;
        camera.updateProjectionMatrix();
        renderer.setSize(w, height);
      };
      window.addEventListener("resize", onResize);

      return () => {
        window.removeEventListener("resize", onResize);
      };
    }

    init();

    return () => {
      cancelled = true;
      if (animationId !== null) cancelAnimationFrame(animationId);
      if (renderer) {
        renderer.dispose();
        if (canvasRef.current && renderer.domElement.parentElement === canvasRef.current) {
          canvasRef.current.removeChild(renderer.domElement);
        }
      }
    };
  }, [jobId]);

  return (
    <div className="model-viewer-overlay" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="model-viewer-container">
        <div className="model-viewer-header">
          <h3>{carName}</h3>
          <button className="model-viewer-close" onClick={onClose}>&times;</button>
        </div>
        <div className="model-viewer-body" ref={canvasRef}>
          {loading && !error && (
            <div className="model-viewer-loading">
              <div className="spinner" />
              Loading 3D model...
            </div>
          )}
          {error && (
            <div className="model-viewer-error">{error}</div>
          )}
        </div>
      </div>
    </div>
  );
}
