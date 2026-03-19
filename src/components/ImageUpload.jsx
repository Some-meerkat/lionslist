import { useRef } from "react";

export default function ImageUpload({ images, onChange, maxImages = 3 }) {
  const fileRef = useRef(null);

  const handleFiles = (e) => {
    const files = Array.from(e.target.files).slice(0, maxImages - images.length);
    const newImages = [...images];
    files.forEach((file) => {
      newImages.push({ file, preview: URL.createObjectURL(file) });
    });
    onChange(newImages.slice(0, maxImages));
    e.target.value = "";
  };

  const remove = (index) => {
    const updated = images.filter((_, i) => i !== index);
    onChange(updated);
  };

  return (
    <div className="mb-4">
      <label className="block text-[13px] font-semibold text-gray-700 mb-1">
        Pictures ({images.length}/{maxImages})
      </label>
      <div className="flex gap-2 flex-wrap">
        {images.map((img, i) => (
          <div
            key={i}
            className="w-20 h-20 rounded-lg overflow-hidden relative"
          >
            <img
              src={img.preview || img.url}
              alt=""
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white border-none cursor-pointer text-xs flex items-center justify-center"
            >
              ×
            </button>
          </div>
        ))}
        {images.length < maxImages && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 cursor-pointer flex items-center justify-center text-2xl text-gray-400 hover:border-gray-400"
          >
            +
          </button>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFiles}
        className="hidden"
      />
    </div>
  );
}
