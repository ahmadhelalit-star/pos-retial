export const DEFAULT_STORE_SETTINGS = {
  // بيانات المتجر الأساسية
  storeName: 'شام تاتش للتجزئة',
  companyName: 'مؤسسة شام تاتش للتجارة والتجزئة',
  branchName: 'الفرع الرئيسي - الرياض',
  taxNumber: '310123456700003',
  commercialRegister: '1010789456',
  phone: '0114567890',
  mobile: '0501234567',
  email: 'info@shamtouch-pos.sa',
  address: 'الرياض - طريق الملك فهد - حي العليا',
  currency: 'ر.س',
  defaultTaxRate: 15,

  // تخصيص فاتورة الكاشير الحرارية (Receipt Settings)
  receiptTitle: 'فاتورة ضريبية مبسطة',
  headerMessage: 'أهلاً وسهلاً بكم، نسعد بخدمتكم دائماً ✨',
  footerMessage: 'البضاعة المباعة ترد وتستبدل خلال 3 أيام بشرط سلامة المنتج ووجود أصل الفاتورة. شكراً لزيارتكم!',
  receiptPaperWidth: '80mm', // '80mm' | '57mm'
  showTaxNumber: true,
  showCashierName: true,
  showCustomerInfo: true,
  showLoyaltyPoints: true,
  showQrCode: true,
  showItemBarcode: false,
  showTaxBreakdown: true,

  // إعدادات الكاشير والصندوق المالي
  autoPrintReceipt: true,
  openCashDrawerOnPrint: true,
  allowNegativeStock: false,
  defaultOpeningFloat: 300.00,
  logoEmoji: '🏪',
};
