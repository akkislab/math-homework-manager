const SIZE_CLASSES: Record<string, string> = {
  xs: "w-4 h-4 border-2",
  sm: "w-6 h-6 border-[3px]",
  md: "w-8 h-8 border-[3px]",
  lg: "w-10 h-10 border-4",
};

export default function Spinner({ size = "md" }: { size?: "xs" | "sm" | "md" | "lg" }) {
  return (
    <div
      className={`animate-spin border-brand-500 border-t-transparent rounded-full ${SIZE_CLASSES[size]}`}
    />
  );
}
