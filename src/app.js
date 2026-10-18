'use strict';
const LIBRARY=JSON.parse(document.getElementById('dataset').textContent);
const YEAR_DATA=LIBRARY.datasets||{[String(LIBRARY.year)]:LIBRARY};
let year='2024';
try{const selected=localStorage.getItem('toeic-studio-active-year');if(Object.hasOwn(YEAR_DATA,selected))year=selected;}catch{}
if(!YEAR_DATA[year])year=Object.keys(YEAR_DATA)[0];
let DATA=YEAR_DATA[year];
let KEY=`toeic-studio-ets${year}-v1`;
const $=id=>document.getElementById(id);
const names=['Mô tả tranh','Hỏi & đáp','Hội thoại','Bài nói ngắn','Hoàn thành câu','Hoàn thành đoạn văn','Đọc hiểu'];
let groupMap=new Map(DATA.groups.map(g=>[g.id,g]));
let questionMap=new Map(DATA.questions.map(q=>[q.id,q]));
let partLists=Array.from({length:7},(_,i)=>DATA.questions.filter(q=>q.part===i+1));
let groupQuestions=new Map();
for(const q of DATA.questions){if(!groupQuestions.has(q.group))groupQuestions.set(q.group,[]);groupQuestions.get(q.group).push(q);}
function groupedPart(){return [3,4,6,7].includes(part);}
function navigationItems(list){if(!groupedPart())return list;const seen=new Set();return list.filter(q=>{if(seen.has(q.group))return false;seen.add(q.group);return true;});}
let storageOk=true;
function loadProgress(){const state={answers:{},bookmarks:{},overrides:{},part:1,positions:{}};try{const raw=JSON.parse(localStorage.getItem(KEY)||'null');if(raw&&typeof raw==='object')Object.assign(state,raw);}catch{storageOk=false;}for(const key of ['answers','bookmarks','overrides','positions'])if(!state[key]||typeof state[key]!=='object'||Array.isArray(state[key]))state[key]={};return state;}
let saved=loadProgress();
let part=Number(saved.part)||1;if(part<1||part>7)part=1;
let filterTest='all',filterStatus='all',currentId=saved.positions[part]||partLists[part-1][0].id,mediaGroup=null,toastTimer;
function toast(text){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,3600);}
function save(){saved.part=part;saved.positions[part]=currentId;try{localStorage.setItem(KEY,JSON.stringify(saved));}catch{storageOk=false;toast('Không thể lưu trên trình duyệt này. Hãy xuất tiến độ để giữ bài làm.');}}
function refreshYearLabels(){document.title=`TOEIC Studio · ETS ${year}`;$('collection-year').textContent=`ETS ${year}`;$('header-year').textContent=`ETS ${year}`;$('library-year').textContent=`THƯ VIỆN ETS ${year}`;for(const b of document.querySelectorAll('[data-year]')){b.classList.toggle('active',b.dataset.year===year);b.setAttribute('aria-pressed',String(b.dataset.year===year));}const select=$('test-filter');select.replaceChildren();const all=document.createElement('option');all.value='all';all.textContent=`Tất cả ${DATA.tests.length} đề`;select.append(all);for(const t of DATA.tests){const o=document.createElement('option');o.value=t.test;o.textContent=`Test ${t.test} · ${year}`;select.append(o);}}
function switchYear(next){next=String(next);if(next===year||!Object.hasOwn(YEAR_DATA,next))return;save();$('media').querySelector('audio')?.pause();year=next;DATA=YEAR_DATA[year];KEY=`toeic-studio-ets${year}-v1`;groupMap=new Map(DATA.groups.map(g=>[g.id,g]));questionMap=new Map(DATA.questions.map(q=>[q.id,q]));partLists=Array.from({length:7},(_,i)=>DATA.questions.filter(q=>q.part===i+1));groupQuestions=new Map();for(const q of DATA.questions){if(!groupQuestions.has(q.group))groupQuestions.set(q.group,[]);groupQuestions.get(q.group).push(q);}saved=loadProgress();part=Number(saved.part)||1;if(part<1||part>7)part=1;filterTest='all';filterStatus='all';currentId=saved.positions[part]||partLists[part-1][0].id;mediaGroup=null;refreshYearLabels();$('status-filter').value='all';$('import-message').textContent='';try{localStorage.setItem('toeic-studio-active-year',year);}catch{}render();if($('data-dialog').open)openData();}
function answerData(q){return saved.overrides[q.id]||q;}
function hasAnswer(q){return Object.hasOwn(saved.answers,q.id)&&Number.isInteger(saved.answers[q.id])&&saved.answers[q.id]>=0&&saved.answers[q.id]<q.choices.length;}
function grade(q){if(!hasAnswer(q))return '';const d=answerData(q);return d.correct===null?'answered':saved.answers[q.id]===d.correct?'correct':'wrong';}
function view(){return partLists[part-1].filter(q=>(filterTest==='all'||q.test===Number(filterTest))&&(filterStatus==='all'||filterStatus==='new'&&!hasAnswer(q)||filterStatus==='wrong'&&grade(q)==='wrong'||filterStatus==='bookmarked'&&saved.bookmarks[q.id]||filterStatus==='verified'&&answerData(q).correct!==null));}
function adjacentQuestion(delta,list=view()){
 const current=questionMap.get(currentId);if(!current)return;
 const rank=q=>q.test*200+q.original;
 const items=navigationItems(list).filter(q=>!groupedPart()||q.group!==current.group);
 return delta<0?items.slice().reverse().find(q=>rank(q)<rank(current)):items.find(q=>rank(q)>rank(current));
}
function updateNavigation(){const list=view();$('prev').disabled=!adjacentQuestion(-1,list);$('next').disabled=!adjacentQuestion(1,list);}
function decode(raw){const t=document.createElement('textarea');t.innerHTML=raw||'';return t.value;}
function safe(raw){const t=document.createElement('template');let html=String(raw||'');if(/&lt;\/?(?:p|img|div|span|table|br|strong|ul|ol|h[1-6])\b/i.test(html))html=decode(html);t.innerHTML=html.replace(/''/g,'"');
 const allowed=new Set(['P','BR','DIV','SPAN','STRONG','B','I','EM','U','S','SMALL','SUB','SUP','IMG','TABLE','THEAD','TBODY','TFOOT','TR','TD','TH','UL','OL','LI','BLOCKQUOTE','HR','A','H1','H2','H3','H4','H5','H6']);
 for(const el of [...t.content.querySelectorAll('*')]){if(!allowed.has(el.tagName)){if(['SCRIPT','STYLE','IFRAME','OBJECT','EMBED','FORM','INPUT','BUTTON','LINK','META','SVG','MATH'].includes(el.tagName))el.remove();else el.replaceWith(...el.childNodes);continue;}
  for(const a of [...el.attributes]){if(!['src','href','alt','title','colspan','rowspan','style'].includes(a.name))el.removeAttribute(a.name);}
  for(const a of ['src','href'])if(el.hasAttribute(a)){try{const u=new URL(el.getAttribute(a),'https://zenlishtoeic.vn/');if(!['https:','http:'].includes(u.protocol))el.removeAttribute(a);else el.setAttribute(a,u.href);}catch{el.removeAttribute(a);}}
  if(el.hasAttribute('style')){const old=el.style;const keep={};for(const k of ['color','font-weight','font-style','text-align','text-decoration'])if(old[k])keep[k]=old[k];el.removeAttribute('style');Object.assign(el.style,keep);}
  if(el.tagName==='A'){el.target='_blank';el.rel='noopener noreferrer';}
  if(el.tagName==='IMG'){el.loading='lazy';el.addEventListener('error',()=>{el.alt='Ảnh nguồn chưa tải được. Hãy kiểm tra kết nối hoặc mở đề gốc.';});}
 }
 return t.content;
}
function rich(id,raw){$(id).replaceChildren(safe(raw));}
for(const b of document.querySelectorAll('[data-year]'))b.onclick=()=>switchYear(b.dataset.year);
refreshYearLabels();
function renderParts(){const frag=document.createDocumentFragment();for(let i=1;i<=7;i++){const b=document.createElement('button');b.className='part-button'+(part===i?' active':'');b.setAttribute('aria-current',part===i?'page':'false');b.innerHTML=`<span class="part-icon">0${i}</span><span class="part-name">Part ${i}<small>${names[i-1]}</small></span><span class="part-count">${partLists[i-1].length}</span>`;b.onclick=()=>{part=i;filterTest='all';filterStatus='all';$('test-filter').value='all';$('status-filter').value='all';currentId=saved.positions[part]||partLists[part-1][0].id;render({autoplay:true});};frag.append(b);}$('parts').replaceChildren(frag);}
function renderStats(){const all=partLists[part-1],done=all.filter(hasAnswer),graded=done.filter(q=>answerData(q).correct!==null),right=graded.filter(q=>grade(q)==='correct');$('done-count').textContent=done.length;$('right-count').textContent=right.length;$('accuracy').textContent=graded.length?Math.round(right.length/graded.length*100)+'%':'—';$('progress-bar').style.width=done.length/all.length*100+'%';

}
function showMedia(q,autoplay=false){const g=groupMap.get(q.group);if(mediaGroup===g.id)return;const old=$('media').querySelector('audio');if(old)old.pause();mediaGroup=g.id;$('media').replaceChildren();rich('passage',g.content);$('stimulus-note').replaceChildren();$('group-range').textContent=g.numbers.length>1?`Câu ${g.numbers[0]}–${g.numbers.at(-1)}`:`Câu ${q.original}`;$('stimulus-label').textContent=g.audio?'NGHE & TRẢ LỜI':q.part===1?'QUAN SÁT HÌNH ẢNH':'NỘI DUNG ĐỀ BÀI';
 if(g.audio){const a=document.createElement('audio');a.controls=true;a.preload='none';a.src=g.audio+(q.part===2?'#t=1.9':'');const meta=document.createElement('div');meta.className='audio-meta';const label=document.createElement('span');label.hidden=true;const link=document.createElement('a');link.href=g.audio;link.target='_blank';link.rel='noopener';link.textContent='Mở audio ↗';meta.append(label,link);$('media').append(a,meta);a.onplay=()=>document.querySelectorAll('audio').forEach(other=>{if(other!==a)other.pause();});a.onerror=()=>{label.hidden=false;label.textContent='Không tải được audio. Thử mở liên kết nguồn.';label.className='audio-error';};
  // Start inside the navigation gesture; keep shared-group playback untouched.
  if(autoplay)a.play().catch(error=>{if(!a.isConnected||mediaGroup!==g.id||error.name==='AbortError')return;if(error.name==='NotAllowedError'){label.hidden=false;label.textContent='Trình duyệt chặn tự phát. Bấm Play để nghe.';}});
 }
 if(!$('passage').textContent.trim()&&!$('passage').querySelector('img,table')){if(g.audio){const art=document.createElement('div');art.className='sound-art';art.setAttribute('aria-hidden','true');for(let i=0;i<13;i++)art.append(document.createElement('span'));$('stimulus-note').append(art);}}
}
function renderQuestion(q,card){const field=name=>card.querySelector(`[data-field="${name}"]`);const rich=(name,raw)=>field(name).replaceChildren(safe(raw));card.dataset.questionId=q.id;card.id=`question-${q.id}`;card.setAttribute('aria-label',`Câu ${q.original} trong đề gốc`);const full=partLists[part-1];const index=full.findIndex(x=>x.id===q.id);const d=answerData(q);field('test-badge').textContent=`TEST ${q.test} / ${year}`;field('question-number').textContent=`Câu ${index+1}`;rich('question-title',q.title.replace(/^\s*\d+\s*[.)]\s*/,''));field('original-number').textContent=`Câu ${q.original} trong đề gốc · Part ${q.part}`;field('source-link').href=groupMap.get(q.group).source;field('bookmark').setAttribute('aria-pressed',saved.bookmarks[q.id]?'true':'false');field('bookmark').textContent=saved.bookmarks[q.id]?'★':'☆';field('bookmark').onclick=()=>{saved.bookmarks[q.id]=!saved.bookmarks[q.id];save();renderQuestion(q,card);renderMap(view());updateNavigation();};
 const chosen=hasAnswer(q)?saved.answers[q.id]:null;const frag=document.createDocumentFragment();q.choices.forEach((choice,i)=>{const b=document.createElement('button');b.className='choice';b.dataset.choice=i;const letter=document.createElement('span');letter.className='choice-letter';letter.textContent=choice.label;const text=document.createElement('span');text.className='choice-text';text.append(safe(choice.text));b.append(letter,text);b.setAttribute('aria-pressed',chosen===i?'true':'false');if(chosen!==null){b.disabled=true;if(d.correct===i)b.classList.add('correct');else if(chosen===i)b.classList.add(d.correct===null?'selected':'wrong');if(d.correct===i||chosen===i){const mark=document.createElement('span');mark.className='choice-mark';mark.textContent=d.correct===i?'✓':d.correct===null?'•':'×';b.append(mark);}}b.onclick=()=>{if(hasAnswer(q))return;saved.answers[q.id]=i;save();renderQuestion(q,card);renderStats();renderMap(view());updateNavigation();};frag.append(b);});field('choices').replaceChildren(frag);
 field('feedback').replaceChildren();if(chosen!==null){const box=document.createElement('div');box.className='feedback';const status=document.createElement('div');status.className='feedback-status';if(d.correct===null){status.classList.add('unknown');status.textContent=`Đã chọn ${q.choices[chosen].label} · Chưa có đáp án gốc để chấm.`;}else{if(chosen!==d.correct)status.classList.add('wrong');status.textContent=(chosen===d.correct?'✓ Chính xác!':'Chưa đúng.')+` Đáp án đúng: ${q.choices[d.correct].label}.`;}box.append(status);const label=document.createElement('div');label.className='explanation-label';label.textContent='LỜI GIẢI TỪ ZENLISH';const explanation=document.createElement('div');explanation.className='explanation rich';if(d.explanation)explanation.append(safe(d.explanation));else explanation.textContent='Dữ liệu trang đã tải chưa cung cấp lời giải cho câu này. Bạn có thể bổ sung từ dữ liệu xem lại của đề gốc.';box.append(label,explanation);field('feedback').append(box);}
}
function renderQuestions(q){
 const questions=groupedPart()?groupQuestions.get(q.group):[q];
 const frag=document.createDocumentFragment();
 for(const item of questions){const card=$('question-template').content.firstElementChild.cloneNode(true);renderQuestion(item,card);card.classList.toggle('is-current',item.id===currentId);frag.append(card);}
 $('questions').replaceChildren(frag);
}

function renderMap(list){const total=partLists[part-1];$('map-total').textContent=`${list.length} câu`;const frag=document.createDocumentFragment();list.forEach(q=>{const b=document.createElement('button');const num=total.findIndex(x=>x.id===q.id)+1;b.className=`map-button ${grade(q)}${groupedPart()&&q.group===questionMap.get(currentId)?.group?' in-group':''}${q.id===currentId?' active':''}${saved.bookmarks[q.id]?' bookmarked':''}`;b.textContent=num;b.title=`Câu ${num} · Test ${q.test} · Câu gốc ${q.original}`;b.setAttribute('aria-label',b.title);if(q.id===currentId)b.setAttribute('aria-current','true');b.onclick=()=>go(q.id);frag.append(b);});$('question-map').replaceChildren(frag);}
function render({autoplay=false}={}){const list=view();if(!list.some(q=>q.id===currentId))currentId=list[0]?.id||null;const q=questionMap.get(currentId);const items=navigationItems(list);const i=items.findIndex(x=>groupedPart()?x.group===q?.group:x.id===currentId);$('part-title').textContent=`Part ${part} · ${names[part-1]}`;$('position').textContent=list.length?(groupedPart()?`Nhóm ${i+1} / ${items.length} · ${list.length} câu`:`${i+1} / ${list.length} câu`):'0 câu';$('workspace').classList.toggle('grouped',groupedPart());$('prev').textContent=groupedPart()?'← Nhóm trước':'← Câu trước';$('next').textContent=groupedPart()?'Nhóm tiếp theo →':'Câu tiếp theo →';$('workspace').hidden=!q;$('empty').hidden=!!q;updateNavigation();renderParts();renderStats();if(q){showMedia(q,autoplay);renderQuestions(q);}else{const a=$('media').querySelector('audio');if(a)a.pause();mediaGroup=null;}renderMap(list);save();}
function go(id){currentId=id;render({autoplay:true});if(groupedPart())document.getElementById(`question-${id}`)?.scrollIntoView({block:'start'});}
function step(delta){const q=adjacentQuestion(delta);if(q)go(q.id);}
$('prev').onclick=()=>step(-1);$('next').onclick=()=>step(1);
$('test-filter').onchange=e=>{filterTest=e.target.value;render({autoplay:true});};$('status-filter').onchange=e=>{filterStatus=e.target.value;render({autoplay:true});};
$('reset').onclick=()=>{if(!confirm(`Xóa các lựa chọn đã lưu trong Part ${part}?`))return;partLists[part-1].forEach(q=>delete saved.answers[q.id]);filterStatus='all';$('status-filter').value='all';save();render();};
document.addEventListener('keydown',e=>{if($('data-dialog').open||/INPUT|TEXTAREA|SELECT|AUDIO|BUTTON/.test(e.target.tagName))return;if(e.key==='ArrowRight'){e.preventDefault();step(1);}if(e.key==='ArrowLeft'){e.preventDefault();step(-1);}});
function openData(){const known=DATA.questions.filter(q=>answerData(q).correct!==null).length;$('data-summary').textContent=`ETS ${year} · ${DATA.questions.length.toLocaleString('vi-VN')} câu hỏi · ${known} đáp án gốc · ${DATA.questions.filter(q=>answerData(q).explanation).length} lời giải.`;$('data-rows').replaceChildren();for(let i=1;i<=10;i++){const qs=DATA.questions.filter(q=>q.test===i);const row=document.createElement('tr');for(const text of [`Test ${i}`,qs.length,qs.filter(q=>answerData(q).correct!==null).length,qs.filter(q=>answerData(q).explanation).length]){const cell=document.createElement('td');cell.textContent=text;row.append(cell);}$('data-rows').append(row);}if(!$('data-dialog').open)$('data-dialog').showModal();}
$('data-button').onclick=openData;$('close-dialog').onclick=()=>$('data-dialog').close();
function download(name,data){const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);}
$('export-progress').onclick=()=>download(`toeic-${year}-tien-do.json`,{format:KEY,saved,exportedAt:new Date().toISOString()});
function validateProgressFile(d){
 if(d.format!==KEY)throw new Error('Tệp tiến độ không thuộc bộ '+year+'. Hãy chọn đúng năm trước khi nhập.');
 const input=d.saved;if(!input||typeof input!=='object'||!input.answers||!input.bookmarks)throw new Error('Tệp tiến độ không hợp lệ.');
 const state={answers:input.answers,bookmarks:input.bookmarks,overrides:input.overrides||{},part:input.part??1,positions:input.positions||{}};
 for(const key of ['answers','bookmarks','overrides','positions'])if(!state[key]||typeof state[key]!=='object'||Array.isArray(state[key]))throw new Error('Dữ liệu tiến độ không hợp lệ.');
 for(const [id,c] of Object.entries(state.answers)){const q=questionMap.get(id);if(!q||!Number.isInteger(c)||c<0||c>=q.choices.length)throw new Error('Có lựa chọn không hợp lệ trong tệp.');}
 for(const [id,b]of Object.entries(state.bookmarks))if(!questionMap.has(id)||typeof b!=='boolean')throw new Error('Đánh dấu câu hỏi không hợp lệ.');
 for(const [id,d]of Object.entries(state.overrides)){const q=questionMap.get(id);if(!q||!Number.isInteger(d.correct)||d.correct<0||d.correct>=q.choices.length||typeof d.explanation!=='string')throw new Error('Đáp án bổ sung không hợp lệ.');}
 if(!Number.isInteger(state.part)||state.part<1||state.part>7)throw new Error('Part trong tệp không hợp lệ.');
 for(const [p,id]of Object.entries(state.positions))if(id!==null&&questionMap.get(id)?.part!==Number(p))throw new Error('Vị trí học trong tệp không hợp lệ.');
 return state;
}
$('import-progress').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;const next=validateProgressFile(JSON.parse(await file.text()));if(!confirm('Thay tiến độ năm '+year+' bằng bản sao lưu này?'))return;saved=next;part=saved.part;filterTest='all';filterStatus='all';currentId=saved.positions[part]||partLists[part-1][0].id;mediaGroup=null;$('test-filter').value='all';$('status-filter').value='all';save();render();openData();$('import-message').textContent='Đã nhập đầy đủ tiến độ năm '+year+'.';}catch(error){$('import-message').textContent=error.message;}finally{e.target.value='';}};
$('import-answers').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;const data=JSON.parse(await file.text());if(data.format!==`zenlish-review-${year}`||!Array.isArray(data.answers))throw new Error(`Cần tệp bổ sung đáp án đúng định dạng zenlish-review-${year}.`);const patches={};for(const item of data.answers){const q=questionMap.get(item.id);if(!q||!Number.isInteger(item.correct)||item.correct<0||item.correct>=q.choices.length||typeof item.explanation!=='string')throw new Error('Tệp có câu hỏi hoặc đáp án không hợp lệ.');patches[q.id]={correct:item.correct,explanation:item.explanation};}Object.assign(saved.overrides,patches);save();render();openData();$('import-message').textContent=`Đã bổ sung ${Object.keys(patches).length} đáp án.`;}catch(error){$('import-message').textContent=error.message;}finally{e.target.value='';}};
render();if(!storageOk)toast('Không đọc được bộ nhớ cục bộ. Bạn có thể xuất tiến độ để sao lưu.');
