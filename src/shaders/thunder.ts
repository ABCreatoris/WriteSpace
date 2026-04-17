export const thunderVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const thunderFragment = /* glsl */ `
  uniform float uTime;
  uniform vec2 uResolution;
  uniform float uStormIntensity;
  uniform float uScrollBoost;
  varying vec2 vUv;

  float hash11(float p) {
    p = fract(p * 0.1031);
    p *= p + 33.33;
    p *= p + p;
    return fract(p);
  }

  float hash21(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.55;
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p = p * 2.02 + vec2(11.7, -3.1);
      a *= 0.52;
    }
    return v;
  }

  float boltMask(vec2 uv, float eventId, float burst) {
    float x0 = mix(0.2, 0.8, hash11(eventId * 17.7));
    float sway = (noise(vec2(uv.y * 8.0, eventId * 1.73)) - 0.5) * (0.04 + burst * 0.05);
    float trunk = abs(uv.x - (x0 + sway));
    float core = smoothstep(0.018, 0.0, trunk);
    float glow = smoothstep(0.085, 0.0, trunk);
    float fadeTop = smoothstep(0.0, 0.25, uv.y);
    float fadeBottom = smoothstep(1.0, 0.25, uv.y);
    return (core * 1.2 + glow * 0.45) * fadeTop * fadeBottom;
  }

  void main() {
    vec2 uv = vUv;
    vec2 p = uv;
    float aspect = uResolution.y > 0.0 ? uResolution.x / uResolution.y : 1.0;
    p.x *= aspect;

    float storm = clamp(uStormIntensity, 0.0, 1.0);
    float boost = clamp(uScrollBoost, 0.0, 1.0);
    float t = uTime * (0.06 + storm * 0.05 + boost * 0.08);

    float cloudBase = fbm(p * 1.6 + vec2(0.0, t * 2.1));
    float cloudHi = fbm(p * 3.2 - vec2(t * 2.4, t * 1.1));
    float cloud = mix(cloudBase, cloudHi, 0.45);
    cloud = smoothstep(0.2, 0.95, cloud);

    vec3 deep = vec3(0.04, 0.07, 0.22);
    vec3 mid = vec3(0.22, 0.21, 0.45);
    vec3 glow = vec3(0.62, 0.52, 0.85);
    vec3 col = mix(deep, mid, cloud);
    col = mix(col, glow, smoothstep(0.62, 0.98, cloud) * 0.45);

    float eventRate = mix(0.25, 1.75, boost) * mix(0.65, 1.35, storm);
    float eventClock = uTime * eventRate;
    float eventId = floor(eventClock);
    float localT = fract(eventClock);

    float eventSeed = hash11(eventId + 7.0);
    float strikeGate = step(0.68 - boost * 0.22, eventSeed);
    float pulse = smoothstep(0.12, 0.0, abs(localT - 0.09));
    float burst = strikeGate * pulse;

    float bolt = boltMask(uv, eventId, burst) * burst;
    float flash = burst * (0.32 + 0.68 * storm);
    vec3 lightning = vec3(0.88, 0.92, 1.0) * (bolt * 1.2 + flash * 0.55);
    col += lightning;

    float vignette = smoothstep(1.25, 0.2, distance(uv, vec2(0.5)));
    col *= mix(0.84, 1.03, vignette);

    gl_FragColor = vec4(col, 1.0);
  }
`;
