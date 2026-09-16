import fs from "node:fs/promises";
const API=process.env.FLIPACLIP_API_URL??"http://localhost:8787";
const storyboard=JSON.parse(await fs.readFile(new URL("../input/storyboard/storyboard.json",import.meta.url),"utf8"));
const p=await fetch(`${API}/api/projects`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:storyboard.project_name??"Exemple requin",width:1080,height:1920,fps:12})}).then(r=>r.json());
function sec(tc){const [m,s]=tc.split(":");return Number(m)*60+Number(s)}
for(const plan of storyboard.plans??[]){await fetch(`${API}/api/projects/${p.id}/frames`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({duration_ms:Math.max(1,Math.round((sec(plan.end)-sec(plan.start))*1000)),meta:{plan}})})}
console.log(p.id);
