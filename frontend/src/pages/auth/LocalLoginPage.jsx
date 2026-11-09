import {useEffect,useState} from 'react';
function LoginIcon({name,className=''}){const paths={lock:'M6 10h12v11H6zM8 10V6a4 4 0 0 1 8 0v4',visibility:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z',visibility_off:'M3 3l18 18M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z',backspace:'M9 4h13v16H9L1 12zM12 8l6 8m0-8-6 8',support_agent:'M4 15v-3a8 8 0 0 1 16 0v3M4 12H2v6h4v-6h-2m16 0h2v6h-4v-6h2M20 18c0 3-3 4-7 4',error:'M12 7v7m0 3v1M12 2L1 22h22z',progress_activity:'M12 2a10 10 0 1 1-10 10'};return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={'inline-block w-5 h-5 '+className}><path d={paths[name]??paths.lock}/></svg>;}
export default function LocalLoginPage({api,onLogin,onRecover,preferences,initialError='',english=false,dark=false}){
 const [users,setUsers]=useState([]),[selectedUser,setSelectedUser]=useState(null),[passcode,setPasscode]=useState(''),[showPasscode,setShowPasscode]=useState(false),[isLoggingIn,setIsLoggingIn]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(initialError),[showSupportContact,setShowSupportContact]=useState(false),[branding,setBranding]=useState({name:'Sham Touch Retail'});
 const recoverySuccess='';
 useEffect(()=>{let live=true;api.request('/auth/accounts').then(result=>{if(!live)return;const colors=['bg-[#dce1ff] text-[#00236f]','bg-emerald-100 text-emerald-800','bg-amber-100 text-amber-800','bg-purple-100 text-purple-800'];const rows=result.items.map((row,index)=>({...row,initial:row.name?.charAt(0),color:colors[index%colors.length],role:row.isAdmin?'admin':'user'}));setUsers(rows);setSelectedUser(rows[0]??null);setBranding(result.branding);setError('');}).catch(failure=>{if(live)setError(failure.message);}).finally(()=>{if(live)setLoading(false);});return()=>{live=false;};},[api]);
 const addDigit=num=>{setPasscode(value=>(value+num).slice(0,200));setError('');};const backspace=()=>setPasscode(value=>value.slice(0,-1));
 const switchUser=user=>{if(isLoggingIn)return;setSelectedUser(user);setPasscode('');setError('');};
 const handleLoginAttempt=async()=>{if(isLoggingIn||!passcode||!selectedUser)return;setIsLoggingIn(true);setError('');try{onLogin(await api.request('/auth/login',{method:'POST',body:{userId:selectedUser.id,password:passcode}}));setPasscode('');}catch(failure){setError(failure.message);setPasscode('');}finally{setIsLoggingIn(false);}};
 const retry=()=>window.location.reload();
 useEffect(()=>{const key=event=>{if(event.ctrlKey||event.altKey||event.metaKey||isLoggingIn)return;const typing=['INPUT','TEXTAREA'].includes(event.target?.tagName);if(event.key==='Enter'){if(event.target?.tagName==='BUTTON')return;event.preventDefault();handleLoginAttempt();}else if(event.key==='Escape'){setPasscode('');}else if(!typing&&/^\d$/.test(event.key)){event.preventDefault();addDigit(event.key);}else if(!typing&&event.key==='Backspace'){event.preventDefault();backspace();}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);});
 if(loading)return <p role="status" className="p-6">جارٍ تحميل المستخدمين…</p>;
 if(!users.length)return <div className="min-h-screen grid place-items-center p-6"><div><p role="alert">{error||'لا توجد حسابات مفعّلة للدخول. راجع المدير.'}</p><button onClick={retry}>إعادة المحاولة</button></div></div>;
  return (
    <main
      className={'retail-local-login min-h-screen w-full flex flex-col md:flex-row bg-[#f9f9ff] text-[#151c27] '+(dark?'retail-dark':'')}
      dir={english?'ltr':'rtl'}
      style={{ fontFamily: "'IBM Plex Sans Arabic', sans-serif" }}
    >
      {/* ============================================================
       * القسم الأيسر: اختيار المستخدم وإدخال الرمز السري
       * ============================================================ */}
      <section className="flex-1 flex flex-col p-4 md:p-5 xl:p-6 justify-between overflow-y-auto">
        {/* شريط اختيار المستخدمين - تمرير أفقي */}
        <div className="space-y-2 md:space-y-3">
          <p className="text-[10px] sm:text-xs tracking-wide font-medium text-[#444651]">
            {english?'Choose user':'اختر المستخدم'}
          </p>
          <div className="flex gap-3 md:gap-4 overflow-x-auto pb-1 scroll-smooth">
            {users.map((user) => (
              <button
                key={user.id}
                aria-label={user.name} aria-pressed={selectedUser?.id===user.id}
                onClick={() => switchUser(user)}
                className={`shrink-0 flex items-center gap-1.5 md:gap-2 p-1.5 md:p-2 rounded-full border-2 transition-all ${
                  selectedUser?.id === user.id
                    ? "bg-[#f0f3ff] border-[#00236f]"
                    : "bg-[#f0f3ff] border-transparent hover:border-[#c5c5d3]"
                }`}
              >
                <div
                  className={`w-6 h-6 md:w-7 md:h-7 rounded-full ${user.color} flex items-center justify-center font-bold text-[10px] md:text-xs`}
                >
                  {user.initial || user.name?.charAt(0) || "؟"}
                </div>
                <span className="text-[10px] sm:text-xs tracking-wide font-medium text-[#444651] pl-0.5 md:pl-1">
                  {user.name?.split(" ")[0]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* معلومات المستخدم: الصورة الشخصية + الاسم + الدور */}
        <div className="flex flex-col items-center my-3 md:my-4">
          <div
            className={`w-16 h-16 md:w-20 md:h-20 rounded-full border-2 border-[#00236f]/10 p-1 mb-2 md:mb-3 ${
              selectedUser?.color || "bg-[#e2e8f8]"
            } flex items-center justify-center`}
          >
            <span className="text-2xl md:text-3xl font-bold">
              {selectedUser?.initial || "؟"}
            </span>
          </div>
          <h2 className="text-sm md:text-base leading-tight font-bold text-[#151c27]">
            {english?'Welcome, ':'أهلاً، '}{selectedUser?.name || ""}
          </h2>
          <p className="text-[10px] sm:text-xs md:text-sm leading-relaxed text-[#444651]">
            {selectedUser?.role === "admin" ? (english?'Administrator':'مدير (Admin)') : (english?'User':'مستخدم (User)')}
          </p>
        </div>

        {preferences&&<div className="flex justify-center gap-4 text-xs">{preferences}</div>}
        {/* شاشة عرض الرمز السري المدخل */}
        <div className="flex flex-col items-center mb-3 md:mb-4">
          <p className="text-[10px] sm:text-xs tracking-wide font-medium text-[#444651] mb-1.5 md:mb-2">
            {english?'Enter passcode':'أدخل الرمز السري (Passcode)'}
          </p>
          <div className="w-full max-w-[280px]">
            <div className="relative">
              <input
                type={showPasscode ? "text" : "password"}
                aria-label={english?'Passcode':'الرمز السري'} autoComplete="current-password" name="password" maxLength={200} value={passcode} disabled={isLoggingIn}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="••••••"
                className="w-full h-10 md:h-12 pr-10 pl-10 bg-[#f0f3ff] border border-[#c5c5d3] rounded-lg text-xs sm:text-sm md:text-base leading-relaxed outline-none transition-all focus:ring-2 focus:ring-[#00236f] focus:border-[#00236f]"
              />
              {/* أيقونة القفل على اليمين */}
              <LoginIcon name="lock" className="absolute right-3 top-1/2 -translate-y-1/2 text-[#757682] text-base"/>
              {/* زر إظهار/إخفاء الرمز السري على اليسار */}
              <button
                type="button"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#757682] hover:text-[#00236f] transition-colors"
                aria-label={english?'Show or hide passcode':'إظهار أو إخفاء الرمز'} onClick={() => setShowPasscode(!showPasscode)}
                tabIndex={-1}
              >
                <LoginIcon name={showPasscode ? "visibility_off" : "visibility"} className="text-base"/>
              </button>
            </div>
          </div>
          {error && (
            <div className="mt-2 bg-[#ffdad6] text-[#ba1a1a] border border-[#f0c0b8] rounded-lg px-3 py-2 text-[11px] leading-relaxed flex items-center gap-1.5 max-w-[280px] w-full">
              <LoginIcon name="error" className="text-sm"/>
              <span role="alert">{error}</span>
            </div>
          )}
          {recoverySuccess && (
            <div className="mt-2 rounded-lg border border-[#a6e2c5] bg-[#dff6eb] px-3 py-2 text-[11px] text-[#08724f] max-w-[280px] w-full">
              {recoverySuccess}
            </div>
          )}
          {selectedUser?.role === "admin" && (
            <button
              type="button"
              onClick={() => onRecover(selectedUser)}
              className="mt-2 text-xs font-semibold text-[#00236f] hover:underline"
            >
              {english?'Forgot admin passcode?':'نسيت رمز الأدمن؟'}
            </button>
          )}
        </div>

        {/* لوحة الأرقام (Keypad) - تصميم 3x4 Grid */}
        <div className="grid grid-cols-3 gap-2 md:gap-3 w-full max-w-[260px] mx-auto">
          {/* الأرقام من 1 إلى 9 */}
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              className="h-10 md:h-12 rounded-lg bg-[#f0f3ff] text-[#151c27] text-sm md:text-base font-semibold flex items-center justify-center hover:bg-[#e2e8f8] transition-colors"
              onClick={() => addDigit(String(num))}
            >
              {num}
            </button>
          ))}

          {/* زر الدخول */}
          <button
            className="h-10 md:h-12 rounded-lg bg-[#00236f] text-white text-xs md:text-sm font-semibold flex items-center justify-center hover:bg-[#1e3a8a] transition-colors disabled:opacity-60"
            onClick={handleLoginAttempt}
            disabled={isLoggingIn || passcode === "" || !selectedUser}
          >
            {isLoggingIn ? (
              <LoginIcon name="progress_activity" className="animate-spin text-base"/>
            ) : (
              (english?'Sign in':'دخول')
            )}
          </button>

          {/* الرقم 0 */}
          <button
            className="h-10 md:h-12 rounded-lg bg-[#f0f3ff] text-[#151c27] text-sm md:text-base font-semibold flex items-center justify-center hover:bg-[#e2e8f8] transition-colors"
            onClick={() => addDigit("0")}
          >
            0
          </button>

          {/* زر الحذف (Backspace) */}
          <button
            className="h-10 md:h-12 rounded-lg bg-[#f0f3ff] text-[#151c27] flex items-center justify-center hover:bg-[#e2e8f8] transition-colors"
            aria-label={english?'Delete last character':'حذف آخر حرف'} onClick={backspace}
          >
            <LoginIcon name="backspace" className="text-base md:text-lg"/>
          </button>
        </div>
      </section>

      {/* ============================================================
       * القسم الأيمن: الشعار والدعم الفني
       * يظهر فقط على الشاشات المتوسطة والكبيرة (md:flex)
       * ============================================================ */}
      <section className="hidden md:flex flex-1 flex-col items-center justify-center bg-[#1e3a8a] text-white text-center relative overflow-hidden p-4 md:p-5 xl:p-6">
        <div className="flex flex-col items-center gap-2 md:gap-3 relative z-10">
          {/* الشعار */}
          <div className="w-24 h-24 md:w-28 md:h-28 bg-white rounded-2xl shadow-xl mb-2 md:mb-3 overflow-hidden">
            <img
              alt="Logo"
              className="w-full h-full object-cover"
              src="/register/logo.png"
            />
          </div>
          <h1 className="text-sm md:text-base lg:text-lg leading-tight font-bold tracking-tight">
            {branding.name}
          </h1>
          <p className="text-[10px] sm:text-xs md:text-sm leading-relaxed opacity-80 max-w-[200px]">
            {english?'Speed and accuracy with Sham Touch':'السرعة والدقة في خدمة عملائكم مع Sham Touch'}
          </p>
          {/* زر الدعم الفني */}
          <button
            type="button"
            onClick={() => setShowSupportContact((visible) => !visible)}
            aria-expanded={showSupportContact}
            aria-controls="support-contact-details"
            className="mt-2 md:mt-3 px-3 md:px-4 py-1.5 md:py-2 bg-white/10 hover:bg-white/20 border border-white/30 rounded-full text-[10px] sm:text-xs tracking-wide font-medium transition-all flex items-center gap-1"
          >
            <LoginIcon name="support_agent" className="text-xs md:text-sm"/>
            {english?'Contact support':'للتواصل مع الدعم الفني'}
          </button>
          {showSupportContact && (
            <div
              id="support-contact-details"
              className="mt-2 md:mt-3 rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-right text-[11px] md:text-xs leading-6"
            >
              <p>
                البريد الإلكتروني: {" "}
                <a
                  href="mailto:ahmad.helal.it@gmail.com"
                  dir="ltr"
                  className="inline-block hover:underline"
                >
                  ahmad.helal.it@gmail.com
                </a>
              </p>
              <p>
                رقم الهاتف: {" "}
                <a
                  href="tel:+201032894919"
                  dir="ltr"
                  className="inline-block hover:underline"
                >
                  +201032894919
                </a>
              </p>
            </div>
          )}
        </div>
      </section>

    </main>
  );
}
