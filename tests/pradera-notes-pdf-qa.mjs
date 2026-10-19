import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const errors=[];
page.on('pageerror',e=>errors.push('JS: '+e.message));
const check=(ok,label)=>{if(!ok)errors.push(label)};
await page.goto('http://127.0.0.1:8741/celebrity/pradera/',{waitUntil:'domcontentloaded'});
await page.locator('#audio-design-notes').waitFor();
const entries=[
  ['audio','AUDIOBRAVO','AUDIOENDMARKER'],
  ['surround','SURROUNDCHARLIE','SURROUNDENDMARKER'],
  ['network','NETWORKDELTA','NETWORKENDMARKER'],
  ['cameras','CAMERAECHO','CAMERAENDMARKER']
];
for(const [cat,begin,end] of entries){
  const message=begin+'\n'+('Specific room guidance, equipment priorities, prewire allowances and customer requests. ').repeat(42)+'\n'+end;
  await page.locator('#'+cat+'-design-notes').fill(message);
  await page.locator('#'+cat+'-tab-2').click();
  check(await page.locator('#'+cat+'-design-notes').inputValue()===message,cat+' notes lost after tier switch');
}
const clientNote='CLIENTDETAILS\nClient preferences that must remain separate from the four design categories.\nCLIENTENDMARKER';
await page.locator('#selections .fnotes textarea').fill(clientNote);
await page.locator('#selections').scrollIntoViewIfNeeded();
await page.waitForTimeout(150);
const noteBlock=page.locator('#pr-final-design-notes');
check(await noteBlock.isVisible(),'Final Allowances category notes not visible');
check(await page.locator('#pr-final-design-notes .pr-final-notes-entry').count()===4,'Not exactly four category note entries');
for(const [cat,begin,end] of entries){
  const node=page.locator('#pr-final-design-notes [data-notes-system="'+cat+'"]');
  check(await node.count()===1,cat+' category not found');
  const content=await node.textContent();
  check(content?.includes(begin)&&content?.includes(end),cat+' long notes missing');
}
check((await page.locator('#selections .pr-print-client-notes').textContent())===clientNote,'client notes print mirror incomplete');

mkdirSync('qa-results',{recursive:true});
await page.screenshot({path:'qa-results/final-allowances-notes.png'});
const pdf=await page.pdf({format:'Letter',preferCSSPageSize:true,printBackground:true});
writeFileSync('qa-results/final-allowances-with-notes.pdf',pdf);
const printed=execFileSync('pdftotext',['-layout','qa-results/final-allowances-with-notes.pdf','-'],{encoding:'utf8'});
const info=execFileSync('pdfinfo',['qa-results/final-allowances-with-notes.pdf'],{encoding:'utf8'});
const pages=Number(info.match(/^Pages:\s+(\d+)/m)?.[1]||0);
check(pages>=1&&pages<=20,'PDF page count unreasonable: '+pages);
for(const [cat,begin,end] of entries){
  check(printed.includes(begin),cat+' start marker absent from exported PDF');
  check(printed.includes(end),cat+' END OF NOTE missing (clipped PDF)');
}
check(printed.includes('CLIENTDETAILS')&&printed.includes('CLIENTENDMARKER'),'Separate Client Notes omitted from PDF');
check(printed.includes('DESIGN NOTES BY SYSTEM')||printed.includes('Design Notes by System'),'PDF notes heading omitted');
// Print font sizes should be 10–11 pt; not textarea-sized or invisible.
await page.emulateMedia({media:'print'});
const printStyle=await page.locator('#pr-final-design-notes .pr-final-notes-text').first().evaluate(el=>{
  const c=getComputedStyle(el);return {fontSize:c.fontSize,display:c.display,visible:el.getBoundingClientRect().height};
});
check(printStyle.visible>0,'PDF design notes text is not rendered');
check(Math.abs(parseFloat(printStyle.fontSize)-14)<=0.5,'PDF note font not 10.5pt: '+printStyle.fontSize);
await page.emulateMedia({media:'screen'});
await page.setViewportSize({width:390,height:844});
check(await noteBlock.isVisible(),'Mobile Final Allowances category notes not visible');
check(await page.locator('#pr-final-design-notes .pr-final-notes-entry').count()===4,'Mobile Final Allowances notes lost');
await browser.close();
const result={passed:errors.length===0,errors,printPages:pages,fontSize:printStyle.fontSize,pdfBytes:pdf.length};
console.log('PRADERA_DESIGN_NOTES_PDF_QA '+JSON.stringify(result));
if(errors.length)process.exitCode=1;
