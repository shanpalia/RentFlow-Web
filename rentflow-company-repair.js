(function(){
'use strict';
const KEY='rentflow_web_v5';
function rfLoad(){try{return JSON.parse(localStorage.getItem(KEY))||null}catch(e){return null}}
function rfSave(x){localStorage.setItem(KEY,JSON.stringify(x))}
function rfReadFile(input,cb){const f=input&&input.files&&input.files[0];if(!f)return;const r=new FileReader();r.onload=()=>cb(r.result);r.readAsDataURL(f)}
function rfField(id){const e=document.getElementById(id);return e?e.value.trim():''}
window.addEventListener('click',function(e){
  const b=e.target.closest('[data-action="save-shop"]');
  if(!b)return;
  setTimeout(function(){
    const d=rfLoad(); if(!d)return;
    d.shop=d.shop||{};
    ['name','owner','mobile','alternateMobile','email','businessType','address','city','state','pin','gstin','pan','invoicePrefix','bankName','accountNumber','ifsc','upi'].forEach(k=>{
      const id={name:'shopName',owner:'owner',mobile:'mobile',alternateMobile:'alternateMobile',email:'email',businessType:'businessType',address:'address',city:'city',state:'state',pin:'pin',gstin:'gstin',pan:'pan',invoicePrefix:'invoicePrefix',bankName:'bankName',accountNumber:'accountNumber',ifsc:'ifsc',upi:'upi'}[k];
      const el=document.getElementById(id); if(el)d.shop[k]=el.value.trim();
    });
    if(!d.shop.invoicePrefix)d.shop.invoicePrefix='INV';
    rfSave(d);
  },0);
});
window.addEventListener('change',function(e){
  if(e.target.id==='logoFile')rfReadFile(e.target,function(src){
    const d=rfLoad();if(!d)return;d.shop=d.shop||{};d.shop.logo=src;rfSave(d);
    const p=document.getElementById('logoPreview');if(p)p.innerHTML='<img src="'+src+'">';
  });
  if(e.target.id==='signatureFile')rfReadFile(e.target,function(src){
    const d=rfLoad();if(!d)return;d.shop=d.shop||{};d.shop.signature=src;rfSave(d);
  });
});
const style=document.createElement('style');style.textContent='.content{min-height:calc(100vh - 64px)}.page-title{position:sticky;top:64px;background:var(--bg);z-index:10;padding:4px 0 14px}.card{width:100%}.company-logo-upload{display:flex;align-items:center;gap:14px}.company-logo-upload .logo{width:110px;height:110px}.full-page-form{min-height:calc(100vh - 130px)}';document.head.appendChild(style);
})();