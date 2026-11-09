import { z } from 'zod';
import { audit } from './common.js';
export const presentationSchema=z.object({
 storeName:z.string().trim().min(1).max(200),companyName:z.string().max(200),branchName:z.string().max(200),taxNumber:z.string().max(30),commercialRegister:z.string().max(100),phone:z.string().max(50),mobile:z.string().max(50),email:z.string().max(200),address:z.string().max(1000),
 logoEmoji:z.string().max(20),receiptTitle:z.string().max(200),receiptPaperWidth:z.enum(['57mm','80mm']),headerMessage:z.string().max(1000),footerMessage:z.string().max(1000),showTaxNumber:z.boolean(),showCashierName:z.boolean(),showCustomerInfo:z.boolean(),showTaxBreakdown:z.boolean(),defaultOpeningFloat:z.number().finite().min(0).max(1e9)
}).strict();
export async function readPresentation(db,companyId){
 const company=(await db.query('SELECT name,base_currency,allow_negative_stock FROM companies WHERE id=$1',[companyId])).rows[0];
 const stored=(await db.query("SELECT settings FROM module_configuration WHERE company_id=$1 AND module_id='retailPresentation'",[companyId])).rows[0]?.settings??{};
 return {companyName:'',branchName:'',taxNumber:'',commercialRegister:'',phone:'',mobile:'',email:'',address:'',logoEmoji:'🏪',receiptTitle:'فاتورة ضريبية مبسطة',receiptPaperWidth:'80mm',headerMessage:'',footerMessage:'شكراً لزيارتكم',showTaxNumber:true,showCashierName:true,showCustomerInfo:true,showTaxBreakdown:true,defaultOpeningFloat:0,...stored,storeName:company.name,currency:company.base_currency,allowNegativeStock:company.allow_negative_stock,autoPrintReceipt:false,openCashDrawerOnPrint:false,showQrCode:false,showLoyaltyPoints:false};
}
export async function savePresentation(db,user,input){
 const settings=presentationSchema.parse(input);
 await db.query("INSERT INTO module_configuration(company_id,module_id,enabled,settings) VALUES($1,'retailPresentation',false,$2) ON CONFLICT(company_id,module_id) DO UPDATE SET settings=excluded.settings",[user.companyId,settings]);
 await db.query('UPDATE companies SET name=$2 WHERE id=$1',[user.companyId,settings.storeName]);
 await audit(db,user,'presentation.configure',user.companyId);
 return readPresentation(db,user.companyId);
}
