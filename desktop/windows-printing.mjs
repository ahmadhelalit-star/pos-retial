import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {join} from 'node:path';
import {atomicJSON} from '../backend/src/operations/files.js';
import {saveReceiptPDF} from './pdf-output.mjs';
const run=promisify(execFile);
export const isVirtualPrinter=name=>/microsoft print to pdf|microsoft xps|onenote|^fax$|anydesk printer/i.test(name);
export const isPDFPrinter=name=>/^Microsoft Print to PDF$/i.test(name);
export async function windowsPrinters(){
 if(process.platform!=='win32')throw Error('الطباعة الصامتة متاحة على Windows / Windows printing required');
 const {stdout}=await run('powershell.exe',['-NoProfile','-NonInteractive','-Command',"[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false); @(Get-CimInstance Win32_Printer | Select-Object Name,DriverName,PortName,PrinterStatus,WorkOffline) | ConvertTo-Json -Compress"],{windowsHide:true,timeout:15000,maxBuffer:2*1024*1024});
 const value=JSON.parse(stdout||'[]');return (Array.isArray(value)?value:[value]).filter(row=>row?.Name).map(row=>({...row,isVirtual:isVirtualPrinter(row.Name),isPdf:isPDFPrinter(row.Name),offline:Boolean(row.WorkOffline)}));
}
export async function spoolImages(printer,pages,id,{directory,copies=1,enumerate=windowsPrinters,chrome}){
 let selected;try{selected=(await enumerate()).find(row=>row.Name===printer);if(!selected||selected.offline||(selected.isVirtual&&!isPDFPrinter(selected.Name)))throw Error('الطابعة الحرارية غير متاحة؛ لم تُرسل المهمة / Thermal printer unavailable; nothing sent');}catch(error){error.printDelivery='not_sent';throw error;}
 if(isPDFPrinter(selected.Name)){try{return await saveReceiptPDF(pages,id,{directory,copies,chrome});}catch(error){error.printDelivery='not_sent';throw error;}}
 const input=join(directory,id+'.print.json');await atomicJSON(input,{printer,pages,id,copies});
 const {stdout}=await run('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',fileURLToPath(new URL('./windows/Print-Images.ps1',import.meta.url)),'-InputPath',input],{windowsHide:true,timeout:120000,maxBuffer:1024*1024});
 if(JSON.parse(stdout).spooled!==true)throw Error('Windows print confirmation unavailable');
}
