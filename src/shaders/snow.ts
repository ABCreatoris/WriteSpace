export const snowVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const snowFragment = /* glsl */ `
  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec2 uMouse;
  uniform sampler2D uTexture;
  uniform float uIntensity;
  uniform float uBlizzard;
  uniform float uWindMode;
  /** 风模式下滑块：风势（飘移与速度） */
  uniform float uWindStrength;
  varying vec2 vUv;

  #define S(a, b, t) smoothstep(a, b, t)

  // "Just snow" style layers — adapted from public-domain style demos (see flow-space-v1)

  #define LAYERS 50
  #define DEPTH .5
  #define WIDTH .3
  #define SPEED .6

  void main() {
      const mat3 p = mat3(13.323122,23.5112,21.71123,21.1212,28.7312,11.9312,21.8112,14.7212,61.3934);

      vec2 uv = vUv;
      vec2 centeredUv = (uv - 0.5) * 2.0;
      float aspect = uResolution.y > 0.0 ? uResolution.x / uResolution.y : 1.0;
      centeredUv.x *= aspect;

      vec2 snowUv = uMouse.xy/uResolution.xy + vec2(1., uResolution.y/uResolution.x) * vUv;

      vec3 acc = vec3(0.0);
      float dof = 5.*sin(uTime*.1);

      float bz = clamp(uBlizzard, 0.0, 1.0);
      float wm = clamp(uWindMode, 0.0, 1.0);
      float wUser = clamp(uWindStrength, 0.06, 1.0);
      float windAmp = (wm > 0.01) ? mix(0.32, 1.35, wUser) : 1.0;
      float speedMul = 1.0 + bz * 0.65 + wm * (0.42 + 0.52 * wUser * (1.0 - bz * 0.9));
      float layerBoost = 1.0 + bz * 0.1;
      /* 暴雪：大斜风 + 大雪片；风：斜飘、雪片尺度不变 */
      vec2 wind = vec2(
        (0.11 + 0.34 * bz + 0.26 * wm * (1.0 - bz * 0.85)) * windAmp,
        (-0.018 - 0.06 * bz - 0.05 * wm * (1.0 - bz * 0.85)) * mix(0.65, 1.12, wUser)
      ) * uTime * 0.095;
      snowUv += wind;
      float cellScale = mix(1.0, 0.52, bz);
      float wWide = WIDTH + bz * 0.42 + wm * (0.22 + 0.18 * wUser);

      for (int i=0;i<LAYERS;i++) {
          if (float(i) > float(LAYERS) * min(1.0, uIntensity * layerBoost)) break;

          float fi = float(i);
          vec2 q = snowUv * cellScale * (1.+fi*DEPTH);
          q += vec2(q.y*(wWide*mod(fi*7.238917,1.)-wWide*.5),SPEED*speedMul*uTime/(1.+fi*DEPTH*.03));
          vec3 n = vec3(floor(q),31.189+fi);
          vec3 m = floor(n)*.00001 + fract(n);
          vec3 mp = (31415.9+m)/fract(p*m);
          vec3 r = fract(mp);
          vec2 s = abs(mod(q,1.)-.5+.9*r.xy-.45);
          s += .01*abs(2.*fract(10.*q.yx)-1.);
          float d = .6*max(s.x-s.y,s.x+s.y)+max(s.x,s.y)-.01;
          float edge = .005+.05*min(.5*abs(fi-5.-dof),1.);
          acc += vec3(smoothstep(edge,-edge,d)*(r.x/(1.+.02*fi*DEPTH)));
      }

      vec3 col = texture2D(uTexture, uv).rgb;

      vec3 winterTint = vec3(0.85, 0.9, 1.0);
      col = mix(col, col * winterTint, 0.5);

      col += acc * (0.8 + bz * 0.25);

      float vignette = 1.0 - length(centeredUv * 0.4);
      col *= S(0.0, 1.0, vignette);

      gl_FragColor = vec4(col, 1.0);
  }
`;
