const fs=require('node:fs');const path=require('node:path');
const src=path.join(__dirname,'node_modules/three/examples/jsm'),dst=path.join(__dirname,'vendor/addons'),seen=new Set();
function copy(relative){const full=path.resolve(src,relative);if(seen.has(full))return;seen.add(full);const content=fs.readFileSync(full,'utf8'),destination=path.join(dst,path.relative(src,full));fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,content);for(const match of content.matchAll(/from\s+['"]([^'"]+)['"]/g)){if(match[1].startsWith('.'))copy(path.relative(src,path.resolve(path.dirname(full),match[1])))} }
fs.mkdirSync(path.join(__dirname,'vendor'),{recursive:true});
for(const name of ['three.module.js','three.core.js'])fs.copyFileSync(path.join(__dirname,'node_modules/three/build',name),path.join(__dirname,'vendor',name));
fs.copyFileSync(path.join(__dirname,'node_modules/three/LICENSE'),path.join(__dirname,'vendor/LICENSE'));
for(const entry of ['postprocessing/EffectComposer.js','postprocessing/RenderPass.js','postprocessing/UnrealBloomPass.js','postprocessing/OutputPass.js'])copy(entry);
console.log(`Vendored ${seen.size} local postprocessing modules.`);
