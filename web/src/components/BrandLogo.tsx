type Props = {
  /** Altura em px (largura acompanha). Default 40 */
  height?: number;
  className?: string;
  priority?: boolean;
};

export const BRAND_LOGO_SRC = "/brand/logo-comparaja.png";

export function BrandLogo({ height = 40, className = "" }: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={BRAND_LOGO_SRC}
      alt="ComparaJá"
      height={height}
      className={`w-auto bg-transparent object-contain ${className}`}
      style={{ height, width: "auto" }}
    />
  );
}
