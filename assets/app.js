// assets/app.js
// Minimal HONOR app object
(function(){
  // helpers
  function uid(){ return 'id'+Math.random().toString(36).slice(2,9) }
  function fmMoney(n){ return 'Rp ' + (Number(n)||0).toLocaleString('id-ID') }
  function getLS(k,def){ try{ return JSON.parse(localStorage.getItem(k)||JSON.stringify(def)) }catch(e){ return def } }
  function setLS(k,v){ localStorage.setItem(k, JSON.stringify(v)) }

  // keys
  const KEY = {
    users: 'honor_users',
    gurus: 'honor_gurus',
    entries: 'honor_entries' // array of entry objects
  }

  // initialize storages
  if(!localStorage.getItem(KEY.users)) setLS(KEY.users, {admin:'admin'})
  if(!localStorage.getItem(KEY.gurus)) setLS(KEY.gurus, [])
  if(!localStorage.getItem(KEY.entries)) setLS(KEY.entries, [])

  // public API
  const API = {
    // auth helper
    currentUser: () => localStorage.getItem('honor_current') || null
  }

  // check auth
  window.checkAuth = function(){ return !!localStorage.getItem('honor_current') }

  // Guru CRUD
  function addGuru(g){ const arr = getLS(KEY.gurus,[]); const id=uid(); arr.push(Object.assign({id},g)); setLS(KEY.gurus,arr); return id }
  function getGurus(){ return getLS(KEY.gurus,[]) }
  function updateGuru(id, data){ const arr = getLS(KEY.gurus,[]); const i = arr.findIndex(x=>x.id===id); if(i>=0){ arr[i] = Object.assign(arr[i], data); setLS(KEY.gurus,arr); return true } return false }
  function deleteGuru(id){ const arr = getLS(KEY.gurus,[]); const i = arr.findIndex(x=>x.id===id); if(i>=0){ arr.splice(i,1); setLS(KEY.gurus,arr); return true } return false }

  // Entries: each entry = single date entry
  // { id, guruId, guruName, mapel, month ("YYYY-MM"), date ("YYYY-MM-DD"), jp, honorJabatan, honorTransport, kegiatan:[], created }
  function addEntry(e){
    const arr = getLS(KEY.entries,[])
    e.id = uid(); e.created = Date.now()
    arr.push(e); setLS(KEY.entries, arr)
    alert('Entri tersimpan')
  }
  function getEntries(){ return getLS(KEY.entries,[]) }
  function deleteEntry(id){ let arr=getLS(KEY.entries,[]); const i=arr.findIndex(x=>x.id===id); if(i>=0){ arr.splice(i,1); setLS(KEY.entries,arr); return true } return false }
  function updateEntryById(id, data){ const arr=getLS(KEY.entries,[]); const i=arr.findIndex(x=>x.id===id); if(i>=0){ arr[i]=Object.assign(arr[i],data); setLS(KEY.entries,arr); return true } return false }

  // helpers for stats
  function countGurus(){ return getGurus().length }
  function countEntriesMonth(monthStr){ // monthStr default = now
    const m = monthStr || new Date().toISOString().slice(0,7)
    return getEntries().filter(e=> e.month === m ).length
  }
  function estimateTotalMonth(monthStr){
    const m = monthStr || new Date().toISOString().slice(0,7)
    const entries = getEntries().filter(e=> e.month===m)
    let sum = 0
    entries.forEach(en=>{
      // find guru defaults if needed
      const g = getGurus().find(x=>x.id===en.guruId) || {}
      const rateJP = (+g.honorPokok) || 0
      const honorJP = (en.jp||0) * rateJP
      const totKeg = (en.kegiatan||[]).reduce((a,b)=>a+ (b.nominal||0), 0)
      const tot = honorJP + (en.honorTransport||0) + (en.honorJabatan||0) + totKeg
      sum += tot
    })
    return sum
  }

  // render guru table (for input-data page)
  function renderGurusTable(){
    const t = document.querySelector('#tblGurus tbody')
    if(!t) return
    const arr = getGurus()
    t.innerHTML = arr.map(g=>`<tr>
      <td>${g.nama}</td><td>${g.mapel}</td><td>${g.jabatan||''}</td><td>${fmMoney(g.honorPokok)}</td><td>${fmMoney(g.honorTransport)}</td>
      <td>
        <button class="btn small" data-action="edit" data-id="${g.id}">Edit</button>
        <button class="btn small" data-action="del" data-id="${g.id}">Hapus</button>
      </td></tr>`).join('') || '<tr><td colspan="6"><em>Belum ada guru</em></td></tr>'
    // bind actions
    t.querySelectorAll('button[data-action="del"]').forEach(b=>{
      b.onclick = ()=>{ if(confirm('Hapus guru?')){ deleteGuru(b.dataset.id); renderGurusTable(); } }
    })
    t.querySelectorAll('button[data-action="edit"]').forEach(b=>{
      b.onclick = ()=> {
        const g = getGurus().find(x=>x.id===b.dataset.id)
        if(!g) return
        const nm = prompt('Nama', g.nama); if(nm==null) return
        const map = prompt('Mapel', g.mapel); if(map==null) return
        const jab = prompt('Jabatan', g.jabatan||''); if(jab==null) return
        const pok = prompt('Honor Pokok (Rp)', g.honorPokok||0); if(pok==null) return
        const tr = prompt('Honor Transport (Rp per kehadiran)', g.honorTransport||0); if(tr==null) return
        updateGuru(g.id, {nama:nm,mapel:map,jabatan:jab,honorPokok: Number(pok)||0, honorTransport: Number(tr)||0})
        renderGurusTable()
      }
    })
  }

  // populate guru dropdown with mapel list too
  function populateGuruOptions(selId, selMapelId){
    const sel = document.getElementById(selId)
    const selMapel = document.getElementById(selMapelId)
    if(!sel) return
    const gurus = getGurus()
    sel.innerHTML = `<option value="">--Pilih Guru--</option>` + gurus.map((g,i)=>`<option value="${i}">${g.nama} — ${g.mapel}</option>`).join('')
    // optionally populate mapel
    if(selMapel){
      const mapels = [...new Set(gurus.map(g=>g.mapel).filter(Boolean))]
      selMapel.innerHTML = `<option value="">--Pilih Mapel--</option>` + mapels.map(m=>`<option value="${m}">${m}</option>`).join('')
    }
  }

  // calendar builder for month (simple grid with dates, mark entries)
  function buildCalendarForMonth(monthStr, containerId){
    // monthStr in "YYYY-MM"
    const wrap = document.getElementById(containerId)
    if(!wrap) return
    const [y,m] = (monthStr || new Date().toISOString().slice(0,7)).split('-').map(Number)
    const daysIn = new Date(y, m, 0).getDate()
    const entries = getEntries().filter(e=> e.month === `${String(y).padStart(4,'0')}-${String(m).padStart(2,'0')}`)
    const datesWithJP = {}
    entries.forEach(en=>{
      if(en.date) datesWithJP[en.date] = (datesWithJP[en.date]||0) + (en.jp||0)
    })
    let html = '<div class="cal-grid">'
    for(let d=1; d<=daysIn; d++){
      const ds = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`
      const val = datesWithJP[ds] || 0
      html += `<div class="cal-day ${val>0?'filled':''}" data-date="${ds}"><div class="d">${d}</div>${val>0?'<div class="note">'+val+' JP</div>':''}</div>`
    }
    html += '</div>'
    wrap.innerHTML = html
  }

  // add honor entry from input-honor page
  function addHonorEntry(data){
    // data expects: guruIndex (index from dropdown), guruId (optional), mapel, month(YYYY-MM), date (YYYY-MM-DD), jp, honorJabatan, honorTransport, kegiatan[]
    const gurus = getGurus()
    const guru = gurus[Number(data.guruIndex)]
    const guruId = data.guruId || (guru && guru.id) || null
    const guruName = guru ? guru.nama : (data.guruName || 'Unknown')
    // create or update: if same guru+date exists, we append/replace? We'll append as new entry (could be revised via edit)
    const entry = {
      guruId, guruName,
      mapel: data.mapel || (guru && guru.mapel) || '',
      month: data.month || (data.date ? data.date.slice(0,7) : new Date().toISOString().slice(0,7)),
      date: data.date || new Date().toISOString().slice(0,10),
      jp: Number(data.jp||0),
      honorJabatan: Number(data.honorJabatan||0),
      honorTransport: Number(data.honorTransport||0),
      kegiatan: data.kegiatan || []
    }
    addEntry(entry)
  }

  // render rekap monthly -> returns html string (so page can insert)
  function renderRekapBulanan(monthStr){
    const entries = getEntries().filter(e=> e.month === monthStr)
    const grouped = {}
    entries.forEach(e=>{
      if(!grouped[e.guruName]) grouped[e.guruName] = []
      grouped[e.guruName].push(e)
    })
    let html = ''
    for(const [guru, list] of Object.entries(grouped)){
      let sum = 0
      html += `<div class="card"><h4>${guru}</h4><table><thead><tr><th>Tanggal</th><th>JP</th><th>Honor JP</th><th>Transport</th><th>Jabatan</th><th>Kegiatan</th><th>Total</th><th>Aksi</th></tr></thead><tbody>`
      list.forEach(en=>{
        const g = getGurus().find(x=>x.id===en.guruId) || {}
        const rateJP = (+g.honorPokok) || 0
        const honorJP = (en.jp||0) * rateJP
        const totKeg = (en.kegiatan||[]).reduce((a,b)=>a+(b.nominal||0),0)
        const tot = honorJP + (en.honorTransport||0) + (en.honorJabatan||0) + totKeg
        sum += tot
        const idx = getEntries().indexOf(en)
        html += `<tr>
          <td>${en.date}</td>
          <td>${en.jp}</td>
          <td>${fmMoney(honorJP)}</td>
          <td>${fmMoney(en.honorTransport)}</td>
          <td>${fmMoney(en.honorJabatan)}</td>
          <td>${fmMoney(totKeg)}</td>
          <td>${fmMoney(tot)}</td>
          <td>
            <button class="btn small" data-action="nota" data-idx="${idx}">Nota</button>
            <button class="btn small" data-action="edit" data-idx="${idx}">Edit</button>
            <button class="btn small" data-action="del" data-idx="${idx}">Hapus</button>
          </td>
        </tr>`
      })
      html += `</tbody></table><div style="margin-top:8px"><strong>Total: ${fmMoney(sum)}</strong> <button class="btn" onclick="window.HONOR.exportPDFMonth('${monthStr}','${guru}')">Download Nota Guru (PDF)</button></div></div>`
    }
    if(!html) html = '<div class="small">Tidak ada data pada bulan ini.</div>'
    return html
  }

  // render rekap tahunan
  function renderRekapTahunan(year){
    const e = getEntries().filter(x=> Number(x.date.slice(0,4)) === Number(year))
    if(!e.length) return '<div class="small">Tidak ada data untuk tahun ini.</div>'
    const byGuru = {}
    e.forEach(en=>{
      const g = byGuru[en.guruName] || (byGuru[en.guruName]= { entries: [], total:0 })
      const guruData = getGurus().find(x=>x.id===en.guruId) || {}
      const honorJP = (en.jp||0) * (guruData.honorPokok||0)
      const totKeg = (en.kegiatan||[]).reduce((a,b)=>a+(b.nominal||0),0)
      const tot = honorJP + (en.honorTransport||0) + (en.honorJabatan||0) + totKeg
      g.entries.push(en); g.total += tot
    })
    let html = '<div class="card"><h4>Rekap Tahun '+year+'</h4><table><thead><tr><th>Guru</th><th>Total</th></tr></thead><tbody>'
    for(const [guru,obj] of Object.entries(byGuru)) html += `<tr><td>${guru}</td><td>${fmMoney(obj.total)}</td></tr>`
    html += '</tbody></table></div>'
    return html
  }

  // helpers for editing entries by index (index in entries array)
  function deleteEntryByIndex(idx){
    const arr = getEntries(); const en = arr[idx]; if(!en) return false
    return deleteEntry(en.id)
  }
  function editEntryByIndexPrompt(idx){
    const arr = getEntries(); const en = arr[idx]; if(!en) return false
    const jp = prompt('JP', en.jp); if(jp==null) return
    const transport = prompt('Transport (Rp)', en.honorTransport||0); if(transport==null) return
    const jab = prompt('Jabatan (Rp)', en.honorJabatan||0); if(jab==null) return
    en.jp = Number(jp||0); en.honorTransport = Number(transport||0); en.honorJabatan = Number(jab||0)
    updateEntryById(en.id, en)
    return true
  }

  // render nota by index
  function renderNotaByIndex(idx){
    const arr = getEntries(); const e = arr[idx]; if(!e) return '<em>Nota tidak ditemukan</em>'
    const g = getGurus().find(x=>x.id===e.guruId) || {}
    const rateJP = (+g.honorPokok)||0
    const honorJP = (e.jp||0) * rateJP
    const totKeg = (e.kegiatan||[]).reduce((a,b)=>a+(b.nominal||0),0)
    const tot = honorJP + (e.honorTransport||0) + (e.honorJabatan||0) + totKeg
    let html = `<h3>Nota — ${e.guruName}</h3><div>Tanggal: ${e.date}</div><table><tbody>`
    html += `<tr><td>Mapel</td><td>${e.mapel}</td></tr>`
    html += `<tr><td>JP</td><td>${e.jp}</td></tr>`
    html += `<tr><td>Honor JP</td><td>${fmMoney(honorJP)}</td></tr>`
    html += `<tr><td>Transport</td><td>${fmMoney(e.honorTransport)}</td></tr>`
    html += `<tr><td>Jabatan</td><td>${fmMoney(e.honorJabatan)}</td></tr>`
    html += `<tr><td>Kegiatan</td><td>${fmMoney(totKeg)}</td></tr>`
    html += `<tr><th>Total</th><th>${fmMoney(tot)}</th></tr>`
    html += `</tbody></table>`
    return html
  }

  // export PDF month (combined) using html2canvas + jsPDF
  async function exportPDFMonth(monthStr, guruName){
    // build html block
    const html = renderRekapBulanan(monthStr)
    const wrapper = document.createElement('div'); wrapper.style.padding='12px'; wrapper.style.background='#fff'; wrapper.innerHTML = `<h2>Rekap ${monthStr} ${guruName?(' - '+guruName):''}</h2>` + html
    document.body.appendChild(wrapper)
    if(window.html2canvas) {
      const canvas = await window.html2canvas(wrapper)
      const img = canvas.toDataURL('image/png')
      const { jsPDF } = window.jspdf || window.jspdf || {}
      if(window.jspdf && window.jspdf.jsPDF) {
        const pdf = new window.jspdf.jsPDF({unit:'mm', format:'a4'})
        const imgW = pdf.internal.pageSize.getWidth() - 20
        const imgH = canvas.height * imgW / canvas.width
        pdf.addImage(img, 'PNG', 10, 10, imgW, imgH)
        pdf.save('rekap-'+monthStr+'.pdf')
      } else if(window.jspdf && typeof window.jsPDF === 'function') {
        const pdf = new window.jsPDF({unit:'mm', format:'a4'})
        const imgW = pdf.internal.pageSize.getWidth() - 20
        const imgH = canvas.height * imgW / canvas.width
        pdf.addImage(img, 'PNG', 10, 10, imgW, imgH)
        pdf.save('rekap-'+monthStr+'.pdf')
      } else {
        alert('jsPDF belum terpasang (butuh CDN).')
      }
    } else {
      alert('html2canvas belum terpasang (butuh CDN).')
    }
    wrapper.remove()
  }

  // print html to pdf from string (used for nota)
  async function printHtmlToPDF(htmlString, filename){
    const wrapper = document.createElement('div'); wrapper.style.padding='12px'; wrapper.style.background='#fff'; wrapper.innerHTML = htmlString
    document.body.appendChild(wrapper)
    if(window.html2canvas) {
      const canvas = await window.html2canvas(wrapper)
      const img = canvas.toDataURL('image/png')
      if(window.jspdf && window.jspdf.jsPDF) {
        const pdf = new window.jspdf.jsPDF({unit:'mm', format:'a4'})
        const imgW = pdf.internal.pageSize.getWidth() - 20
        const imgH = canvas.height * imgW / canvas.width
        pdf.addImage(img, 'PNG', 10, 10, imgW, imgH)
        pdf.save((filename||'nota') + '.pdf')
      } else if(window.jsPDF && typeof window.jsPDF === 'function') {
        const pdf = new window.jsPDF({unit:'mm', format:'a4'})
        const imgW = pdf.internal.pageSize.getWidth() - 20
        const imgH = canvas.height * imgW / canvas.width
        pdf.addImage(img, 'PNG', 10, 10, imgW, imgH)
        pdf.save((filename||'nota') + '.pdf')
      } else {
        alert('jsPDF belum terpasang.')
      }
    } else {
      alert('html2canvas belum terpasang.')
    }
    wrapper.remove()
  }

  // download HTML as Word
  function downloadHtmlAsWord(htmlString, filename){
    const blob = new Blob(['\ufeff', htmlString], {type: 'application/msword'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = filename || 'document.doc'
    a.click(); URL.revokeObjectURL(url)
  }

  // export gurus json file
  function exportGurus(){
    const blob = new Blob([JSON.stringify(getGurus(),null,2)], {type:'application/json'})
    const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='gurus.json'; a.click()
  }

  // public interface
  window.HONOR = {
    addGuru, getGurus, updateGuru, deleteGuru,
    addEntry, getEntries, deleteEntry, updateEntryById,
    countGurus, countEntriesMonth, estimateTotalMonth,
    renderGurusTable, renderRekapBulanan, renderRekapTahunan,
    renderNotaByIndex, deleteEntryByIndex, editEntryByIndexPrompt,
    populateGuruOptions, buildCalendarForMonth, exportPDFMonth,
    printHtmlToPDF, downloadHtmlAsWord, exportGurus
  }

  // some globals
  window.formatMoney = fmMoney
  window.numberFormat = fmMoney
})();
