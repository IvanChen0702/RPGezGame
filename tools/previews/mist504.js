// Review-only prototype: existing game art/components; no API calls or mutations.
window.previewDock504=()=>{
 const root=document.querySelector('.mist465');root.classList.add('preview504');
 const summary=root.querySelector('.mist-explore-summary469'),toolbar=root.querySelector('.mist-map-toolbar465'),selection=root.querySelector('.mist-selection469');
 const dock=document.createElement('footer');dock.className='mist-dock504';
 const location=document.createElement('div');location.className='dock-location504';location.innerHTML='<span>'+flatIcon313_('flag')+' 位置 11,3</span><small>點擊亮框移動 · 每格 1 體力</small>';
 const controls=toolbar.querySelector('.mist-view-tools487');controls.children[0].innerHTML=flatIcon313_('map')+'<span>我的位置</span>';controls.children[1].innerHTML=flatIcon313_('book')+'<span>其它視野</span>';
 location.append(controls);dock.append(summary,location);root.append(dock);toolbar.remove();selection?.remove();root.querySelector('.mist-map-legend465')?.remove();
 const note=document.createElement('span');note.className='preview-note504';note.textContent='介面示意 · 現有素材';root.querySelector('.mist-tools467').prepend(note);
};
window.previewRecovery504=(state='defeat')=>{
 document.querySelector('.recovery-shade504')?.remove();const respawn=state==='respawn';
 const img=p=>assetSrc393_('assets/images/'+p);
 const shell=document.createElement('div');shell.className='recovery-shade504 '+(respawn?'is-respawn':'');
 shell.innerHTML='<section class="recovery504"><div class="recovery-scene504"><img class="recovery-seal504" src="'+img('ui/settlement/'+(respawn?'victory':'defeat')+'-crest.svg')+'" alt=""><div><small>迷霧戰境 · '+(respawn?'再次啟程':'遭遇戰報')+'</small><h2>'+(respawn?'重整旗鼓，再入迷霧':'你在迷霧中倒下了')+'</h2><p>'+(respawn?'積分仍在，下一趟旅程由此開始。':'對手已離開，戰境仍在繼續。')+'</p></div></div><div class="recovery-body504">'+
 (respawn?'<div class="respawn-gift504"><img src="'+mistChestArt479_()+'" alt="重生補給箱"><div><small>你的專屬補給</small><h3>重生補給箱</h3><p>確認重生後自動開箱，取得四件裝備。</p><div class="respawn-slots504">'+[['head','頭部'],['armor','防具'],['weapon','武器'],['special','特殊']].map(([k,n])=>'<span>'+prizeIcon179_(k)+'<small>'+n+'</small></span>').join('')+'</div></div></div>':
 '<div class="defeat-enemy504"><span class="enemy-emblem504">'+flatIcon313_('swords')+'</span><div><small>擊敗你的玩家</small><h3>霧行者</h3><p>座標 8,3 <i>·</i> 11/20 11:05（台灣時間）</p></div><span class="report-mark504">戰鬥敗北</span></div>')+
 '<div class="recovery-facts504">'+(respawn?[
 ['ui/settlement/hp.svg','滿血出發','HP 完全恢復'],['ui/mist/stamina487.webp','體力 20 / 20','被玩家擊敗後恢復'],['ui/mist/flag-blue465.webp','出生保護 1 小時','移動或開戰即解除']
 ]:[['ui/settlement/exp.svg','30 積分','目前積分保留'],['ui/settlement/prepare.svg','裝備與物品','本次已全部失去'],['ui/mist/flag-red465.webp','場上旗幟','已撤除，計時重置']]).map(([art,title,note])=>'<div><img src="'+img(art)+'" alt=""><strong>'+title+'</strong><small>'+note+'</small></div>').join('')+'</div>'+
 '<div class="recovery-actions504"><button>'+(respawn?'查看戰報':'查看完整戰報')+'</button><button class="primary">'+(respawn?'確認重生 · 自動開箱':'前往重生')+' <span>›</span></button></div><p class="recovery-foot504">'+(respawn?'隨機回到地圖外圍；重生補給僅限戰境使用。':'示意戰報 · 對手名稱、座標與時間將使用實際紀錄。')+'</p></div></section>';
 document.body.append(shell);
};
