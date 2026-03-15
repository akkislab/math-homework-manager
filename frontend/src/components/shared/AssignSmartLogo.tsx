import Image from "next/image";

interface Props {
  size?: number;
  /** "icon" = brain+clipboard only, "full" = icon + "AssignSmart" text */
  variant?: "icon" | "full";
  className?: string;
}

export default function AssignSmartLogo({ size = 32, variant = "icon", className = "" }: Props) {
  if (variant === "full") {
    return (
      <Image
        src="/logo-full.png"
        alt="AssignSmart"
        width={size}
        height={Math.round(size * 1.38)}
        className={`object-contain ${className}`}
      />
    );
  }
  return (
    <Image
      src="/logo-icon.png"
      alt="AssignSmart"
      width={size}
      height={size}
      className={`object-contain ${className}`}
    />
  );
}
