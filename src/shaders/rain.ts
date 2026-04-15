export const rainVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const rainFragment = /* glsl */ `
  uniform float uTime;
  uniform vec2 uResolution;
  uniform float uIntensity;
  uniform float uBlur;
  uniform float uMistBlend;
  uniform float uStorm;
  /** 雷模式下滑块：雷雨强度（压暗与色调） */
  uniform float uStormIntensity;
  uniform sampler2D uTexture;
  varying vec2 vUv;

  #define S(a, b, t) smoothstep(a, b, t)

  vec3 N13(float p) {
     vec3 p3 = fract(vec3(p) * vec3(.1031,.11369,.13787));
     p3 += dot(p3, p3.yzx + 19.19);
     return fract(vec3((p3.x + p3.y)*p3.z, (p3.x+p3.z)*p3.y, (p3.y+p3.z)*p3.x));
  }

  float N(float t) {
      return fract(sin(t*12345.564)*7658.76);
  }

  float Saw(float b, float t) {
    return S(0., b, t)*S(1., b, t);
  }

  float StaticDrops(vec2 uv, float t) {
      uv *= 40.;
      vec2 id = floor(uv);
      uv = fract(uv)-.5;
      vec3 n = N13(id.x*107.45+id.y*3543.654);
      vec2 p = (n.xy-.5)*.7;
      float d = length(uv-p);
      float fade = Saw(.025, fract(t+n.z));
      float c = S(.3, 0., d)*fract(n.z*10.)*fade;
      return c;
  }

  vec2 DropLayer(vec2 uv, float t) {
      vec2 UV = uv;
      uv.y += t*0.75;
      vec2 a = vec2(6., 1.);
      vec2 grid = a*2.;
      vec2 id = floor(uv*grid);

      float colShift = N(id.x);
      uv.y += colShift;

      id = floor(uv*grid);
      vec3 n = N13(id.x*35.2+id.y*2376.1);
      vec2 st = fract(uv*grid)-vec2(.5, 0);

      float x = n.x-.5;
      float y = UV.y*20.;
      float wiggle = sin(y + sin(y));
      x += wiggle*(.5-abs(x))*(n.z-.5);
      x *= .7;
      float ti = fract(t+n.z);
      y = (Saw(.85, ti)-.5)*.9+.5;
      vec2 p = vec2(x, y);

      float d = length((st-p)*a.yx);
      float mainDrop = S(.4, .0, d);

      float r = sqrt(S(1., y, st.y));
      float cd = abs(st.x-x);
      float trail = S(.23*r, .15*r*r, cd);
      float trailFront = S(-.02, .02, st.y-y);
      trail *= trailFront*r*r;

      y = UV.y;
      float trail2 = S(.2*r, .0, cd);
      float droplets = max(0., (sin(y*(1.-y)*120.)-st.y))*trail2*trailFront*n.z;
      y = fract(y*10.)+(st.y-.5);
      float dd = length(st-vec2(x, y));
      droplets = S(.3, 0., dd);
      float m = mainDrop+droplets*r*trailFront;

      return vec2(m, trail);
  }

  vec2 Drops(vec2 uv, float t, float l0, float l1, float l2) {
      float s = StaticDrops(uv, t)*l0;
      vec2 m1 = DropLayer(uv, t)*l1;
      vec2 m2 = DropLayer(uv*1.85, t)*l2;

      float c = s+m1.x+m2.x;
      c = S(.3, 1., c);

      return vec2(c, max(m1.y*l0, m2.y*l1));
  }

  void main() {
    vec2 uv = vUv;
    vec2 centeredUv = (uv - 0.5) * 2.0;

    float aspect = uResolution.y > 0.0 ? uResolution.x / uResolution.y : 1.0;
    centeredUv.x *= aspect;

    float t = uTime * 0.2;

    vec2 rainUv = uv * vec2(aspect, 1.0);

    float staticDrops = S(-.5, 1., uIntensity)*2.;
    float layer1 = S(.25, .75, uIntensity);
    float layer2 = S(.0, .5, uIntensity);

    vec2 c = Drops(rainUv, t, staticDrops, layer1, layer2);

    vec2 e = vec2(.001, 0.);
    float cx = Drops(rainUv+e, t, staticDrops, layer1, layer2).x;
    float cy = Drops(rainUv+e.yx, t, staticDrops, layer1, layer2).x;
    vec2 n = vec2(cx-c.x, cy-c.x);

    vec3 col = texture2D(uTexture, uv + n).rgb;

    vec3 daytimeTint = vec3(0.75, 0.82, 0.9);
    col = mix(col, col * daytimeTint, 0.8);
    col = mix(vec3(dot(col, vec3(0.299, 0.587, 0.114))), col, 0.8);

    vec3 lightDir = normalize(vec3(-1.0, 1.0, 0.5));
    float spec = max(0.0, dot(normalize(vec3(n, 0.05)), lightDir));
    col += pow(spec, 30.0) * 0.5 * S(0.1, 0.5, c.x);

    float grain = fract(sin(dot(uv + t * 0.01, vec2(12.9898, 78.233))) * 43758.5453);
    col += (grain - 0.5) * 0.03;

    float vignette = 1.0 - length(centeredUv * 0.5);
    col *= S(0.0, 1.0, vignette);

    if (uMistBlend > 0.001) {
      vec3 fog = vec3(0.52, 0.6, 0.72);
      float m = clamp(uMistBlend, 0.0, 1.0);
      col = mix(col, fog, m * 0.5);
      float lum = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(vec3(lum), col, 1.0 - m * 0.22);
    }

    float st = clamp(uStorm, 0.0, 1.0);
    if (st > 0.001) {
      float si = clamp(uStormIntensity, 0.12, 1.0);
      float darken = mix(0.78, 0.26, si);
      col *= mix(1.0, darken, st);
      vec3 stormTint = vec3(0.58, 0.52, 0.82);
      col = mix(col, col * stormTint, st * mix(0.22, 0.55, si));
    }

    gl_FragColor = vec4(col, 1.0);
  }
`;
