const variants = {
  primary: "bg-[#1D4F91] text-white hover:bg-[#174080]",
  secondary: "bg-white text-[#1D4F91] border-2 border-[#1D4F91] hover:bg-[#E8F4FD]",
  danger: "bg-red-500 text-white hover:bg-red-600",
  success: "bg-green-600 text-white hover:bg-green-700",
  ghost: "bg-transparent text-[#1D4F91] hover:bg-gray-100",
  whatsapp: "bg-[#25D366] text-white hover:bg-[#1fb855]",
};

export default function Button({
  children,
  variant = "primary",
  small,
  full,
  className = "",
  ...props
}) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-all cursor-pointer
        ${small ? "px-3.5 py-1.5 text-[13px]" : "px-5 py-2.5 text-sm"}
        ${full ? "w-full" : ""}
        ${variants[variant] || variants.primary}
        ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
