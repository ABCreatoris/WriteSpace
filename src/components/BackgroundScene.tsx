import { useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { ASSETS } from "../config/assets";
import type { SceneMode } from "../lib/sceneMode";
import { rainFragment, rainVertex } from "../shaders/rain";
import { snowFragment, snowVertex } from "../shaders/snow";

export type { SceneMode } from "../lib/sceneMode";

function RainPlane({
  intensity,
  mistBlend,
  storm,
  stormIntensity,
  backgroundUrl,
}: {
  intensity: number;
  mistBlend: number;
  storm: number;
  /** 雷暴视觉强度（仅 storm=1 时明显） */
  stormIntensity: number;
  backgroundUrl: string;
}) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { size, viewport } = useThree();
  const texture = useTexture(backgroundUrl);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uIntensity: { value: intensity },
      uBlur: { value: 0.4 },
      uMistBlend: { value: mistBlend },
      uStorm: { value: storm },
      uStormIntensity: { value: stormIntensity },
      uTexture: { value: texture },
    }),
    [texture],
  );

  useFrame((state) => {
    const m = materialRef.current;
    if (!m) return;
    m.uniforms.uTime.value = state.clock.getElapsedTime();
    m.uniforms.uResolution.value.set(size.width, size.height);
    m.uniforms.uIntensity.value = intensity;
    m.uniforms.uMistBlend.value = mistBlend;
    m.uniforms.uStorm.value = storm;
    m.uniforms.uStormIntensity.value = stormIntensity;
  });

  return (
    <mesh scale={[viewport.width, viewport.height, 1]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        ref={materialRef}
        fragmentShader={rainFragment}
        vertexShader={rainVertex}
        uniforms={uniforms}
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  );
}

function SnowPlane({
  intensity,
  blizzard,
  windMode,
  windStrength,
  backgroundUrl,
}: {
  intensity: number;
  blizzard: number;
  windMode: number;
  /** 风模式下滑块：风势 */
  windStrength: number;
  backgroundUrl: string;
}) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { size, viewport, mouse } = useThree();
  const texture = useTexture(backgroundUrl);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uTexture: { value: texture },
      uIntensity: { value: intensity },
      uBlizzard: { value: blizzard },
      uWindMode: { value: windMode },
      uWindStrength: { value: windStrength },
    }),
    [texture],
  );

  useFrame((state) => {
    const m = materialRef.current;
    if (!m) return;
    m.uniforms.uTime.value = state.clock.getElapsedTime();
    m.uniforms.uResolution.value.set(size.width, size.height);
    m.uniforms.uIntensity.value = intensity;
    m.uniforms.uBlizzard.value = blizzard;
    m.uniforms.uWindMode.value = windMode;
    m.uniforms.uWindStrength.value = windStrength;
    const mx = (mouse.x * 0.5 + 0.5) * size.width;
    const my = (mouse.y * 0.5 + 0.5) * size.height;
    m.uniforms.uMouse.value.set(mx, my);
  });

  return (
    <mesh scale={[viewport.width, viewport.height, 1]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        ref={materialRef}
        fragmentShader={snowFragment}
        vertexShader={snowVertex}
        uniforms={uniforms}
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  );
}

export function BackgroundScene({
  mode,
  rainIntensity,
  snowIntensity,
}: {
  mode: SceneMode;
  rainIntensity: number;
  snowIntensity: number;
}) {
  switch (mode) {
    case "rain":
      return (
        <RainPlane
          intensity={rainIntensity}
          mistBlend={0}
          storm={0}
          stormIntensity={1}
          backgroundUrl={ASSETS.rainBackground}
          key="rain"
        />
      );
    case "fog":
      return (
        <RainPlane
          intensity={rainIntensity * 0.52}
          mistBlend={1}
          storm={0}
          stormIntensity={1}
          backgroundUrl={ASSETS.fogBackground}
          key="fog"
        />
      );
    case "thunder":
      return (
        <RainPlane
          intensity={rainIntensity}
          mistBlend={0.22}
          storm={1}
          stormIntensity={rainIntensity}
          backgroundUrl={ASSETS.thunderBackground}
          key="thunder"
        />
      );
    case "snow":
      return (
        <SnowPlane
          intensity={snowIntensity}
          blizzard={0}
          windMode={0}
          windStrength={1}
          backgroundUrl={ASSETS.snowBackground}
          key="snow"
        />
      );
    case "wind":
      return (
        <SnowPlane
          intensity={snowIntensity}
          blizzard={0}
          windMode={1}
          windStrength={snowIntensity}
          backgroundUrl={ASSETS.windBackground}
          key="wind"
        />
      );
    default:
      return (
        <RainPlane
          intensity={rainIntensity}
          mistBlend={0}
          storm={0}
          stormIntensity={1}
          backgroundUrl={ASSETS.rainBackground}
          key="default"
        />
      );
  }
}
