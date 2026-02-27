import { useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sphere, Icosahedron, Tetrahedron } from '@react-three/drei';

// Rotating Icosahedron Component
function RotatingIcosahedron() {
  const meshRef = useRef();

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.001;
      meshRef.current.rotation.y += 0.003;
    }
  });

  return (
    <group>
      <Icosahedron ref={meshRef} args={[1, 4]} position={[-2.5, 0, 0]}>
        <meshPhongMaterial
          color="#6366f1"
          emissive="#4f46e5"
          emissiveIntensity={0.4}
        />
      </Icosahedron>
    </group>
  );
}

// Floating Sphere Component
function FloatingSphere() {
  const meshRef = useRef();
  const timeRef = useRef(0);

  useFrame(() => {
    timeRef.current += 0.01;
    if (meshRef.current) {
      meshRef.current.position.y = Math.sin(timeRef.current) * 0.5;
      meshRef.current.rotation.x += 0.002;
      meshRef.current.rotation.z += 0.001;
    }
  });

  return (
    <group>
      <Sphere ref={meshRef} args={[0.8, 32, 32]} position={[0, 0, 0]}>
        <meshPhongMaterial
          color="#06b6d4"
          emissive="#0891b2"
          emissiveIntensity={0.3}
        />
      </Sphere>
    </group>
  );
}

// Rotating Tetrahedron Component
function RotatingTetrahedron() {
  const meshRef = useRef();

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.002;
      meshRef.current.rotation.y += 0.002;
      meshRef.current.rotation.z += 0.001;
    }
  });

  return (
    <group>
      <Tetrahedron ref={meshRef} args={[0.9, 0]} position={[2.5, 0, 0]}>
        <meshPhongMaterial
          color="#ec4899"
          emissive="#be185d"
          emissiveIntensity={0.4}
        />
      </Tetrahedron>
    </group>
  );
}

// Main Scene Component
function Scene() {
  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#4f46e5" />

      <RotatingIcosahedron />
      <FloatingSphere />
      <RotatingTetrahedron />
    </>
  );
}

// Error Boundary Fallback
function CanvasLoadingFallback() {
  return null;
}

// Main Component with Error Handling
export default function FloatingShapes3D() {
  return (
    <div className="floating-shapes-container">
      <Suspense fallback={<CanvasLoadingFallback />}>
        <Canvas
          className="floating-shapes-canvas"
          camera={{ position: [0, 0, 6], fov: 75 }}
          style={{
            width: '100%',
            height: '100%',
            background: 'transparent',
          }}
          gl={{ alpha: true, antialias: true }}
          onCreated={(state) => {
            state.gl.setClearColor(0x000000, 0);
          }}
        >
          <Scene />
        </Canvas>
      </Suspense>
    </div>
  );
}
