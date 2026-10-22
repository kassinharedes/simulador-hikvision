// Fotos escolhidas pelo usuário ficam no IndexedDB deste navegador.
const fotosPersonalizadas = new Map();
const fotosObjectURLs = new Map();
const chaveFoto = p => String(p.uid || (String(p.sap || "") + "|" + String(p.part || "")));
let bancoFotos = null;
function abrirBancoFotos(){
  return new Promise((resolve,reject)=>{
    if(!("indexedDB" in window)){reject(new Error("Armazenamento indisponível"));return;}
    const req=indexedDB.open("simuladorHikvisionFotos",1);
    req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains("fotos"))db.createObjectStore("fotos");};
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}
function fotoTransacao(chave,blob){
  return new Promise((resolve,reject)=>{
    const tx=bancoFotos.transaction("fotos","readwrite");
    const req=blob===null?tx.objectStore("fotos").delete(chave):tx.objectStore("fotos").put(blob,chave);
    tx.oncomplete=()=>resolve();
    tx.onerror=()=>reject(tx.error);
    req.onerror=()=>reject(req.error);
  });
}
function fotoSrc(p){
  const key=chaveFoto(p);
  return fotosObjectURLs.get(key)||p.image||"";
}
function fotoProduto(p){
  const key=chaveFoto(p),src=fotoSrc(p),custom=fotosPersonalizadas.has(key);
  // Não colocar nomes de arquivos do usuário em atributos inline.
  return `<div class="product-photo">${src?`<img src="${src}" alt="Foto do produto" loading="lazy">`:`<div class="no-photo">SEM FOTO</div>`}
    <button type="button" class="foto-plus" data-foto-id="${encodeURIComponent(key)}" title="Adicionar ou substituir foto" aria-label="Adicionar ou substituir foto">+</button>
    ${custom?`<button type="button" class="foto-remover" data-remover-id="${encodeURIComponent(key)}" title="Remover foto personalizada" aria-label="Remover foto personalizada">×</button>`:""}
  </div>`;
}
function selecionarFoto(chave){
  const input=document.getElementById("uploadFotoSKU");
  input.value="";
  input.dataset.chave=chave;
  input.click();
}
async function carregarFotos(){
  try{
    bancoFotos=await abrirBancoFotos();
    const tx=bancoFotos.transaction("fotos","readonly"),req=tx.objectStore("fotos").openCursor();
    req.onsuccess=()=>{
      const cursor=req.result;
      if(cursor){
        if(cursor.value instanceof Blob){
          fotosPersonalizadas.set(cursor.key,cursor.value);
          fotosObjectURLs.set(cursor.key,URL.createObjectURL(cursor.value));
        }
        cursor.continue();
      }else if(typeof renderProducts==="function")renderProducts();
    };
  }catch(err){console.warn("Fotos locais indisponíveis:",err);}
}
document.addEventListener("DOMContentLoaded",()=>{
  const input=document.createElement("input");
  input.id="uploadFotoSKU";input.type="file";input.accept="image/png,image/jpeg,image/webp";input.hidden=true;
  document.body.appendChild(input);
  input.addEventListener("change",async()=>{
    const file=input.files&&input.files[0],key=input.dataset.chave;
    if(!file||!key)return;
    if(!["image/png","image/jpeg","image/webp"].includes(file.type)){alert("Selecione uma imagem JPG, PNG ou WebP.");return;}
    if(file.size>8*1024*1024){alert("Escolha uma foto de até 8 MB.");return;}
    if(!bancoFotos){alert("O navegador não permite salvar fotos neste momento.");return;}
    try{
      await fotoTransacao(key,file);
      const anterior=fotosObjectURLs.get(key);if(anterior)URL.revokeObjectURL(anterior);
      fotosPersonalizadas.set(key,file);
      fotosObjectURLs.set(key,URL.createObjectURL(file));
      renderProducts();
    }catch(err){alert("Não foi possível salvar a foto. Verifique o espaço disponível no navegador.");}
  });
  document.addEventListener("click",async e=>{
    const plus=e.target.closest("[data-foto-id]");
    if(plus){selecionarFoto(decodeURIComponent(plus.dataset.fotoId));return;}
    const rem=e.target.closest("[data-remover-id]");
    if(rem){
      const key=decodeURIComponent(rem.dataset.removerId);
      if(!confirm("Remover a foto personalizada deste produto?"))return;
      try{
        if(!bancoFotos)throw Error("Banco indisponível");
        await fotoTransacao(key,null);
        const url=fotosObjectURLs.get(key);if(url)URL.revokeObjectURL(url);
        fotosObjectURLs.delete(key);fotosPersonalizadas.delete(key);renderProducts();
      }catch(err){alert("Não foi possível remover a foto.");}
    }
  });
  carregarFotos();
});

const $=x=>document.getElementById(x),fields=["produto","valor","ipi","st","credito","margem","icms","tributos","frete","comissao","desconto"],nums=fields.slice(1),n=x=>parseFloat($(x).value)||0,brl=x=>x.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
function calc(){let val=n("valor"),ipi=val*n("ipi")/100,br=val+ipi+n("st"),cr=val*n("credito")/100,liq=br-cr,p=(n("margem")+n("icms")+n("tributos")+n("frete")+n("comissao"))/100,v=0,pr=0;if(p>=1)$("alerta").textContent="A soma dos percentuais deve ser menor que 100%.";else{$("alerta").textContent="";v=liq/(1-p);pr=v*(1-n("desconto")/100)}let m=liq?v/liq-1:0,mp=liq?pr/liq-1:0;$("rIpi").textContent=brl(ipi);$("rBruto").textContent=brl(br);$("rCredito").textContent=brl(cr);$("rLiquido").textContent=brl(liq);$("venda").textContent=brl(v);$("promo").textContent=brl(pr);$("markup").textContent=(m*100).toFixed(2).replace(".",",")+"%";$("markupX").textContent=(m+1).toFixed(2).replace(".",",")+"x";$("markupP").textContent=(mp*100).toFixed(2).replace(".",",")+"%";$("markupPX").textContent=(mp+1).toFixed(2).replace(".",",")+"x";return{liq,v,pr,m,mp}}
nums.forEach(x=>$(x).oninput=calc);
function initFilters(){
 const marca=$("fMarca"),cat=$("fCategoria"),origem=$("fOrigem");
 [...new Set(PRODUCTS.map(p=>p.brand).filter(Boolean))].sort().forEach(v=>marca.insertAdjacentHTML("beforeend",`<option value="${v}">${v}</option>`));
 [...new Set(PRODUCTS.map(p=>p.categoria).filter(Boolean))].sort().forEach(v=>cat.insertAdjacentHTML("beforeend",`<option value="${v}">${v}</option>`)); [...new Set(PRODUCTS.flatMap(p=>p.abasOutubro||[]))].sort().forEach(v=>origem.insertAdjacentHTML("beforeend",`<option value="${v}">${v}</option>`));
}
function renderProducts(){
 let q=$("buscaProd").value.toLowerCase().trim(),marca=$("fMarca").value,origem=$("fOrigem").value,online=$("fOnline").value,cat=$("fCategoria").value,tabela=$("fTabela").value;
 let arr=PRODUCTS.filter(p=>{
   let text=[p.sap,p.ean,p.part,p.brand,p.categoria,p.resolucao,p.descricao].join(" ").toLowerCase();
   let okQ=!q||text.includes(q);
   let okM=!marca||p.brand===marca; let okR=!origem||(((p.abasOutubro||[]).includes(origem) || (origem==="Tabela Alarme Setembro"&&p.alarm)||origem==="Distribuição Outubro 2026"&&p.outubro2026));
   let okO=!online||(online==="sim"?!!p.online:!p.online);
   let okC=!cat||p.categoria===cat;
   let okT=!tabela||(Number(p[tabela])>0);
   return okQ&&okM&&okR&&okO&&okC&&okT;
 });
 $("contador").textContent=`Exibindo ${arr.length} de ${PRODUCTS.length} produtos • Online ${PRODUCTS.filter(p=>p.online).length}`;
 $("produtos").innerHTML=arr.map(p=>`<div class="product-card"><div class="product-layout">${fotoProduto(p)}<div class="product-info"><div class="meta"><b>${p.brand}</b> • SAP ${p.sap} • ${p.categoria} • ${p.resolucao} ${p.online?'<span class="online">VENDA ONLINE</span>':""} ${p.alarm?'<span class="alarmbadge">ALARME SETEMBRO</span>':""} ${p.abasOutubro?.length?`<span class="alarmbadge">${p.abasOutubro.join(" · ")}</span>`:""} ${p.outubro2026?'<span class="alarmbadge">PREÇOS OUT/26</span>':""}</div><h3>${p.part}</h3><div class="desc">${p.descricao}</div><div class="prices"><div class="price">PV<b>${brl(p.PV)}</b></div><div class="price">PP<b>${brl(p.PP)}</b></div><div class="price">PSD<b>${brl(p.PSD)}</b></div><div class="price">PSCF<b>${brl(p.PSCF)}</b></div>${p.online?`<div class="price ecom">PV E-COM<b>${brl(p.PV_ECOM)}</b></div><div class="price ecom">PSCF E-COM<b>${brl(p.PSCF_ECOM)}</b></div>`:""}</div><div class="choose"><select id="tipo-${p.uid}"><option>PV</option><option>PP</option><option>PSD</option><option>PSCF</option>${p.online?'<option value="PV_ECOM">PV E-COM</option><option value="PSCF_ECOM">PSCF E-COM</option>':""}</select><button onclick="usarProduto(${p.uid})">Usar na calculadora</button></div></div></div></div>`).join("");
}
$("buscaProd").oninput=renderProducts;
["fMarca","fOrigem","fOnline","fCategoria","fTabela"].forEach(id=>$(id).onchange=renderProducts);
$("limparFiltros").onclick=()=>{$("buscaProd").value="";["fMarca","fOrigem","fOnline","fCategoria","fTabela"].forEach(id=>$(id).value="");renderProducts();};
window.usarProduto=uid=>{let p=PRODUCTS.find(x=>x.uid===uid),tipo=$("tipo-"+uid).value;$("produto").value=`${p.sap} | ${p.part} | ${tipo}`;$("valor").value=p[tipo].toFixed(2);calc();show("calc")};
const key="simuladorPrecoHistoricoV4",get=()=>JSON.parse(localStorage.getItem(key)||"[]"),set=a=>localStorage.setItem(key,JSON.stringify(a));
$("salvar").onclick=()=>{let r=calc(),inp={};fields.forEach(f=>inp[f]=$(f).value);let a=get();a.unshift({id:Date.now(),data:new Date().toLocaleString("pt-BR"),produto:$("produto").value||"Sem SKU",custo:r.liq,venda:r.v,markup:r.m*100,desconto:n("desconto"),promo:r.pr,inp});set(a);renderHist();$("salvar").textContent="✓ Salvo";setTimeout(()=>$("salvar").textContent="💾 Salvar simulação",1000)};
function renderHist(){let q=$("buscaHist").value.toLowerCase(),a=get().filter(x=>x.produto.toLowerCase().includes(q));$("lista").innerHTML=a.map(x=>`<tr><td>${x.data}</td><td><b>${x.produto}</b></td><td>${brl(x.custo)}</td><td>${brl(x.venda)}</td><td>${x.markup.toFixed(2).replace(".",",")}%</td><td>${x.desconto.toFixed(2).replace(".",",")}%</td><td><b>${brl(x.promo)}</b></td><td><button class="sm" onclick="reabrir(${x.id})">Reabrir</button> <button class="sm del" onclick="excluir(${x.id})">Excluir</button></td></tr>`).join("");$("vazio").textContent=a.length?"":"Nenhuma simulação encontrada."}
$("buscaHist").oninput=renderHist;window.excluir=id=>{set(get().filter(x=>x.id!==id));renderHist()};window.reabrir=id=>{let x=get().find(y=>y.id===id);if(!x)return;fields.forEach(f=>$(f).value=x.inp[f]??"");calc();show("calc")};
$("apagarTudo").onclick=()=>{if(confirm("Apagar todo o histórico?")){set([]);renderHist()}};
$("csv").onclick=()=>{let a=get();if(!a.length)return alert("Não há histórico.");let rows=[["Data","Produto/SKU","Custo Liquido","Preco Venda","Markup %","Desconto %","Preco Promocional"],...a.map(x=>[x.data,x.produto,x.custo.toFixed(2),x.venda.toFixed(2),x.markup.toFixed(2),x.desconto.toFixed(2),x.promo.toFixed(2)])],csv="\ufeff"+rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(";")).join("\n"),b=new Blob([csv],{type:"text/csv"}),u=URL.createObjectURL(b),l=document.createElement("a");l.href=u;l.download="historico_precos.csv";l.click();URL.revokeObjectURL(u)};
$("copiar").onclick=async()=>{let r=calc();await navigator.clipboard.writeText(`${$("produto").value||"Produto"}\nVenda: ${brl(r.v)}\nMarkup: ${(r.m*100).toFixed(2)}%\nPromocional: ${brl(r.pr)}\nMarkup promo: ${(r.mp*100).toFixed(2)}%`)};
$("nova").onclick=()=>{$("produto").value="";$("valor").value="";calc()};
function show(id){document.querySelectorAll(".page,.tab").forEach(x=>x.classList.remove("active"));$(id).classList.add("active");document.querySelector(`[data-p="${id}"]`).classList.add("active");if(id==="hist")renderHist();if(id==="prod")renderProducts()}document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>show(b.dataset.p));
if("serviceWorker"in navigator)navigator.serviceWorker.register("sw.js").catch(()=>{});initFilters();calc();renderProducts();renderHist();
window.ampliarFoto=(src,nome)=>{
 const anterior=document.getElementById("fotoModal"); if(anterior) anterior.remove();
 const modal=document.createElement("div"); modal.id="fotoModal"; modal.className="photo-modal";
 modal.innerHTML=`<div class="photo-modal-box"><button class="photo-close" onclick="document.getElementById('fotoModal').remove()">×</button><img src="${src}" alt="${nome}"><b>${nome}</b></div>`;
 modal.onclick=e=>{if(e.target===modal)modal.remove()}; document.body.appendChild(modal);
};
