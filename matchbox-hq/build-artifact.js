const fs=require('fs'),p=require('path');
const S={now:new Date().toISOString()};
['tasks','agents','activity','decisions','budget','deliverables'].forEach(n=>{
  S[n]=JSON.parse(fs.readFileSync(p.join(__dirname,'state',n+'.json'),'utf8'));});
const out=fs.readFileSync(p.join(__dirname,'artifact-template.html'),'utf8')
  .replace('__STATE__',JSON.stringify(S));
const dest=process.argv[2]||p.join(__dirname,'hq-artifact.html');
fs.writeFileSync(dest,out);
console.log('built',dest,(out.length/1024).toFixed(1)+'kb');
