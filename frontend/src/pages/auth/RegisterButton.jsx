/* ============================================================
 * المكون: Button
 *
 * الوظيفة:
 * زر موحد بمتغيرات مختلفة (primary, danger, outline, ghost, success)
 * يدعم الأيقونة، النص، حالة التعطيل، وتأثيرات التفاعل.
 *
 * الـ Props:
 * @param {string} variant - نوع الزر (primary, danger, outline, ghost, success)
 * @param {string} size - حجم الزر (sm, md, lg)
 * @param {string} icon - اسم أيقونة Material Symbols
 * @param {boolean} disabled - حالة التعطيل
 * @param {function} onClick - دالة النقر
 * @param {string} className - أصناف إضافية
 * @param {React.ReactNode} children - محتوى الزر
 * ============================================================ */

const VARIANTS = {
  primary:
    "bg-[#00236f] text-white hover:bg-[#1e3a8a] shadow-md shadow-[#00236f]/20",
  danger:
    "bg-white border border-[#ba1a1a] text-[#ba1a1a] hover:bg-[#ffdad6]",
  outline:
    "bg-white border border-[#00236f] text-[#00236f] hover:bg-[#f0f3ff]",
  ghost: "text-[#444651] hover:bg-[#f0f3ff]",
  success: "bg-[#006c49] text-white hover:brightness-110",
  subtle:
    "bg-[#e2e8f8] border border-[#c5c5d3] text-[#444651] hover:bg-[#dce2f3]",
};

const SIZES = {
  sm: "px-3 py-1.5 text-[12px] rounded-lg gap-1",
  md: "px-4 py-2 text-[14px] rounded-lg gap-2",
  lg: "px-6 py-3 text-[16px] rounded-xl gap-2",
  xl: "px-8 py-4 text-[16px] rounded-xl gap-2",
};

export default function Button({
  variant = "primary",
  size = "md",
  icon,
  disabled = false,
  onClick,
  type = "button",
  className = "",
  children,
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    >
      {icon && <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">{icon==='key'?<><circle cx="8" cy="9" r="5"/><path d="m12 13 8 8m-3-3 3-3m-6 0 3-3"/></>:icon==='content_copy'?<><rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V3H3v13h5"/></>:<><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 2h6v5H9zM8 12h8m-8 4h8"/></>}</svg>}
      {children}
    </button>
  );
}
