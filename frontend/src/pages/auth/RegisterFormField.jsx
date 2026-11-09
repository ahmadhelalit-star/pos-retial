/* ============================================================
 * المكون: FormField
 *
 * الوظيفة:
 * مكوّن حقل إدخال موحد (input / select / textarea)
 * يوحّد أنماط الحقول المكررة عبر الصفحات.
 *
 * الـ Props:
 * @param {string} label - نص التسمية
 * @param {string} type - نوع الحقل (text, number, email, tel, date, time, select, textarea)
 * @param {string} value - القيمة
 * @param {function} onChange - دالة التغيير
 * @param {string} placeholder - النص التوضيحي
 * @param {string} className - فئات إضافية
 * @param {Array} options - خيارات الـ select
 * @param {boolean} dirLtr - اتجاه النص من اليسار لليمين
 * @param {string} suffix - نص إضافي على اليمين (مثل ج.م)
 * ============================================================ */

import { useId } from "react";

export default function FormField({
  label,
  type = "text",
  value,
  onChange,
  placeholder = "",
  className = "",
  options = [],
  dirLtr = false,
  suffix = "",
  ...rest
}) {
  const generatedId = useId();
  const fieldId = rest.id || generatedId;
  const baseClass =
    "w-full border border-[#c5c5d3] rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-[#00236f] focus:border-[#00236f] text-[13px] leading-[19px]";

  const textAlign = dirLtr ? "text-left" : "text-right";

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={fieldId} className="text-[10px] leading-[13px] tracking-[0.02em] font-medium text-[#444651] block">
          {label}
        </label>
      )}
      {type === "select" ? (
        <select
          id={fieldId}
          value={value}
          onChange={onChange}
          className={`${baseClass} ${textAlign} appearance-none ${className}`}
          {...rest}
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      ) : type === "textarea" ? (
        <textarea
          id={fieldId}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`${baseClass} ${textAlign} h-24 ${className}`}
          {...rest}
        />
      ) : (
        <div className="relative">
          <input
            id={fieldId}
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            dir={dirLtr ? "ltr" : undefined}
            className={`${baseClass} ${textAlign} ${suffix ? "pl-8" : ""} ${className}`}
            {...rest}
          />
          {suffix && (
            <span className="absolute right-2 top-1.5 text-[10px] leading-[13px] tracking-[0.02em] text-[#757682]">
              {suffix}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
