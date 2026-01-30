import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stage, useGLTF } from '@react-three/drei';

const Model = ({ url }) => {
  const { scene } = useGLTF(url);
  const meshRef = useRef();
  const [autoRotate, setAutoRotate] = useState(true);

  useFrame(() => {
    if (autoRotate && meshRef.current) {
      meshRef.current.rotation.y += 0.005;
    }
  });

  return (
    <primitive
      ref={meshRef}
      object={scene}
      scale={2}
      onPointerDown={() => setAutoRotate(false)}
      onPointerUp={() => setAutoRotate(true)}
    />
  );
};

const ProductViewer3D = ({ modelUrl }) => {
  if (!modelUrl) {
    return (
      <div className="w-full aspect-square bg-zinc-100 flex items-center justify-center">
        <p className="mono-font text-sm text-zinc-400">3D Model Not Available</p>
      </div>
    );
  }

  return (
    <div className="w-full aspect-square bg-zinc-50" data-testid="product-3d-viewer">
      <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
        <Stage environment="city" intensity={0.5}>
          <Model url={modelUrl} />
        </Stage>
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 1.5}
        />
      </Canvas>
    </div>
  );
};

export default ProductViewer3D;
