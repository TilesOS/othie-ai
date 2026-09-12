"use client";

import { useEffect, useRef, useState } from "react";

const vertex = /* glsl */ `
  attribute vec2 position;
  void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

/**
 * A field of thin vertical light bars hanging from the top of the hero, clustered so
 * the density reads as structure rather than noise. Brightness, not hue, carries the
 * motion; the accent tints a small minority of columns.
 */
const fragment = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec2 uPointer;
  uniform float uPointerStrength;
  uniform vec3 uAccent;

  float hash(float n) { return fract(sin(n * 127.1) * 43758.5453123); }

  float columnBrightness(float column, float y, float time, out float accentPick, out float hotPick) {
    float cluster = floor(column / 6.0);
    float clusterSeed = hash(cluster * 3.71 + 0.7);
    float clusterGate = smoothstep(0.12, 0.58, clusterSeed);
    float seedLength = hash(column * 1.37 + 4.2);
    float seedPulse = hash(column * 7.91 + 1.1);

    accentPick = step(0.80, hash(column * 5.13 + 9.0));
    hotPick = step(0.955, hash(column * 2.77 + 3.3));

    float length = (0.20 + seedLength * 0.70) * (0.42 + clusterGate * 0.86);
    float bottomEdge = 1.0 - length;
    float vertical = smoothstep(bottomEdge, bottomEdge + 0.11, y);
    float pulse = 0.55 + 0.45 * sin(time * (0.22 + seedPulse * 0.55) + column * 0.73);

    return vertical * pulse * (0.30 + seedPulse * 0.70) * (0.42 + clusterGate);
  }

  void main() {
    vec2 st = gl_FragCoord.xy / uResolution.xy;
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    float columns = 150.0 * clamp(aspect / 1.6, 0.6, 1.8);

    float x = st.x + uTime * 0.008;
    float column = floor(x * columns);
    float withinColumn = fract(x * columns);

    float accentPick = 0.0;
    float hotPick = 0.0;
    float brightness = columnBrightness(column, st.y, uTime, accentPick, hotPick);

    float width = 0.16 + hash(column * 9.13 + 2.4) * 0.60;
    float distanceToCentre = abs(withinColumn - 0.5);
    float body = 1.0 - smoothstep(width * 0.5, width * 0.5 + 0.16, distanceToCentre);

    float pointerDistance = abs(st.x - uPointer.x);
    float pointerInfluence = exp(-pointerDistance * pointerDistance * 70.0) * uPointerStrength;

    float alpha = body * brightness * (1.0 + pointerInfluence * 1.9);
    alpha *= 1.0 + hotPick * 1.6 + accentPick * 0.35;
    alpha *= smoothstep(-0.05, 0.30, st.y);

    vec3 colour = mix(vec3(0.66, 0.70, 0.75), uAccent, accentPick * 0.9);
    colour = mix(colour, vec3(1.0), hotPick * 0.55);

    gl_FragColor = vec4(colour, clamp(alpha, 0.0, 0.85));
  }
`;

function readAccent(): [number, number, number] {
  const value = getComputedStyle(document.documentElement).getPropertyValue("--brand-accent-rgb").trim().split(/\s+/).map(Number);
  return [value[0] / 255 || 0.204, value[1] / 255 || 0.835, value[2] / 255 || 0.604];
}

/* Rounded so the server and client render byte-identical markup. */
const fallbackBars = Array.from({ length: 84 }, (_, index) => {
  const seed = Math.abs(Math.sin(index * 12.9898) * 43758.5453) % 1;
  const pulse = Math.abs(Math.sin(index * 7.233) * 12345.6789) % 1;
  return {
    x: Math.round(index * 14.3 + 4),
    width: 1 + Math.round(seed * 4),
    height: Math.round(50 + seed * 330),
    accent: pulse > 0.88,
  };
});

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
    let contextLost = false;
    let cleanup = () => {};

    void import("ogl").then(({ Mesh, Program, Renderer, Triangle, Vec2 }) => {
      if (disposed) return;
      try {
        const renderer = new Renderer({ canvas, alpha: true, dpr: Math.min(window.devicePixelRatio, 1.5) });
        const gl = renderer.gl;
        gl.clearColor(0, 0, 0, 0);
        const [r, g, b] = readAccent();
        const pointer = new Vec2(0.5, 0.5);
        const pointerTarget = new Vec2(0.5, 0.5);
        let pointerStrength = 0;
        let pointerStrengthTarget = 0;
        const uniforms = {
          uTime: { value: 0 },
          uResolution: { value: new Vec2(1, 1) },
          uPointer: { value: pointer },
          uPointerStrength: { value: 0 },
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
        const resizeObserver = new ResizeObserver(resize);
        const onPointerMove = (event: PointerEvent) => {
          if (event.pointerType === "touch") {
            pointerStrengthTarget = 0;
            return;
          }
          const rect = wrapper.getBoundingClientRect();
          const inside = event.clientX >= rect.left && event.clientX <= rect.right
            && event.clientY >= rect.top && event.clientY <= rect.bottom;
          if (!inside) {
            pointerStrengthTarget = 0;
            return;
          }
          pointerTarget.set((event.clientX - rect.left) / rect.width, (rect.bottom - event.clientY) / rect.height);
          pointerStrengthTarget = 1;
        };
        const releasePointer = () => { pointerStrengthTarget = 0; };
        const onPointerOut = (event: PointerEvent) => {
          if (!event.relatedTarget) releasePointer();
        };
        const render = (time: number) => {
          if (disposed || contextLost) return;
          if (!document.hidden) {
            pointer.x += (pointerTarget.x - pointer.x) * 0.08;
            pointer.y += (pointerTarget.y - pointer.y) * 0.08;
            pointerStrength += (pointerStrengthTarget - pointerStrength) * 0.065;
            uniforms.uPointerStrength.value = pointerStrength;
            uniforms.uTime.value = time * 0.001;
            renderer.render({ scene: mesh });
          }
          frame = requestAnimationFrame(render);
        };
        const onLost = (event: Event) => { event.preventDefault(); contextLost = true; setReady(false); };
        const onRestored = () => { contextLost = false; resize(); setReady(true); frame = requestAnimationFrame(render); };
        resizeObserver.observe(wrapper);
        window.addEventListener("pointermove", onPointerMove, { passive: true });
        window.addEventListener("pointerout", onPointerOut);
        window.addEventListener("blur", releasePointer);
        canvas.addEventListener("webglcontextlost", onLost);
        canvas.addEventListener("webglcontextrestored", onRestored);
        resize();
        setReady(true);
        frame = requestAnimationFrame(render);
        cleanup = () => {
          cancelAnimationFrame(frame);
          resizeObserver.disconnect();
          window.removeEventListener("pointermove", onPointerMove);
          window.removeEventListener("pointerout", onPointerOut);
          window.removeEventListener("blur", releasePointer);
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
        {fallbackBars.map((bar) => (
          <rect
            key={bar.x}
            className={bar.accent ? "wave-fallback__accent" : undefined}
            x={bar.x}
            y={0}
            width={bar.width}
            height={bar.height}
            opacity={bar.accent ? 0.5 : 0.28}
          />
        ))}
      </svg>
      <canvas ref={canvasRef} />
    </div>
  );
}
