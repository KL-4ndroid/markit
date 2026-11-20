// Genuine ES256/x5c chain for the official SDK's isolated tests. Never an Apple trust root.
import {execFileSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,readFileSync,rmSync,realpathSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname,resolve} from 'node:path';
import {sign,X509Certificate} from 'node:crypto';
export function createAppleSignedFixture(){
 const base=realpathSync(tmpdir()),directory=mkdtempSync(join(base,'stallight-apple-'));
 const openssl=process.platform==='win32'?'C:/Program Files/Git/usr/bin/openssl.exe':'openssl';
 if(process.platform==='win32'&&!existsSync(openssl))throw new Error('Official Git OpenSSL is required for the B04 fixture');
 const run=(args:string[])=>execFileSync(openssl,args,{cwd:directory,stdio:'pipe',timeout:20000});
 try{
  for(const [name,ca,extra]of [['root',true,''],['intermediate',true,'1.2.840.113635.100.6.2.1=DER:05:00'],['leaf',false,'1.2.840.113635.100.6.11.1=DER:05:00']] as const){
   writeFileSync(join(directory,name+'.cnf'),`[req]\ndistinguished_name=dn\nprompt=no\nx509_extensions=ext\n[dn]\nCN=B04 local ${name}\n[ext]\nbasicConstraints=critical,CA:${ca?'TRUE':'FALSE'}\nkeyUsage=critical,${ca?'keyCertSign,cRLSign':'digitalSignature'}\nsubjectKeyIdentifier=hash\n${extra}\n`);
   run(['req','-new','-newkey','ec','-pkeyopt','ec_paramgen_curve:P-256','-nodes','-keyout',name+'.key','-out',name+'.csr','-config',name+'.cnf']);
   if(name==='root')run(['req','-x509','-key',name+'.key','-in',name+'.csr','-out',name+'.pem','-days','2','-config',name+'.cnf','-extensions','ext']);
   else {const parent=name==='leaf'?'intermediate':'root';run(['x509','-req','-in',name+'.csr','-CA',parent+'.pem','-CAkey',parent+'.key','-CAcreateserial','-out',name+'.pem','-days','2','-extfile',name+'.cnf','-extensions','ext']);}
  }
  const certs=['leaf','intermediate','root'].map(n=>new X509Certificate(readFileSync(join(directory,n+'.pem'))));
  const key=readFileSync(join(directory,'leaf.key'));
  return {root:certs[2].raw,sign(payload:object){const header=Buffer.from(JSON.stringify({alg:'ES256',x5c:certs.map(c=>c.raw.toString('base64'))})).toString('base64url');const body=Buffer.from(JSON.stringify(payload)).toString('base64url');const content=header+'.'+body;return content+'.'+sign('sha256',Buffer.from(content),{key,dsaEncoding:'ieee-p1363'}).toString('base64url');},
   close(){const target=realpathSync(directory);if(dirname(target)!==base||!target.startsWith(resolve(base,'stallight-apple-')))throw new Error('Fixture path escaped temp root');rmSync(target,{recursive:true,force:true});}};
 }catch(error){if(dirname(directory)===base&&directory.startsWith(join(base,'stallight-apple-')))rmSync(directory,{recursive:true,force:true});throw error;}
}
