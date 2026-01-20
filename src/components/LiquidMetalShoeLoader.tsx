import { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, MeshReflectorMaterial } from "@react-three/drei";
import * as THREE from "three";

// ============================================================================
// TYPES
// ============================================================================

interface LiquidMetalShoeLoaderProps {
  phase?: "construction" | "ambient";
}

interface MetaballProps {
  index: number;
  phase: "construction" | "ambient";
  phaseProgress: number;
}

// ============================================================================
// SHOE PATH DEFINITIONS
// ============================================================================

// Abstract paths that hint at shoe components without being literal
const shoePathPoints = {
  // Sole curve - elongated arc
  sole: [
    new THREE.Vector3(-2.5, -0.8, 0),
    new THREE.Vector3(-1, -1.2, 0.3),
    new THREE.Vector3(0.5, -1.1, 0),
    new THREE.Vector3(2, -0.7, -0.2),
    new THREE.Vector3(2.8, -0.3, 0),
  ],
  // Midsole volume - curved rise
  midsole: [
    new THREE.Vector3(-2, -0.5, 0.5),
    new THREE.Vector3(-0.5, 0, 0.8),
    new THREE.Vector3(1, 0.3, 0.4),
    new THREE.Vector3(2.2, 0.1, 0),
  ],
  // Heel counter - back curve
  heel: [
    new THREE.Vector3(-2.2, 0.5, -0.3),
    new THREE.Vector3(-2.5, 0, 0),
    new THREE.Vector3(-2.2, -0.5, 0.2),
  ],
  // Toe spring - front upturn
  toe: [
    new THREE.Vector3(2.2, -0.4, 0),
    new THREE.Vector3(2.6, 0, 0.2),
    new THREE.Vector3(2.4, 0.4, 0),
  ],
  // Upper volume - top curve
  upper: [
    new THREE.Vector3(-1.5, 0.8, 0),
    new THREE.Vector3(0, 1.2, 0.3),
    new THREE.Vector3(1.5, 0.9, 0),
  ],
};

// Create smooth curves from path points
function createCurve(points: THREE.Vector3[]): THREE.CatmullRomCurve3 {
  return new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.5);
}

const shoeCurves = {
  sole: createCurve(shoePathPoints.sole),
  midsole: createCurve(shoePathPoints.midsole),
  heel: createCurve(shoePathPoints.heel),
  toe: createCurve(shoePathPoints.toe),
  upper: createCurve(shoePathPoints.upper),
};

// ============================================================================
// METABALL COMPONENT
// ============================================================================

function Metaball({ index, phase, phaseProgress }: MetaballProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Each metaball has its own animation parameters
  const params = useMemo(() => {
    const curves = Object.values(shoeCurves);
    const curveIndex = index % curves.length;
    const curve = curves[curveIndex];
    
    return {
      curve,
      baseSpeed: 0.15 + Math.random() * 0.1,
      phaseOffset: (index / 7) * Math.PI * 2,
      scaleBase: 0.35 + Math.random() * 0.15,
      scaleVariation: 0.1 + Math.random() * 0.08,
      // Random starting position for construction phase
      startPos: new THREE.Vector3(
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 3
      ),
      // Ambient phase parameters
      ambientCenter: new THREE.Vector3(
        (Math.random() - 0.5) * 1.5,
        (Math.random() - 0.5) * 1,
        (Math.random() - 0.5) * 1
      ),
      ambientRadius: 0.3 + Math.random() * 0.4,
      ambientSpeed: 0.3 + Math.random() * 0.2,
    };
  }, [index]);

  useFrame((state) => {
    if (!meshRef.current) return;
    
    const time = state.clock.elapsedTime;
    
    if (phase === "construction") {
      // Construction phase: follow shoe paths
      const t = ((time * params.baseSpeed + params.phaseOffset) % 1 + 1) % 1;
      const curvePoint = params.curve.getPoint(t);
      
      // Blend from scattered start to curve path
      const blendFactor = Math.min(1, phaseProgress * 1.5);
      const easeBlend = 1 - Math.pow(1 - blendFactor, 3);
      
      meshRef.current.position.lerpVectors(
        params.startPos,
        curvePoint,
        easeBlend
      );
      
      // Add subtle organic movement
      meshRef.current.position.x += Math.sin(time * 2 + index) * 0.05;
      meshRef.current.position.y += Math.cos(time * 1.7 + index) * 0.04;
      meshRef.current.position.z += Math.sin(time * 2.3 + index) * 0.03;
      
      // Pulsing scale
      const scale = params.scaleBase + Math.sin(time * 3 + params.phaseOffset) * params.scaleVariation;
      meshRef.current.scale.setScalar(scale);
      
    } else {
      // Ambient phase: calm breathing movement
      const { ambientCenter, ambientRadius, ambientSpeed } = params;
      
      // Gentle orbital motion
      const angle = time * ambientSpeed + params.phaseOffset;
      const x = ambientCenter.x + Math.cos(angle) * ambientRadius;
      const y = ambientCenter.y + Math.sin(angle * 0.7) * ambientRadius * 0.6;
      const z = ambientCenter.z + Math.sin(angle * 1.3) * ambientRadius * 0.4;
      
      // Smooth transition from construction end position
      const transitionSpeed = 0.03;
      meshRef.current.position.x += (x - meshRef.current.position.x) * transitionSpeed;
      meshRef.current.position.y += (y - meshRef.current.position.y) * transitionSpeed;
      meshRef.current.position.z += (z - meshRef.current.position.z) * transitionSpeed;
      
      // Gentle breathing scale
      const breathingScale = params.scaleBase * 0.9 + Math.sin(time * 0.8 + params.phaseOffset) * 0.08;
      meshRef.current.scale.setScalar(breathingScale);
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial
        color="#b8c4ce"
        metalness={0.95}
        roughness={0.08}
        envMapIntensity={1.2}
      />
    </mesh>
  );
}

// ============================================================================
// SCENE COMPONENT
// ============================================================================

interface SceneProps {
  phase: "construction" | "ambient";
  elapsedTime: number;
}

function Scene({ phase, elapsedTime }: SceneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const metaballCount = 7;
  
  // Calculate phase progress (0-1 over first 8 seconds)
  const phaseProgress = Math.min(1, elapsedTime / 8);

  // Slow rotation of entire scene
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.001;
    }
  });

  return (
    <>
      {/* Environment for chrome reflections */}
      <Environment preset="city" />
      
      {/* Subtle ambient light */}
      <ambientLight intensity={0.3} />
      
      {/* Key light for chrome highlights */}
      <directionalLight
        position={[5, 5, 5]}
        intensity={0.8}
        color="#e8f0ff"
      />
      
      {/* Fill light */}
      <directionalLight
        position={[-3, 2, -2]}
        intensity={0.4}
        color="#d0d8e0"
      />

      {/* Metaball group */}
      <group ref={groupRef} position={[0, 0.2, 0]}>
        {Array.from({ length: metaballCount }).map((_, i) => (
          <Metaball
            key={i}
            index={i}
            phase={phase}
            phaseProgress={phaseProgress}
          />
        ))}
      </group>

      {/* Subtle reflective floor for depth */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
        <planeGeometry args={[20, 20]} />
        <MeshReflectorMaterial
          blur={[300, 100]}
          resolution={512}
          mixBlur={1}
          mixStrength={0.3}
          roughness={1}
          depthScale={1}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#0a0a0a"
          metalness={0.5}
          mirror={0.5}
        />
      </mesh>
    </>
  );
}

// ============================================================================
// MAIN LOADER COMPONENT
// ============================================================================

export function LiquidMetalShoeLoader({ phase = "construction" }: LiquidMetalShoeLoaderProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // Track elapsed time for phase transitions
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime((prev) => prev + 0.1);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Fallback for reduced motion - show static chrome orbs
  if (prefersReducedMotion) {
    return (
      <div className="w-64 h-64 flex items-center justify-center">
        <div className="relative w-48 h-48">
          {/* Static chrome circles */}
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                width: 40 + i * 8,
                height: 40 + i * 8,
                left: `${20 + i * 10}%`,
                top: `${25 + (i % 3) * 15}%`,
                background: `radial-gradient(ellipse at 30% 30%, #e8f0ff, #8090a0 50%, #404850 100%)`,
                opacity: 0.7 + i * 0.05,
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-72 h-72 md:w-80 md:h-80">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 45 }}
        gl={{ 
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        }}
        dpr={[1, 1.5]}
        style={{ background: "transparent" }}
      >
        <Scene phase={phase} elapsedTime={elapsedTime} />
      </Canvas>
    </div>
  );
}

export default LiquidMetalShoeLoader;
