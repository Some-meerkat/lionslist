export default function Toggle({ checked, onChange, label }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      {label && (
        <label className="text-[13px] font-semibold text-gray-700 flex-1">
          {label}
        </label>
      )}
      <div
        onClick={() => onChange(!checked)}
        className={`w-12 h-[26px] rounded-full cursor-pointer relative transition-colors ${
          checked ? "bg-green-500" : "bg-gray-300"
        }`}
      >
        <div
          className={`w-[22px] h-[22px] rounded-full bg-white absolute top-[2px] transition-[left] shadow-md ${
            checked ? "left-6" : "left-0.5"
          }`}
        />
      </div>
    </div>
  );
}
