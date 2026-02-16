"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Sphere,
  MeshDistortMaterial,
  OrbitControls,
  Grid,
  Environment,
} from "@react-three/drei";
import * as THREE from "three";

interface AvatarProps {
  analyser?: AnalyserNode | null;
  isSpeaking: boolean;
}

const CandidateReflectionRig = () => {
  return (
    <group position={[0, 0, 5]} rotation={[0, Math.PI, 0]}>
      {/* Desk */}
      <mesh position={[0, -1.5, 2]}>
        <boxGeometry args={[4, 0.1, 2]} />
        <meshStandardMaterial color="#202020" roughness={0.2} metalness={0.8} />
      </mesh>
      {/* Laptop */}
      <group position={[0, -1.45, 2]} rotation={[0, Math.PI, 0]}>
        <mesh position={[0, 0.05, 0]}>
          <boxGeometry args={[0.8, 0.02, 0.5]} />
          <meshStandardMaterial color="#555" />
        </mesh>
        <mesh position={[0, 0.3, -0.25]} rotation={[Math.PI / 6, 0, 0]}>
          <boxGeometry args={[0.8, 0.45, 0.02]} />
          <meshStandardMaterial color="#111" />
        </mesh>
      </group>
      {/* Human Silhouette (Abstract) */}
      <mesh position={[0, -0.5, 3]}>
        <capsuleGeometry args={[0.4, 1, 4, 8]} />
        <meshStandardMaterial color="#101010" roughness={0.9} />
      </mesh>
    </group>
  );
};

const CoreMesh: React.FC<{ analyser?: AnalyserNode | null; isSpeaking: boolean }> = ({
  analyser,
  isSpeaking,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<any>(null);
  const dataArray = useMemo(
    () => new Uint8Array(analyser?.frequencyBinCount || 128),
    [analyser]
  );

  useFrame((state) => {
    if (!meshRef.current || !materialRef.current) return;

    let averageFreq = 0;
    if (analyser && isSpeaking) {
      analyser.getByteFrequencyData(dataArray);
      const sum = dataArray.reduce((a, b) => a + b, 0);
      averageFreq = sum / dataArray.length;
    }

    const time = state.clock.getElapsedTime();

    // Physics - Liquid metal movement
    const targetDistort = isSpeaking ? 0.3 + (averageFreq / 255) * 0.5 : 0.1;
    const targetSpeed = isSpeaking ? 3 + (averageFreq / 255) * 5 : 0.5;

    // Smooth Lerping
    materialRef.current.distort = THREE.MathUtils.lerp(
      materialRef.current.distort,
      targetDistort,
      0.1
    );
    materialRef.current.speed = THREE.MathUtils.lerp(
      materialRef.current.speed,
      targetSpeed,
      0.1
    );

    // Gentle Rotation
    meshRef.current.rotation.x = Math.sin(time * 0.2) * 0.2;
    meshRef.current.rotation.y = time * 0.15;

    // Colors: Pure Bright Silver (Monochrome)
    const baseColor = new THREE.Color("#E8E8E8");
    const activeColor = new THREE.Color("#FFFFFF");

    const intensity = isSpeaking ? Math.min(averageFreq / 150, 1) : 0;

    materialRef.current.color.lerpColors(baseColor, activeColor, intensity);
    materialRef.current.roughness = THREE.MathUtils.lerp(0.15, 0.0, intensity);
  });

  return (
    <Sphere args={[1, 128, 128]} ref={meshRef}>
      <MeshDistortMaterial
        ref={materialRef}
        color="#E8E8E8"
        envMapIntensity={1.5}
        clearcoat={1}
        clearcoatRoughness={0.1}
        metalness={1}
        roughness={0.1}
        radius={1}
        distort={0.1}
      />
    </Sphere>
  );
};

const GraphicBackground = () => {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.02;
      groupRef.current.rotation.x += delta * 0.01;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Outer wireframe */}
      <mesh scale={[3.8, 3.8, 3.8]}>
        <icosahedronGeometry args={[1, 2]} />
        <meshBasicMaterial
          color="#333333"
          wireframe
          transparent
          opacity={0.15}
        />
      </mesh>
      {/* Inner wireframe */}
      <mesh scale={[2.5, 2.5, 2.5]} rotation={[0.5, 0.5, 0]}>
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial
          color="#555555"
          wireframe
          transparent
          opacity={0.1}
        />
      </mesh>
    </group>
  );
};

const HolographicAvatar: React.FC<AvatarProps> = ({ analyser, isSpeaking }) => {
  return (
    <div className="w-full h-full min-h-[250px] md:min-h-[400px] relative rounded-lg overflow-hidden bg-[#121212]">
      <Canvas camera={{ position: [0, 1, 4.5], fov: 50 }}>
        <color attach="background" args={["#121212"]} />

        {/* Studio Lighting */}
        <ambientLight intensity={1.5} />
        <spotLight
          position={[10, 10, 10]}
          angle={0.15}
          penumbra={1}
          intensity={2}
          castShadow
        />
        <pointLight position={[-10, -10, -10]} intensity={1} color="#ffffff" />

        {/* Environment - Apartment for realistic reflections */}
        <Environment preset="city" />

        <GraphicBackground />

        <CandidateReflectionRig />

        <Grid
          position={[0, -2, 0]}
          args={[10.5, 10.5]}
          cellSize={0.6}
          cellThickness={0.5}
          cellColor={"#333333"}
          sectionSize={3.3}
          sectionThickness={1}
          sectionColor={"#444444"}
          fadeDistance={10}
          fadeStrength={1}
        />

        <CoreMesh analyser={analyser} isSpeaking={isSpeaking} />

        <OrbitControls
          enableZoom={false}
          enablePan={false}
          minPolarAngle={Math.PI / 2.5}
          maxPolarAngle={Math.PI / 1.8}
        />
      </Canvas>
    </div>
  );
};

export default HolographicAvatar;
