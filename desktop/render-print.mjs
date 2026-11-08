import { chromium } from '../backend/node_modules/playwright-core/index.mjs';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { renderPrintHTML } from '../backend/src/modules/printing.service.js';
export async function renderPrintJob(job,{chrome,directory}){
  await mkdir(directory,{recursive:true});const browser=await chromium.launch({executablePath:chrome,headless:true});
  try{
    const width=job.format==='A4'?210:job.format==='40x30'?40:job.format==='50x30'?50:parseInt(job.format,10),pageHeight=job.format==='A4'?297:job.kind==='labels'?30:1000,pixels=96/25.4;
    const page=await browser.newPage({viewport:{width:Math.ceil(width*pixels),height:1},deviceScaleFactor:2});await page.route('**/*',route=>route.abort());await page.emulateMedia({media:'print'});const jobs=job.kind==='labels'&&job.format!=='A4'?job.payload.labels.map(label=>({...job,payload:{...job.payload,labels:[label]}})):[job],pages=[];
    for(const [index,part] of jobs.entries()){await page.setContent(renderPrintHTML(part),{waitUntil:'load'});const height=await page.evaluate(()=>Math.ceil(document.documentElement.scrollHeight));if(height>100000)throw Error('Print document too large');
      for(let offset=0;offset<height;offset+=Math.floor(pageHeight*pixels)){const slice=Math.min(Math.floor(pageHeight*pixels),height-offset),image=join(directory,`${index}-${offset}.png`);await page.screenshot({path:image,clip:{x:0,y:offset,width:Math.ceil(width*pixels),height:slice},fullPage:true});pages.push({image,widthMm:width,heightMm:job.kind==='labels'&&job.format!=='A4'?30:job.format==='A4'?297:slice/pixels,contentHeightMm:slice/pixels});}}
    return pages;
  }finally{await browser.close();}
}
