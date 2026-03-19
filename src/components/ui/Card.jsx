export default function Card({ children, className = "", hover, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl p-6 shadow-md border border-gray-200 transition-all duration-200
        ${hover ? "hover:shadow-lg hover:-translate-y-1" : ""}
        ${onClick ? "cursor-pointer" : ""}
        ${className}`}
    >
      {children}
    </div>
  );
}
