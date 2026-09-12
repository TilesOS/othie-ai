"use client";

import { useEffect, useRef, useState } from "react";

const vertex = /* glsl */ `
  attribute vec2 position;
  void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

/**
 * The quiet counterpart to the hero field: slow, large-scale luminance clouds that
 * keep the pure black from reading as an empty void behind the lower page. Capped
 * thirteen percent alpha — a peak of roughly 12/255 over black — so it reads as depth
 * rather than as content.
 */
const fragment = /* glsl */ `
  precision mediump float;
  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec3 uAccent;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 4; i++) {
      value += amplitude * noise(p);
      p *= 2.02;
      amplitude *= 0.5;
    }
    return value;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / uResolution.xy;
    vec2 p = vec2(uv.x * (uResolution.x / max(uResolution.y, 1.0)), uv.y) * 1.5;

    float a = fbm(p + vec2(uTime * 0.011, uTime * -0.007));
    float b = fbm(p * 0.55 - vec2(uTime * 0.005, uTime * 0.003));
    float cloud = smoothstep(0.34, 0.88, a * 0.66 + b * 0.44);

    /* A whisper of vertical striation keeps it in the same family as the hero field. */
    float striation = (sin(uv.x * uResolution.x * 0.07) * 0.5 + 0.5) * 0.12;

    vec3 colour = mix(vec3(0.40, 0.43, 0.47), uAccent, cloud * 0.26);
    float alpha = cloud * (0.085 + striation * 0.045);

    gl_FragColor = vec4(colour, clamp(alpha, 0.0, 0.13));
  }
`;

function readAccent(): [number, number, number] {
  const value = getComputedStyle(document.documentElement).getPropertyValue("--brand-accent-rgb").trim().split(/\s+/).map(Number);
  return [value[0] / 255 || 0.278, value[1] / 255 || 0.882, value[2] / 255 || 0.741];
}

export function AmbientField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let disposed = false;
    let frame = 0;
    let contextLost = false;
    let cleanup = () => {};

    void import("ogl").then(({ Mesh, Program, Renderer, Triangle, Vec2 }) => {
      if (disposed) return;
      try {
        // Soft clouds carry no fine detail, so device pixel ratio 1 is plenty and keeps
        // a permanently-running full-viewport shader cheap.
        const renderer = new Renderer({ canvas, alpha: true, dpr: 1 });
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
        // Measure the wrapper, not the window: innerWidth includes the scrollbar and
        // would leave the canvas wider than the box it paints into.
        const resize = () => {
          const rect = wrapper.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) return;
          renderer.setSize(rect.width, rect.height);
          uniforms.uResolution.value.set(gl.canvas.width, gl.canvas.height);
        };
        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(wrapper);
        const render = (time: number) => {
          if (disposed || contextLost) return;
          if (!document.hidden) {
            uniforms.uTime.value = time * 0.001;
            renderer.render({ scene: mesh });
          }
          frame = requestAnimationFrame(render);
        };
        const onLost = (event: Event) => { event.preventDefault(); contextLost = true; setReady(false); };
        const onRestored = () => { contextLost = false; resize(); setReady(true); frame = requestAnimationFrame(render); };
        window.addEventListener("resize", resize, { passive: true });
        window.addEventListener("orientationchange", resize);
        canvas.addEventListener("webglcontextlost", onLost);
        canvas.addEventListener("webglcontextrestored", onRestored);
        resize();
        setReady(true);
        frame = requestAnimationFrame(render);
        cleanup = () => {
          cancelAnimationFrame(frame);
          resizeObserver.disconnect();
          window.removeEventListener("resize", resize);
          window.removeEventListener("orientationchange", resize);
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
    <div ref={wrapperRef} className={`ambient-field${ready ? " ambient-field--ready" : ""}`} aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  );
}
