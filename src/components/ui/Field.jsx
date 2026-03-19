export default function Field({ label, error, children }) {
  return (
    <div className="mb-4">
      {label && (
        <label className="block text-[13px] font-semibold text-gray-700 mb-1">
          {label}
        </label>
      )}
      {children}
      {error && (
        <span className="text-red-500 text-xs mt-0.5 block">{error}</span>
      )}
    </div>
  );
}
