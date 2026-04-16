/** 晴：底图 + uLight 曝光；前景野花层；无底图时程序化蓝天 */
export const sunnyVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const sunnyFragment = /* glsl */ `
  uniform sampler2D uTexture;
  uniform float uLight;
  uniform float uHasTexture;
  uniform float uTime;
  varying vec2 vUv;

  float hash(float n) {
    return fract(sin(n) * 43758.5453123);
  }

  vec2 hash2(float n) {
    return vec2(hash(n), hash(n + 17.0));
  }

  vec3 flowerLayer(vec2 uv, float t, float light) {
    vec3 acc = vec3(0.0);
    float band = smoothstep(0.46, 0.0, uv.y) * smoothstep(0.045, 0.16, uv.y);
    for (int i = 0; i < 16; i++) {
      float fi = float(i);
      vec2 h = hash2(fi * 2.7 + 0.9);
      vec2 pos = vec2(0.03 + h.x * 0.94, 0.04 + h.y * 0.42);
      float sway = sin(t * (0.55 + 0.08 * mod(fi, 5.0)) + fi * 0.4) * 0.012;
      float d = distance(uv, pos + vec2(sway, 0.0));
      float r = 0.012 + mod(fi, 5.0) * 0.003;
      vec3 f1 = vec3(1.0, 0.78, 0.88);
      vec3 f2 = vec3(1.0, 0.92, 0.58);
      vec3 f3 = vec3(0.92, 1.0, 0.86);
      vec3 fcol = mix(f1, f2, step(0.33, fract(fi * 0.41)));
      fcol = mix(fcol, f3, step(0.66, fract(fi * 0.37)));
      acc += fcol * exp(-d * d / (r * r)) * (0.14 + light * 0.2) * band;
    }
    return acc;
  }

  vec3 proceduralClearSky(vec2 uv, float t, float light) {
    vec3 zenith = vec3(0.42, 0.72, 0.98);
    vec3 horizon = vec3(0.98, 0.88, 0.78);
    float skyY = pow(clamp(uv.y, 0.0, 1.0), 0.78);
    vec3 col = mix(horizon, zenith, skyY);
    vec2 sunUv = vec2(0.22, 0.68);
    float dSun = distance(uv, sunUv);
    col += vec3(1.0, 0.97, 0.88) * smoothstep(0.055, 0.018, dSun) * 0.52;
    col += vec3(1.0, 0.94, 0.82) * exp(-dSun * 9.0) * (0.12 + light * 0.1);
    float treeBand = exp(-pow((1.0 - uv.y) * 2.8, 2.0)) * 0.22 * light;
    col = mix(col, col * vec3(0.88, 1.04, 0.92), treeBand);
    for (int i = 0; i < 12; i++) {
      float fi = float(i);
      vec2 h = hash2(fi * 2.9 + 0.3);
      vec2 p = vec2(
        fract(h.x + t * (0.06 + light * 0.1)),
        fract(h.y * 0.9 + t * (0.1 + h.x * 0.08))
      );
      vec2 q = uv - p;
      float ang = t * 0.35 + fi * 0.5;
      float c = cos(ang);
      float s = sin(ang);
      q = mat2(c, -s, s, c) * q;
      float pet = smoothstep(1.0, 0.0, pow((q.x * q.x) / 1.2e-4 + (q.y * q.y) / 3.5e-5, 1.1));
      vec3 pcol = mix(vec3(1.0, 0.88, 0.92), vec3(0.95, 1.0, 0.9), h.y);
      col += pet * pcol * 0.06 * (0.4 + light);
    }
    return col;
  }

  void main() {
    vec2 uv = vUv;
    float lightN = clamp(uLight, 0.0, 1.0);
    float lightK = (lightN - 0.5) * 2.0; // 0.5=正常，1.0=强光，0.0=偏柔和
    vec3 col;
    if (uHasTexture > 0.5) {
      col = texture2D(uTexture, uv).rgb;
      // 全区间提亮：即使 0% 也比此前更亮，100% 更通透
      float lift = 1.16 + lightN * 0.54;
      col *= lift;
      col = mix(col, col * vec3(1.10, 1.05, 0.96), 0.14 + max(0.0, lightK) * 0.3);
      // 提升“晴朗蓝天感”：上方混入蓝天色，底部保持草地亮绿
      float skyMask = smoothstep(0.45, 0.95, uv.y);
      col = mix(col, mix(col, vec3(0.58, 0.80, 1.0), 0.34 + 0.14 * max(0.0, lightK)), skyMask);
      float groundMask = smoothstep(0.42, 0.05, uv.y);
      col = mix(col, col * vec3(0.99, 1.10, 0.99), groundMask * 0.2);
      // 亮色风格：轻提饱和和明度
      float luma = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(vec3(luma), col, 1.18 + 0.1 * max(0.0, lightK));
      col *= 1.09 + 0.1 * max(0.0, lightK);
    } else {
      col = proceduralClearSky(uv, uTime, lightN);
    }
    // 始终补一层太阳高光，确保“晴天有太阳”
    vec2 sunUv = vec2(0.2, 0.75);
    float dSun = distance(uv, sunUv);
    // 太阳中心圆形光点（明显可见）
    float sunCore = smoothstep(0.032, 0.0, dSun);
    col += vec3(1.0, 0.98, 0.9) * sunCore * (0.32 + lightN * 0.44);
    col += vec3(1.0, 0.97, 0.9) * exp(-dSun * 14.0) * (0.06 + max(0.0, lightK) * 0.18);
    col += vec3(1.0, 0.9, 0.68) * smoothstep(0.08, 0.0, dSun) * (0.08 + max(0.0, lightK) * 0.2);
    // 晴天光束（god rays）：沿太阳方向的条纹衰减
    vec2 fromSun = uv - sunUv;
    float rayAngle = atan(fromSun.y, fromSun.x);
    float radial = exp(-length(fromSun) * 3.8);
    float rays =
      sin(rayAngle * 16.0 + uTime * 0.12) * 0.5 +
      sin(rayAngle * 27.0 - uTime * 0.08) * 0.5;
    rays = smoothstep(0.25, 1.0, rays);
    float rayMask = rays * radial * (0.06 + max(0.0, lightK) * 0.24);
    col += vec3(1.0, 0.95, 0.78) * rayMask;
    col += flowerLayer(uv, uTime, lightN);
    gl_FragColor = vec4(col, 1.0);
  }
`;
