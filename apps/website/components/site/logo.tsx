import Link from "next/link";

export function Logo() {
  return (
    <Link className="wordmark" href="/" aria-label="Othie AI home">
      <span className="brand-mark" aria-hidden="true"><span /></span>
      <span>Othie AI</span>
    </Link>
  );
}
