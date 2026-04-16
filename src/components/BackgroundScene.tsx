import { useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { ASSETS } from "../config/assets";
import type { SceneMode } from "../lib/sceneMode";
import { rainFragment, rainVertex } from "../shaders/rain";
import { snowFragment, snowVertex } from "../shaders/snow";
import { sunnyFragment, sunnyVertex } from "../shaders/sunny";

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

function SunnyPlane({
  sunnyLight,
  backgroundUrl,
}: {
  sunnyLight: number;
  backgroundUrl: string;
}) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { viewport } = useThree();
  const loadedTexRef = useRef<THREE.Texture | null>(null);

  const placeholderTex = useMemo(() => {
    const data = new Uint8Array([100, 140, 180, 255]);
    const t = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat);
    t.needsUpdate = true;
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    t.minFilter = THREE.LinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.generateMipmaps = false;
    return t;
  }, []);

  const uniforms = useMemo(
    () => ({
      uLight: { value: sunnyLight },
      uTexture: { value: placeholderTex },
      uHasTexture: { value: 0 },
      uTime: { value: 0 },
    }),
    [placeholderTex],
  );

  useLayoutEffect(() => {
    const loader = new THREE.TextureLoader();
    let cancelled = false;
    const applyToMaterial = (tex: THREE.Texture, has: number) => {
      const m = materialRef.current;
      if (!m) return;
      m.uniforms.uTexture.value = tex;
      m.uniforms.uHasTexture.value = has;
    };
    loader.load(
      backgroundUrl,
      (tex) => {
        if (cancelled) {
          tex.dispose();
          return;
        }
        loadedTexRef.current?.dispose();
        loadedTexRef.current = tex;
        tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
        tex.generateMipmaps = false;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.colorSpace = THREE.SRGBColorSpace;
        applyToMaterial(tex, 1);
      },
      undefined,
      () => {
        if (cancelled) return;
        applyToMaterial(placeholderTex, 0);
      },
    );
    return () => {
      cancelled = true;
      loadedTexRef.current?.dispose();
      loadedTexRef.current = null;
      applyToMaterial(placeholderTex, 0);
    };
  }, [backgroundUrl, placeholderTex]);

  useFrame((state) => {
    const m = materialRef.current;
    if (!m) return;
    m.uniforms.uLight.value = sunnyLight;
    m.uniforms.uTime.value = state.clock.getElapsedTime();
  });

  return (
    <mesh scale={[viewport.width, viewport.height, 1]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        ref={materialRef}
        fragmentShader={sunnyFragment}
        vertexShader={sunnyVertex}
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
  sunnyLight,
}: {
  mode: SceneMode;
  rainIntensity: number;
  snowIntensity: number;
  sunnyLight: number;
}) {
  switch (mode) {
    case "sunny":
      return (
        <SunnyPlane
          sunnyLight={sunnyLight}
          backgroundUrl={ASSETS.sunnyBackground}
          key="sunny"
        />
      );
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
