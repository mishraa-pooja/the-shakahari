/**
 * Brand lockup: SHAKA-HARI wordmark + Veg Dum Biryani Co. subtitle.
 * Use for Hero, Navbar, Footer, or any brand placement.
 */

interface BrandLockupProps {
  /** Font size for the wordmark (default: 56px) */
  fontSize?: string | number;
  /** Inline styles or class for the container */
  className?: string;
  style?: React.CSSProperties;
}

export function BrandLockup({ fontSize = "56px", className, style }: BrandLockupProps) {
  return (
    <div className={className} style={{ textAlign: "center", ...style }}>
      <div className="brand-wordmark" style={{ fontSize: typeof fontSize === "number" ? `${fontSize}px` : fontSize }}>
        SHAKA<span>-</span>HARI
      </div>
      <div className="brand-subtitle">
        <strong>Veg Dum Biryani</strong> Co.
      </div>
    </div>
  );
}
