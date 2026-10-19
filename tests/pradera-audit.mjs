import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
const browser = await chromium.launch({ headless: true });
const base = 'http://127.0.0.1:8741/celebrity/pradera/';
const sizes=[['desktop-1440',1440,900,false],['laptop-1280',1280,720,false],['phone-390',390,844,true],['phone-375',375,667,true],['tablet-768',768,1024,true]];
const systems={audio:4,surround:3,network:3,cameras:3};
const errors=[],measurements=[];
function assert(value,message){if(!value)errors.push(message)}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
for (const [name,width,height,mobile] of sizes){
  const ctx=await browser.newContext({viewport:{width,height},hasTouch:mobile,isMobile:mobile,deviceScaleFactor:1});
  const page=await ctx.newPage(); const runtimeErrors=[];
  page.on('pageerror',e=>runtimeErrors.push(e.message));
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.waitForSelector('#surround .study-stage svg.study-tier-1',{timeout:25000});
  await wait(450);
  const state=await page.evaluate(()=>{
    const wrap=document.querySelector('#top');
    return {overflow:document.documentElement.scrollWidth-window.innerWidth,sections:[...wrap.querySelectorAll('section.sec.paper')].map(s=>({id:s.id,height:Math.round(s.getBoundingClientRect().height),scrollHeight:s.scrollHeight,clip:getComputedStyle(s).overflowY}))};
  });
  assert(state.overflow<=2,name+' horizontal overflow: '+state.overflow);
  for(const [sys,num] of Object.entries(systems)){
    let section=page.locator('#'+sys);
    assert((await section.getAttribute('class')).includes('sel-1'),name+' '+sys+' default not Standard');
    for(let tier=1;tier<=num;tier++){
      await page.locator('#'+sys+'-tab-'+tier).click();
      assert((await section.getAttribute('class')).includes('sel-'+tier),name+' '+sys+' tier '+tier+' inactive');
      const isShown=await page.locator('#'+sys+' .study-tier-'+tier).evaluate(e=>getComputedStyle(e).display!=='none');
      assert(isShown,name+' '+sys+' tier '+tier+' missing diagram');
    }
    if(!mobile){
      await page.locator('#'+sys+'-tab-1').click();
      const field=page.locator('#'+sys+'-design-notes');
      const panel=page.locator('#'+sys+' .vdet');
      assert(await field.isVisible(),name+' '+sys+' note hidden');
      const p=await panel.boundingBox(),n=await field.boundingBox();
      if(p&&n){
        assert(n.y>=p.y+p.height+15,name+' '+sys+' notes overlap card: '+JSON.stringify({p,n}));
        assert(Math.abs(n.width-p.width)<3,name+' '+sys+' notes wrong width');
      }
      await field.fill('Retained '+sys+' preference');
      const initialHeight=await field.evaluate(el=>el.getBoundingClientRect().height);
      assert(initialHeight>=189,name+' '+sys+' notes field too small: '+initialHeight);
      await field.fill(('Design meeting notes: discuss speaker zones, wiring, room priorities and allowances. ').repeat(28));
      const growing=await field.evaluate(el=>({height:el.getBoundingClientRect().height,visible:el.clientHeight,scroll:el.scrollHeight}));
      assert(growing.height>initialHeight,name+' '+sys+' notes box failed to expand');
      assert(growing.scroll<=growing.visible+3,name+' '+sys+' typed notes hidden');
      await field.fill('Retained '+sys+' preference');
      await page.locator('#'+sys+'-tab-2').click();
      assert(await field.inputValue()==='Retained '+sys+' preference',name+' '+sys+' notes lost on tier change');
    }else{
      assert(!(await page.locator('#'+sys+'-design-notes').isVisible()),name+' '+sys+' desktop-only notes showing on phone');
    }
  }
  assert(await page.locator('input[placeholder="Type full name to sign"]').count()===0,name+' obsolete signature remains');
  await page.locator('#selections').scrollIntoViewIfNeeded();
  const foot=await page.evaluate(()=>{
    let rect=s=>{let n=document.querySelector(s);if(!n||getComputedStyle(n).display==='none')return null;const r=n.getBoundingClientRect();return {top:r.top,bottom:r.bottom}};
    return {contact:rect('#selections .fact'),prepared:rect('#selections > .pbw')};
  });
  if(mobile){assert(!!foot.contact&&!!foot.prepared,name+' expected footer/contact missing');if(foot.contact&&foot.prepared)assert(foot.prepared.top>=foot.contact.bottom+10,name+' footer overlaps contacts');}
  mkdirSync('qa-results',{recursive:true});
  if(['desktop-1440','phone-390'].includes(name)){
    await page.locator('#surround').scrollIntoViewIfNeeded();
    await page.screenshot({path:'qa-results/'+name+'-surround.png'});
    if(name==='desktop-1440'){
      const surroundPreview=await page.locator('#surround').screenshot({type:'jpeg',quality:56});
      console.log('PRADERA_SURROUND_PREVIEW_JPEG='+surroundPreview.toString('base64'));
    }
    await page.locator('#network').scrollIntoViewIfNeeded();
    await page.screenshot({path:'qa-results/'+name+'-network.png'});
    if(name==='desktop-1440'){
      const networkPreview=await page.locator('#network').screenshot({type:'jpeg',quality:56});
      console.log('PRADERA_NETWORK_PREVIEW_JPEG='+networkPreview.toString('base64'));
    }
  }
  await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
  await wait(150);
  if(mobile){
    const s=await ctx.newCDPSession(page);
    try{
      const cx=width/2,y1=height*.75,y2=height*.25;
      await s.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:cx,y:y1}]});
      for(let step=1;step<=6;step++)await s.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:cx,y:y1+(y2-y1)*step/6}]});
      await s.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      await wait(800);
      const y=await page.locator('#audio').evaluate(e=>e.getBoundingClientRect().top);
      assert(Math.abs(y)<16,name+' touch swipe did not catch first section: '+Math.round(y));
    }catch(e){errors.push(name+' touch check '+e.message)}
  } else {
    await page.mouse.move(width/2,height/2);
    await page.mouse.wheel(0,500);
    await wait(850);
    const y=await page.locator('#audio').evaluate(e=>e.getBoundingClientRect().top);
    assert(Math.abs(y)<16,name+' desktop wheel missed first section: '+Math.round(y));
    const expected=['pradera-cover','audio','surround','network','cameras','selections'];
    // Dispatch inertial wheel tails: only the FIRST event may advance a section.
    for(let target=2;target<expected.length;target++){
      await wait(465);
      await page.mouse.wheel(0,310);
      await page.mouse.wheel(0,80);
      await page.mouse.wheel(0,15);
      await wait(620);
      for(let ix=0;ix<expected.length;ix++){
        const pos=await page.locator('#'+expected[ix]).evaluate(e=>e.getBoundingClientRect().top);
        if(ix===target)assert(Math.abs(pos)<18,name+' forward skipped '+expected[target]+': '+Math.round(pos));
      }
    }
    for(let target=expected.length-2;target>=0;target--){
      await wait(465);
      await page.mouse.wheel(0,-310);
      await page.mouse.wheel(0,-80);
      await page.mouse.wheel(0,-15);
      await wait(620);
      const pos=await page.locator('#'+expected[target]).evaluate(e=>e.getBoundingClientRect().top);
      assert(Math.abs(pos)<18,name+' backward skipped '+expected[target]+': '+Math.round(pos));
    }
  }
  assert(runtimeErrors.length===0,name+' JS errors: '+runtimeErrors.join(' | '));
  measurements.push({name,state,foot,runtimeErrors});
  await ctx.close();
}
await browser.close();
writeFileSync('qa-results/audit.json',JSON.stringify({errors,measurements},null,2));
console.log('PRADERA_QA_RESULT '+JSON.stringify({passed:errors.length===0,errors,measurements:measurements.map(x=>({name:x.name,overflow:x.state.overflow,sections:x.state.sections,foot:x.foot}))}));
if(errors.length)process.exitCode=1;
