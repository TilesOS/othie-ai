"use client";

import { useEffect, useRef, useState } from "react";

const vertex = /* glsl */ `
  attribute vec2 position;
  void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

const fragment = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec3 uAccent;

  float line(vec2 p, float offset, float width) {
    float bend = sin(p.x * 3.4 + uTime * 0.22 + offset * 2.2) * 0.12;
    bend += sin(p.x * 7.0 - uTime * 0.13 + offset) * 0.035;
    float y = p.y + p.x * 0.34 - bend - offset;
    return 1.0 - smoothstep(width, width + 0.008, abs(y));
  }

  void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - uResolution.xy) / min(uResolution.x, uResolution.y);
    uv.x -= 0.22;
    float field = 0.0;
    float accentField = 0.0;
    for (int i = -8; i <= 8; i++) {
      float offset = float(i) * 0.095;
      float strand = line(uv, offset, 0.0035);
      field += strand * (0.24 - abs(offset) * 0.09);
      if (i == -2 || i == 1 || i == 4) accentField += strand;
    }
    float edge = smoothstep(1.65, 0.15, length(uv * vec2(0.72, 0.9)));
    float fade = smoothstep(-1.2, -0.15, uv.x) * smoothstep(2.0, 0.35, uv.x);
    vec3 color = mix(vec3(0.72, 0.78, 0.77), uAccent, clamp(accentField * 0.72, 0.0, 0.68));
    gl_FragColor = vec4(color, clamp(field * edge * fade, 0.0, 0.32));
  }
`;

function readAccent(): [number, number, number] {
  const value = getComputedStyle(document.documentElement).getPropertyValue("--brand-accent-rgb").trim().split(/\s+/).map(Number);
  return [value[0] / 255 || 0.176, value[1] / 255 || 0.831, value[2] / 255 || 0.749];
}

export function BackgroundWaves() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let disposed = false;
    let frame = 0;
    let visible = true;
    let contextLost = false;
    let cleanup = () => {};

    void import("ogl").then(({ Mesh, Program, Renderer, Triangle, Vec2 }) => {
      if (disposed) return;
      try {
        const renderer = new Renderer({ canvas, alpha: true, dpr: Math.min(window.devicePixelRatio, 1.5) });
        const gl = renderer.gl;
        gl.clearColor(0, 0, 0, 0);
        const [r, g, b] = readAccent();
        const uniforms = {
          uTime: { value: 0 },
          uResolution: { value: new Vec2(1, 1) },
          uAccent: { value: [r, g, b] },
        };
        const geometry = new Triangle(gl);
        const program = new Program(gl, { vertex, fragment, uniforms, transparent: true });
        const mesh = new Mesh(gl, { geometry, program });
        const resize = () => {
          const rect = wrapper.getBoundingClientRect();
          renderer.setSize(rect.width, rect.height);
          uniforms.uResolution.value.set(gl.canvas.width, gl.canvas.height);
        };
        const render = (time: number) => {
          if (disposed || contextLost) return;
          if (visible && !document.hidden) {
            uniforms.uTime.value = time * 0.001;
            renderer.render({ scene: mesh });
          }
          frame = requestAnimationFrame(render);
        };
        const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
        const onLost = (event: Event) => { event.preventDefault(); contextLost = true; setReady(false); };
        const onRestored = () => { contextLost = false; resize(); frame = requestAnimationFrame(render); };
        observer.observe(wrapper);
        window.addEventListener("resize", resize, { passive: true });
        canvas.addEventListener("webglcontextlost", onLost);
        canvas.addEventListener("webglcontextrestored", onRestored);
        resize();
        setReady(true);
        frame = requestAnimationFrame(render);
        cleanup = () => {
          cancelAnimationFrame(frame);
          observer.disconnect();
          window.removeEventListener("resize", resize);
          canvas.removeEventListener("webglcontextlost", onLost);
          canvas.removeEventListener("webglcontextrestored", onRestored);
          geometry.remove();
          program.remove();
          renderer.gl.getExtension("WEBGL_lose_context")?.loseContext();
        };
      } catch { setReady(false); }
    });

    return () => { disposed = true; cancelAnimationFrame(frame); cleanup(); };
  }, []);

  return (
    <div ref={wrapperRef} className={`wave-field${ready ? " wave-field--ready" : ""}`} aria-hidden="true">
      <svg className="wave-fallback" viewBox="0 0 1200 620" preserveAspectRatio="none">
        {[-120, -72, -24, 24, 72, 120].map((offset, index) => (
          <path key={offset} className={index === 2 || index === 4 ? "wave-fallback__accent" : undefined} d={`M -80 ${390 + offset} C 260 ${190 + offset}, 410 ${560 + offset}, 1280 ${175 + offset}`} />
        ))}
      </svg>
      <canvas ref={canvasRef} />
      <span className="wave-vignette" />
    </div>
  );
}
