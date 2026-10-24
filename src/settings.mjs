import {readFile,writeFile,mkdir,chmod} from 'node:fs/promises';
import {searchYuanbao} from './yuanbao.mjs';
const configFile=new URL('../.local/config.json',import.meta.url);
const dir=new URL('../.local/',import.meta.url);
async function config(){try{return JSON.parse(await readFile(configFile,'utf8'))}catch(e){if(e.code==='ENOENT')return {};throw e}}
function json(res,code,data){res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data))}
export async function serveSettings(req,res,{nonce,origin}){
 if(req.method==='GET'&&req.url==='/settings'){
  const html=(await readFile(new URL('../public/settings.html',import.meta.url),'utf8')).replaceAll('__CSRF__',nonce);
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});return res.end(html);
 }
 if(req.method==='GET'&&req.url==='/settings/status'){
  const c=await config();return json(res,200,{configured:Boolean(process.env.TENCENTCLOUD_WSA_APIKEY||c.apiKey),verifiedAt:c.verifiedAt||null});
 }
 if(req.method==='POST'&&req.url==='/settings/connect'){
  if(req.headers.origin!==origin||req.headers['x-csrf-token']!==nonce)return json(res,403,{error:'请刷新本机配置页后重试。'});
  const parts=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>8000)return json(res,413,{error:'输入过长。'});parts.push(chunk)}
  const body=JSON.parse(Buffer.concat(parts).toString()),secret=String(body.secret||'').trim();
  if(secret.length<8||secret.length>4096||/\s/.test(secret))return json(res,400,{error:'请填写完整服务 API Key，不要包含空格或换行。'});
  if(body.freeQuotaConfirmed!==true)return json(res,400,{error:'请先在官方控制台确认可用的免费搜索额度。'});
  let result;
  try{result=await searchYuanbao('元宝搜索 服务 API KEY 官方文档',secret)}
  catch(e){return json(res,502,{error:e.message.startsWith('元宝搜索')?e.message:'连接未完成，请检查网络和服务状态。'})}
  const verifiedAt=new Date().toISOString();await mkdir(dir,{recursive:true,mode:0o700});await chmod(dir,0o700);
  await writeFile(configFile,JSON.stringify({apiKey:secret,verifiedAt},null,2)+'\n',{mode:0o600});await chmod(configFile,0o600);
  return json(res,200,{message:`连接成功，返回 ${result.pages.length} 条结果。本次使用 1 次搜索。`,verifiedAt});
 }
 return json(res,404,{error:'页面不存在。'});
}
