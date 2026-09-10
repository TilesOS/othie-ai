"use client";

import { AlertCircle, Apple, ArrowRight, MonitorDown } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { detectDevice, deviceLabel, recommendPlatform, type Detection } from "@/lib/platform";
import { getDownloadableRelease, releaseManifest, type ReleasePlatform } from "@/lib/releases";

type UAData = {
  platform?: string;
  getHighEntropyValues?: (hints: string[]) => Promise<{ architecture?: string; platform?: string }>;
};

export function DownloadChooser() {
  const [selection, setSelection] = useState<ReleasePlatform | null>(null);
  const [detection, setDetection] = useState<Detection | null>(null);

  useEffect(() => {
    let cancelled = false;
    const userAgentData = (navigator as Navigator & { userAgentData?: UAData }).userAgentData;
    const device = detectDevice(navigator.userAgent, navigator.platform, navigator.maxTouchPoints);
    const fallback: Detection = { device, architecture: "unknown", source: "user-agent" };
    const frame = window.requestAnimationFrame(() => {
      if (!cancelled) setDetection(fallback);
    });
    void userAgentData?.getHighEntropyValues?.(["architecture", "platform"]).then((values) => {
      if (cancelled) return;
      const architecture = values.architecture?.toLowerCase();
      const normalizedArchitecture = architecture && ["arm", "arm64", "aarch64"].includes(architecture)
        ? "apple-silicon"
        : architecture && ["x86", "x86_64", "amd64", "x64"].includes(architecture)
          ? "x64"
          : "unknown";
      const next: Detection = { device, architecture: normalizedArchitecture, source: "high-entropy" };
      setDetection(next);
      const recommendation = recommendPlatform(next);
      if (recommendation) setSelection(recommendation);
    }).catch(() => setDetection(fallback));
    return () => { cancelled = true; window.cancelAnimationFrame(frame); };
  }, []);

  const recommended = detection ? recommendPlatform(detection) : null;
  const selectedRelease = releaseManifest.find((release) => release.platform === selection) ?? null;
  const downloadable = selectedRelease ? getDownloadableRelease(selectedRelease) : null;

  return (
    <section className="download-chooser" aria-labelledby="choose-build-title">
      <div className="detection-banner" aria-live="polite">
        <span className="detection-icon"><MonitorDown size={18} /></span>
        <div>
          <span className="mono-meta">Device check</span>
          {!detection ? (
            <p>Choose a desktop build below. Device detection is advisory.</p>
          ) : recommended ? (
            <p>We can suggest a build for this {deviceLabel(detection.device)}, but you stay in control.</p>
          ) : (
            <p>We found a {deviceLabel(detection.device)}, but cannot verify a supported architecture. Choose manually below.</p>
          )}
        </div>
      </div>

      <div className="build-grid" id="choose-build-title">
        {releaseManifest.map((release) => {
          const isSelected = selection === release.platform;
          const isRecommended = recommended === release.platform;
          return (
            <button className={`build-card${isSelected ? " is-selected" : ""}`} key={release.platform} onClick={() => setSelection(release.platform)} type="button">
              <span className="build-card__top">
                <span className="platform-icon">{release.os === "macOS" ? <Apple size={22} /> : <span className="windows-mark" aria-hidden="true"><i /><i /><i /><i /></span>}</span>
                {isRecommended && <span className="status-chip status-chip--recommended">Recommended</span>}
              </span>
              <strong>{release.label}</strong>
              <span>{release.architecture}</span>
              <small>Installer unavailable</small>
            </button>
          );
        })}
      </div>

      <div className="release-panel">
        {!selectedRelease ? (
          <div className="empty-choice"><ArrowRight size={20} /><div><strong>Select a platform</strong><p>Manual selection is always available, even when detection is unavailable.</p></div></div>
        ) : downloadable ? (
          <div><a className="button button--primary button--large" href={downloadable.artifactUrl}>Download {downloadable.label}</a></div>
        ) : (
          <div className="unavailable-choice">
            <AlertCircle size={20} />
            <div>
              <span className="mono-meta">Not yet available</span>
              <h2>{selectedRelease.label} is still being verified.</h2>
              <p>{selectedRelease.unavailableReason} No download starts from this page until release metadata is complete.</p>
              <div className="inline-actions">
                <Link className="button button--secondary" href="/docs/setup">Use developer setup</Link>
                <a className="text-link" href="https://github.com/TilesOS/othie-ai" rel="noreferrer" target="_blank">Follow the repository <ArrowRight size={15} /></a>
              </div>
            </div>
          </div>
        )}
      </div>
      <noscript><p className="noscript-note">JavaScript is off. Both known desktop targets are currently unavailable; use the developer setup guide for the present workflow.</p></noscript>
    </section>
  );
}
