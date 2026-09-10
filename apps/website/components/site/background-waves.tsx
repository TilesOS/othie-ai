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
  uniform vec2 uPointer;
  uniform float uPointerStrength;
  uniform vec3 uAccent;

  float strandField(vec2 p, out float strandIndex) {
    float spacing = 0.105;
    float axis = p.y + p.x * 0.30;
    float approximateIndex = floor(axis / spacing + 0.5);
    float bend = sin(p.x * 3.6 + uTime * 0.22 + approximateIndex * 0.47) * 0.045;
    bend += sin(p.x * 7.4 - uTime * 0.13 + approximateIndex * 0.21) * 0.014;
    float coordinate = axis - bend;
    strandIndex = floor(coordinate / spacing + 0.5);
    float distanceToStrand = abs(coordinate - strandIndex * spacing);
    return 1.0 - smoothstep(0.003, 0.011, distanceToStrand);
  }

  void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - uResolution.xy) / min(uResolution.x, uResolution.y);
    uv.x -= 0.22;

    vec2 pointerDelta = uv - uPointer;
    float pointerDistance = length(pointerDelta);
    float pointerInfluence = exp(-pointerDistance * pointerDistance * 3.4) * uPointerStrength;
    float safeDistance = max(pointerDistance, 0.08);
    vec2 warped = uv + (pointerDelta / safeDistance) * pointerInfluence * 0.145;
    warped.y += sin(pointerDelta.x * 5.0 - uTime * 0.32) * pointerInfluence * 0.028;

    float strandIndex = 0.0;
    float field = strandField(warped, strandIndex);
    float accentBand = 1.0 - step(0.5, mod(strandIndex + 200.0, 5.0));
    float strandWeight = 0.17 + (0.5 + 0.5 * sin(strandIndex * 1.731)) * 0.055;
    float accentMix = accentBand * 0.48;
    vec3 color = mix(vec3(0.72, 0.78, 0.77), uAccent, accentMix);
    float alpha = field * strandWeight;
    gl_FragColor = vec4(color, clamp(alpha, 0.0, 0.34));
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
    let contextLost = false;
    let cleanup = () => {};

    void import("ogl").then(({ Mesh, Program, Renderer, Triangle, Vec2 }) => {
      if (disposed) return;
      try {
        const renderer = new Renderer({ canvas, alpha: true, dpr: Math.min(window.devicePixelRatio, 1.5) });
        const gl = renderer.gl;
        gl.clearColor(0, 0, 0, 0);
        const [r, g, b] = readAccent();
        const pointer = new Vec2(0, 0);
        const pointerTarget = new Vec2(0, 0);
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
          const scale = Math.min(rect.width, rect.height);
          pointerTarget.set(
            ((event.clientX - rect.left) * 2 - rect.width) / scale - 0.22,
            ((rect.bottom - event.clientY) * 2 - rect.height) / scale,
          );
          pointerStrengthTarget = 1;
        };
        const releasePointer = () => { pointerStrengthTarget = 0; };
        const onPointerOut = (event: PointerEvent) => {
          if (!event.relatedTarget) releasePointer();
        };
        const render = (time: number) => {
          if (disposed || contextLost) return;
          if (!document.hidden) {
            pointer.x += (pointerTarget.x - pointer.x) * 0.075;
            pointer.y += (pointerTarget.y - pointer.y) * 0.075;
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
        {[-364, -312, -260, -208, -156, -104, -52, 0, 52, 104, 156, 208, 260, 312, 364].map((offset, index) => (
          <path key={offset} className={index === 2 || index === 7 || index === 12 ? "wave-fallback__accent" : undefined} d={`M -80 ${390 + offset} C 260 ${190 + offset}, 410 ${560 + offset}, 1280 ${175 + offset}`} />
        ))}
      </svg>
      <canvas ref={canvasRef} />
      <span className="wave-vignette" />
    </div>
  );
}
