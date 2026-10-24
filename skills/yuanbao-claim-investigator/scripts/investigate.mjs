import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {evaluateCard, validateNeed} from '../../../src/evidencecard.js';
const args=process.argv.slice(2), options={};
for(let i=0;i<args.length;i++){
 if(args[i]==='--help'){console.log('node investigate.mjs (--claim TEXT --need TEXT [--domain HOST] | --case 01|02|03 [--need TEXT]) [--output FILE]\n新调查必须有具体需求，最多3次元宝搜索；已有案例回放不消耗搜索。');process.exit(0)}
 if(!['--claim','--need','--domain','--case','--output'].includes(args[i])||!args[i+1]){console.error('参数无效；请使用 --help。');process.exit(1)}
 options[args[i].slice(2)]=args[++i];
}
if(Boolean(options.claim)===Boolean(options.case)){console.error('请提供 --claim 或 --case 其中一项。');process.exit(1)}
if(options.claim&&!validateNeed(options.need).valid){console.error(validateNeed(options.need).error);process.exit(1)}
if(options.need&&!validateNeed(options.need).valid){console.error(validateNeed(options.need).error);process.exit(1)}
const base='http://127.0.0.1:4191';
try{
 let response;
 if(options.case){
  if(!['01','02','03'].includes(options.case))throw new Error('案例编号须为 01、02 或 03。');
  response=await fetch(base+'/cases/'+options.case,{signal:AbortSignal.timeout(10000)});
 }else{
  const page=await fetch(base,{signal:AbortSignal.timeout(10000)}).then(r=>r.text());
  const nonce=page.match(/<script nonce="([a-f0-9]+)">/)?.[1];
  if(!nonce)throw new Error('本机查证服务版本不兼容。');
  response=await fetch(base+'/investigate',{method:'POST',signal:AbortSignal.timeout(90000),headers:{Origin:base,'Content-Type':'application/json','X-CSRF-Token':nonce},body:JSON.stringify({claim:options.claim,domain:options.domain||'',need:options.need})});
 }
 const data=await response.json();
 if(!response.ok)throw new Error(data.error||'查询未完成。');
 const applicability=data.card&&options.need?evaluateCard(data.card,options.need):null;
 const map=new Map();
 for(const [i,round]of data.rounds.entries())for(const page of round.pages){
  if(map.has(page.url)){map.get(page.url).rounds.push(i+1);continue;}
  map.set(page.url,{id:'S'+String(map.size+1).padStart(2,'0'),...page,rounds:[i+1]});
 }
 const output={...data,need:data.need||options.need||'',evidenceSources:[...map.values()],applicability};
 if(options.output){
  const path=resolve(options.output);await writeFile(path,JSON.stringify(output,null,2)+'\n');
  console.log(JSON.stringify({output:path,claim:data.claim,need:data.need||options.need||'',hasCard:Boolean(data.card),applicability,sourceCount:map.size,searchRequests:options.case?0:data.rounds.length,rounds:data.rounds.map(r=>({label:r.label,status:r.status,count:r.pages.length}))},null,2));
 }else console.log(JSON.stringify(output,null,2));
}catch(error){console.error(error.cause?.code==='ECONNREFUSED'?'本机查证服务未运行。请先在侦探项目目录运行 npm start。':error.message);process.exitCode=1;}
