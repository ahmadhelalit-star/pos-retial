import {chromium} from '../backend/node_modules/playwright-core/index.mjs';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';

export async function saveReceiptPDF(pages,id,{directory,copies=1,chrome='C:/Program Files/Google/Chrome/Application/chrome.exe'}){
 if(!/^[a-f0-9-]{36}$/.test(id)||!pages.length||!Number.isInteger(copies)||copies<1||copies>5)throw Error('Invalid PDF print job');
 const folder=join(directory,'pdf');await mkdir(folder,{recursive:true});
 const width=pages[0].widthMm,height=Math.max(...pages.map(page=>page.heightMm));
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw Error('Invalid PDF paper size');
 const images=await Promise.all(pages.map(async page=>`<section><img style="width:${width}mm;height:${page.contentHeightMm??page.heightMm}mm" src="data:image/png;base64,${(await readFile(page.image)).toString('base64')}"></section>`));
 const browser=await chromium.launch({executablePath:chrome,headless:true});
 try{const page=await browser.newPage();await page.route('**/*',route=>route.abort());await page.setContent(`<style>@page{size:${width}mm ${height}mm;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0}section{width:${width}mm;height:${height}mm;break-after:page;overflow:hidden}section:last-child{break-after:auto}img{display:block}</style>${Array(copies).fill(images.join('')).join('')}`,{waitUntil:'load'});const data=await page.pdf({preferCSSPageSize:true,printBackground:true});await writeFile(join(folder,id+'.pdf'),data,{flag:'wx',mode:0o600});return {pdf:true};}finally{await browser.close();}
}
