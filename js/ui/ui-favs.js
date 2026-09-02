"use strict";
/* ================= FAVORIS ================= */
function getFavs(){ return store.get('pc_favs')||[]; }
function saveFavs(list){ store.set('pc_favs',list); }
function isFav(loc){ return getFavs().some(f=>Math.abs(f.lat-loc.lat)<0.01&&Math.abs(f.lon-loc.lon)<0.01); }
function renderFavButton(){
  const btn=$('#favBtn');
  btn.classList.toggle('on',isFav(state.loc));
  btn.title=isFav(state.loc)?'Retirer des favoris':'Ajouter aux favoris';
}
function renderFavs(){
  const list=getFavs(), wrap=$('#favs');
  if(!list.length){ wrap.innerHTML=''; return; }
  wrap.innerHTML=list.map((f,i)=>{
    const active=(Math.abs(f.lat-state.loc.lat)<0.01&&Math.abs(f.lon-state.loc.lon)<0.01);
    return `<div class="fav-chip ${active?'active':''}" data-i="${i}"><span class="name">${esc(f.name)}</span></div>`;
  }).join('');
  wrap.querySelectorAll('.fav-chip').forEach(el=>{
    el.addEventListener('click',e=>{
      if(e.target.matches('[data-del]')){
        e.stopPropagation();
        const i=+e.target.dataset.del, list=getFavs();
        list.splice(i,1); saveFavs(list); renderFavs(); renderFavButton();
      }else{
        const f=getFavs()[+el.dataset.i];
        if(f) setLoc(f);
      }
    });
  });
}
$('#favBtn').addEventListener('click',()=>{
  const list=getFavs();
  const idx=list.findIndex(f=>Math.abs(f.lat-state.loc.lat)<0.01&&Math.abs(f.lon-state.loc.lon)<0.01);
  if(idx>=0){ list.splice(idx,1); saveFavs(list); toast('Retiré des favoris'); }
  else { list.push({...state.loc}); saveFavs(list); toast('Ajouté aux favoris ⭐'); }
  renderFavs(); renderFavButton();
});

$('#shareBtn').addEventListener('click',async()=>{
  const url=location.href;
  try{
    if(navigator.share) await navigator.share({title:`Météo à ${state.loc.name}`,text:'Ma météo en direct sur Plein Ciel',url});
    else { await navigator.clipboard.writeText(url); toast('Lien copié dans le presse-papiers 📋'); }
  }catch(e){
    try{ await navigator.clipboard.writeText(url); toast('Lien copié'); }
    catch(e2){ toast('Impossible de partager'); }
  }
});

