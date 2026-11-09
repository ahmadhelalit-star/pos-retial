import {MODULE_TITLES} from '../../../../shared/features';

const groups={catalog:['المنتجات','Products'],stock:['المخزون','Inventory'],sales:['المبيعات والفواتير','Sales and invoices'],purchases:['المشتريات','Purchases'],partners:['العملاء والموردون','Customers and suppliers'],payments:['السندات','Payments'],shifts:['الورديات','Shifts'],reports:['التقارير','Reports'],printing:['الطباعة','Printing'],users:['المستخدمون','Users'],roles:['الأدوار','Roles'],modules:['الوحدات الإضافية','Optional modules'],organization:['إعدادات المنشأة','Store settings'],imports:['الاستيراد','Import'],audit:['سجل المراجعة','Audit log']};
const actions={read:['عرض','View'],create:['إضافة','Add'],update:['تعديل','Edit'],archive:['أرشفة','Archive'],manage:['إدارة','Manage'],configure:['إعداد','Configure'],preview:['معاينة','Preview'],commit:['اعتماد الاستيراد','Confirm import'],post:['اعتماد','Post'],discount:['تطبيق الخصومات','Apply discounts'],price:['تغيير السعر','Change price'],return:['إرجاع','Return'],cancel:['إلغاء','Cancel'],open:['فتح','Open'],close:['إغلاق','Close'],ack:['تأكيد تنفيذ الطباعة','Confirm printing']};
export const permissionGroup=(id,english)=>groups[id]?.[english?1:0];
export function permissionLabel(id,english){
 const [group,action]=id.split('.');
 if(group==='modules'&&MODULE_TITLES[action])return MODULE_TITLES[action][english?'en':'ar'];
 const verb=actions[action]?.[english?1:0];
 return verb&&groups[group]?`${verb} ${permissionGroup(group,english)}`:id;
}
