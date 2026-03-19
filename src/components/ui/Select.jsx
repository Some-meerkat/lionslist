import Field from "./Field";

export default function Select({ label, error, children, className = "", ...props }) {
  return (
    <Field label={label} error={error}>
      <select
        className={`w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm outline-none box-border bg-white
          focus:border-[#1D4F91] focus:ring-1 focus:ring-[#1D4F91] ${className}`}
        {...props}
      >
        {children}
      </select>
    </Field>
  );
}
