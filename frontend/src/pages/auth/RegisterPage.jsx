import { useState } from 'react';
import Button from './RegisterButton';
import FormField from './RegisterFormField';
const INITIAL_FORM = {
  name: "",
  phoneNumber: "",
};

const ACTIVATION_STATUS_MESSAGES = {
  EXPIRED: "انتهت صلاحية التفعيل. يرجى طلب كود تفعيل جديد.",
  DEVICE_MISMATCH: "كود التفعيل غير مخصص لهذا الجهاز.",
  CLOCK_ROLLBACK: "تاريخ أو وقت الجهاز غير صحيح. يرجى تصحيح ساعة Windows ثم إعادة تشغيل البرنامج.",
  INVALID_LICENSE: "كود التفعيل غير صالح.",
  STATUS_UNAVAILABLE: "تعذر الاتصال بخدمة التفعيل المحلية. تأكد أن Backend يعمل.",
};

export default function RegisterPage({ api,activationStatus, onActivated = () => {} }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");
  const [activationCode, setActivationCode] = useState("");
  const [copyMessage, setCopyMessage] = useState("");
  const [subscriptionCode, setSubscriptionCode] = useState("");
  const [pasteMessage, setPasteMessage] = useState("");
  const [requestError, setRequestError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [activationResultMessage, setActivationResultMessage] = useState("");
  const [activationSucceeded, setActivationSucceeded] = useState(false);
  const updateField = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    setErrors((current) => ({ ...current, [field]: "" }));
    setSuccessMessage("");
    setActivationCode("");
    setCopyMessage("");
    setRequestError("");
  };

  const validateForm = () => {
    const nextErrors = {};

    const name = form.name.trim();
    const phone = form.phoneNumber.trim();
    if (!name) {
      nextErrors.name = "الاسم مطلوب";
    } else if (name.length < 2) {
      nextErrors.name = "الاسم يجب أن يتكون من حرفين على الأقل";
    }
    if (!phone) {
      nextErrors.phoneNumber = "رقم الهاتف مطلوب";
    } else if (
      phone.replace(/\D/g, "").length < 5
      || !/^[0-9+().\-\s]+$/.test(phone)
    ) {
      nextErrors.phoneNumber = "رقم الهاتف غير صالح";
    }

    return nextErrors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSuccessMessage("");
    setRequestError("");

    const nextErrors = validateForm();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setIsGenerating(true);
    try {
      const result = await api.request('/offline-activation/request',{method:'POST',body:{
        name: form.name.trim(),
        phone: form.phoneNumber.trim(),
      }});
      setErrors({});
      setActivationCode(result.requestCode);
      setCopyMessage("");
      setSuccessMessage("تم توليد كود التفعيل بنجاح.");
    } catch (error) {
      setActivationCode("");
      setRequestError(
        error.details?.code === "DEVICE_ID_UNAVAILABLE"
          ? "تعذر إنشاء معرف ثابت لهذا الجهاز."
          : (error.message || "تعذر توليد كود التفعيل، حاول مرة أخرى."),
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyCode = async () => {
    if (!activationCode) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(activationCode);
      } else {
        const copyInput = document.createElement("textarea");
        copyInput.value = activationCode;
        copyInput.style.position = "fixed";
        copyInput.style.opacity = "0";
        document.body.appendChild(copyInput);
        copyInput.select();
        const copied = document.execCommand("copy");
        copyInput.remove();

        if (!copied) throw new Error("Copy failed");
      }

      setCopyMessage("تم نسخ الكود إلى الحافظة");
    } catch {
      setCopyMessage("تعذر نسخ الكود، حاول مرة أخرى");
    }
  };

  const handlePasteSubscriptionCode = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      setSubscriptionCode(clipboardText.trim());
      setPasteMessage("تم لصق كود الاشتراك");
    } catch {
      setPasteMessage("تعذر الوصول إلى الحافظة، يمكنك لصق الكود يدويًا");
    }
  };

  const handleActivateSubscription = async () => {
    const code = subscriptionCode.trim();
    setActivationSucceeded(false);
    if (!code) {
      setActivationResultMessage("يرجى إدخال كود التفعيل أولًا.");
      return;
    }

    setIsActivating(true);
    setActivationResultMessage("");
    try {
      const result = await api.request('/offline-activation/activate',{method:'POST',body:{activationCode:code}});
      setActivationSucceeded(true);
      setActivationResultMessage("تم تفعيل الجهاز بنجاح.");
      onActivated(result);
    } catch (error) {
      const status = error.details?.activationStatus;
      setActivationResultMessage(
        ACTIVATION_STATUS_MESSAGES[status]
          || error.message
          || "كود التفعيل غير صالح.",
      );
    } finally {
      setIsActivating(false);
    }
  };

  const fieldError = (field) =>
    errors[field] ? (
      <p className="mt-1 text-[10px] leading-relaxed text-[#ba1a1a]">
        {errors[field]}
      </p>
    ) : null;

  return (
    <main
      className="retail-register min-h-screen w-full flex flex-col lg:flex-row-reverse bg-[#f9f9ff] text-[#151c27]"
      style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}
    >
      <section className="hidden lg:flex lg:w-1/2 relative bg-[#1e3a8a] items-center justify-center overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute -top-[10%] -right-[10%] w-[22vw] h-[22vw] max-w-[350px] max-h-[350px] bg-[#6cf8bb] rounded-full blur-[80px]" />
          <div className="absolute -bottom-[10%] -left-[10%] w-[18vw] h-[18vw] max-w-[280px] max-h-[280px] bg-[#00236f] rounded-full blur-[60px]" />
        </div>

        <div className="relative z-10 w-full max-w-3xl p-6 flex flex-col items-center justify-center">
          <div className="w-full rounded-xl overflow-hidden shadow-2xl">
            <img
              alt="Sham Touch Retail · نظام التجزئة"
              className="w-full h-auto object-cover"
              src="/register/login_screen.png"
            />
          </div>
          <div className="mt-4 text-center">
            <h2 className="text-xl xl:text-2xl 2xl:text-3xl leading-tight font-bold text-white mb-1">
              ابدأ إدارة أعمالك بسهولة
            </h2>
            <p className="text-sm xl:text-base leading-relaxed text-[#dce1ff] opacity-90">
              أنشئ حسابك وابدأ إدارة أعمالك بخطوات بسيطة
            </p>
          </div>
        </div>
      </section>

      <section className="w-full lg:w-1/2 min-h-screen flex items-center justify-center bg-white px-4 py-6 sm:px-6 lg:px-10">
        <div className="w-full max-w-xl animate-[fadeIn_0.8s_ease-out_forwards]">
          <div className="flex flex-col items-center mb-4">
            <img
              alt="Logo"
              className="w-14 h-14 md:w-16 md:h-16 object-contain mb-2"
              src="/register/logo.png"
            />
            <h1 className="text-sm sm:text-base md:text-lg leading-tight font-bold text-[#00236f]">
              Sham Touch Retail · نظام التجزئة
            </h1>
          </div>

          <div className="mb-4 text-center lg:text-right">
            <h2 className="text-xl md:text-2xl leading-tight font-bold text-[#151c27] mb-1">
              تسجيل وتفعيل الجهاز
            </h2>
            <p className="text-xs md:text-sm leading-relaxed text-[#444651]">
              أدخل الاسم ورقم الهاتف لتوليد طلب تفعيل Retail
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <FormField
                label="الاسم"
                maxLength={100} value={form.name}
                onChange={updateField("name")}
                placeholder="أدخل الاسم"
                autoComplete="name"
                aria-invalid={Boolean(errors.name)}
                className="h-11"
              />
              {fieldError("name")}
            </div>

            <div>
              <FormField
                label="رقم الهاتف"
                type="tel"
                maxLength={30} value={form.phoneNumber}
                onChange={updateField("phoneNumber")}
                placeholder="01012345678"
                dirLtr
                autoComplete="tel"
                aria-invalid={Boolean(errors.phoneNumber)}
                className="h-11"
              />
              {fieldError("phoneNumber")}
            </div>

            {successMessage && (
              <div className="bg-[#d8f8e8] text-[#006c49] border border-[#9ed9bd] rounded-lg px-3 py-2 text-xs leading-relaxed flex items-center gap-2">
                <span aria-hidden="true">✓</span>
                <span>{successMessage}</span>
              </div>
            )}

            {requestError && (
              <div className="bg-[#ffdad6] text-[#ba1a1a] border border-[#ffb4ab] rounded-lg px-3 py-2 text-xs leading-relaxed flex items-center gap-2" role="alert">
                <span aria-hidden="true">!</span>
                <span>{requestError}</span>
              </div>
            )}

            <Button
              type="submit"
              size="md"
              icon="key"
              disabled={isGenerating||isActivating}
              className="h-11 w-full"
            >
              {isGenerating ? "جاري توليد الكود..." : "توليد كود التفعيل"}
            </Button>

            <div className="space-y-1">
              <label
                htmlFor="activation-code"
                className="text-[10px] leading-[13px] tracking-[0.02em] font-medium text-[#444651] block"
              >
                كود التفعيل
              </label>
              <div className="flex items-stretch gap-2" dir="ltr">
                <input
                  id="activation-code"
                  type="text"
                  value={activationCode}
                  readOnly
                  placeholder="سيظهر كود التفعيل هنا"
                  className="h-11 min-w-0 flex-1 border border-[#c5c5d3] rounded-lg px-3 outline-none bg-[#f9f9ff] text-left text-[13px] leading-[19px] font-semibold tracking-[0.12em] text-[#151c27]"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  icon="content_copy"
                  disabled={!activationCode}
                  onClick={handleCopyCode}
                  className="h-11 w-28 shrink-0"
                >
                  نسخ الكود
                </Button>
              </div>
              {copyMessage && (
                <p
                  className={`text-[10px] leading-relaxed ${
                    copyMessage.startsWith("تم")
                      ? "text-[#006c49]"
                      : "text-[#ba1a1a]"
                  }`}
                  role="status"
                >
                  {copyMessage}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label
                htmlFor="subscription-code"
                className="text-[10px] leading-[13px] tracking-[0.02em] font-medium text-[#444651] block"
              >
                يرجى وضع كود الاشتراك المستلم هنا
              </label>
              <div className="flex items-stretch gap-2" dir="ltr">
                <input
                  id="subscription-code" maxLength={16384}
                  type="text"
                  value={subscriptionCode}
                  onChange={(event) => {
                    setSubscriptionCode(event.target.value);
                    setPasteMessage("");
                    setActivationResultMessage("");
                    setActivationSucceeded(false);
                  }}
                  placeholder="أدخل أو الصق كود الاشتراك"
                  autoComplete="off"
                  className="h-11 min-w-0 flex-1 border border-[#c5c5d3] rounded-lg px-3 outline-none focus:ring-2 focus:ring-[#00236f] focus:border-[#00236f] text-left text-[13px] leading-[19px] font-semibold tracking-[0.12em] text-[#151c27]"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  icon="content_paste"
                  onClick={handlePasteSubscriptionCode}
                  disabled={isActivating}
                  className="h-11 w-28 shrink-0"
                >
                  لصق
                </Button>
              </div>
              {pasteMessage && (
                <p
                  className={`text-[10px] leading-relaxed ${
                    pasteMessage.startsWith("تم")
                      ? "text-[#006c49]"
                      : "text-[#ba1a1a]"
                  }`}
                  role="status"
                >
                  {pasteMessage}
                </p>
              )}
            </div>

            <Button
              type="button"
              disabled={isGenerating||isActivating || !subscriptionCode.trim()}
              onClick={handleActivateSubscription}
              className="h-11 w-full"
            >
              {isActivating ? "جاري التحقق من الكود..." : "تفعيل الجهاز"}
            </Button>

            {(activationResultMessage || ACTIVATION_STATUS_MESSAGES[activationStatus]) && (
              <p
                className={`text-[10px] leading-relaxed ${
                  activationSucceeded ? "text-[#006c49]" : "text-[#ba1a1a]"
                }`}
                role="status"
              >
                {activationResultMessage || ACTIVATION_STATUS_MESSAGES[activationStatus]}
              </p>
            )}

          </form>
        </div>
      </section>
    </main>
  );
}
