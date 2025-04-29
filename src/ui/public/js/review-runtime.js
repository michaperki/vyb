
// File: src/ui/public/js/review-runtime.js
;(function() {
  // Suggestions data injected as global in the template:
  const suggestions = window.SUGGESTIONS
  const acceptedChanges = {}

  // DOM elements
  const fileList     = document.getElementById('fileList')
  const content      = document.getElementById('content')
  const toggleSidebar= document.querySelector('.toggle-sidebar')
  const sidebar      = document.querySelector('.sidebar')
  const applyAllBtn  = document.getElementById('applyAll')
  const rejectAllBtn = document.getElementById('rejectAll')

  // Toggle sidebar visibility
  toggleSidebar.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed')
  })

  // Populate click handlers for file items
  fileList.querySelectorAll('.file-item').forEach(item => {
    item.addEventListener('click', () => {
      fileList.querySelectorAll('.file-item').forEach(i => i.classList.remove('active'))
      item.classList.add('active')
      const index = parseInt(item.dataset.index, 10)
      showFileChanges(index)
    })
  })

  // Apply all changes
  applyAllBtn.addEventListener('click', () => {
    if (!confirm('Apply all suggested changes? This will modify your code files.')) return
    const all = []
    suggestions.files.forEach(f =>
      f.changes.forEach(c => all.push({ file: f.path, change: c }))
    )
    applyChanges(all)
  })

  // Reject all changes
  rejectAllBtn.addEventListener('click', () => {
    if (!confirm('Reject all suggested changes? This cannot be undone.')) return
    alert('All changes rejected.')
    window.close()
  })

  // Show changes panel for a file
  function showFileChanges(idx) {
    const file = suggestions.files[idx]
    let html = `<div class="panel">
      <div class="panel-header">
        <span>${file.path}</span>
        <div>
          <button class="button success" onclick="applyFileChanges(${idx})">Apply All</button>
          <button class="button danger"  onclick="rejectFileChanges(${idx})">Reject All</button>
        </div>
      </div>
      <div class="panel-content">`

    file.changes.forEach((change, i) => {
      const id = `change-${idx}-${i}`
      const acc = acceptedChanges[id] === true
      const rej = acceptedChanges[id] === false

      html += `<div class="change-card" id="${id}-card">
        <div class="change-header">
          <span>Change ${i+1}: ${getChangeTypeLabel(change.type)}</span>
          <span>Lines ${change.lineStart}${change.lineEnd!==change.lineStart? '-' + change.lineEnd : ''}</span>
        </div>
        <div class="change-content">
          ${change.reason? `<div class="change-reason">${change.reason}</div>` : ''}
          ${diffBlock('Before', change.lineStart, change.original)}
          ${diffBlock('After',  change.lineStart, change.suggested)}
        </div>
        <div class="change-actions">
          <button class="button success" onclick="acceptChange(${idx},${i})" ${acc? 'disabled':''} ${rej? 'style="display:none"':''}>${acc? 'Accepted':'Accept'}</button>
          <button class="button danger"  onclick="rejectChange(${idx},${i})" ${rej? 'disabled':''} ${acc? 'style="display:none"':''}>${rej? 'Rejected':'Reject'}</button>
          ${ (acc||rej) ? `<button class="button secondary" onclick="resetChange(${idx},${i})">Reset</button>` : '' }
        </div>
      </div>`
    })

    html += `</div></div>`
    content.innerHTML = html
  }
  window.showFileChanges = showFileChanges

  // Helper to render a diff block
  function diffBlock(label, line, text) {
    return `<div class="diff-container">
      <div class="diff-header">${label}</div>
      <div class="diff-content">
        <div class="diff-line ${label==='Before'?'deleted':'added'}">
          <span class="diff-line-number">${line}</span>
          <span class="diff-line-content">${escapeHtml(text||'')}</span>
        </div>
      </div>
    </div>`
  }

  // Change action handlers
  function acceptChange(fIdx, cIdx) {
    const id = `change-${fIdx}-${cIdx}`
    acceptedChanges[id] = true
    const card = document.getElementById(`${id}-card`)
    const okBtn = card.querySelector('.button.success')
    const noBtn = card.querySelector('.button.danger')
    okBtn.disabled = true; okBtn.textContent='Accepted'; noBtn.style.display='none'
    addResetButton(card, fIdx, cIdx)
  }
  window.acceptChange = acceptChange

  function rejectChange(fIdx, cIdx) {
    const id = `change-${fIdx}-${cIdx}`
    acceptedChanges[id] = false
    const card = document.getElementById(`${id}-card`)
    const noBtn = card.querySelector('.button.danger')
    const okBtn = card.querySelector('.button.success')
    noBtn.disabled = true; noBtn.textContent='Rejected'; okBtn.style.display='none'
    addResetButton(card, fIdx, cIdx)
  }
  window.rejectChange = rejectChange

  function resetChange(fIdx, cIdx) {
    const id = `change-${fIdx}-${cIdx}`
    delete acceptedChanges[id]
    showFileChanges(fIdx)
  }
  window.resetChange = resetChange

  function applyFileChanges(fIdx) {
    const file = suggestions.files[fIdx]
    if (!confirm(`Apply all changes to ${file.path}? This will modify your code file.`)) return
    const changes = file.changes.map(c => ({ file: file.path, change: c }))
    applyChanges(changes)
  }
  window.applyFileChanges = applyFileChanges

  function rejectFileChanges(fIdx) {
    const file = suggestions.files[fIdx]
    if (!confirm(`Reject all changes to ${file.path}? This cannot be undone.`)) return
    file.changes.forEach((_,i) => acceptedChanges[`change-${fIdx}-${i}`]=false)
    showFileChanges(fIdx)
  }
  window.rejectFileChanges = rejectFileChanges

  function applyChanges(changes) {
    const applied = changes.map(item => ({
      file: item.file,
      line: item.change.lineStart,
      content: item.change.suggested
    }))
    console.log('Applying changes:', applied)
    const blob = new Blob([JSON.stringify({ changes: applied, timestamp: new Date().toISOString() }, null,2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = 'vibe-applied-changes.json'
    document.body.appendChild(a)
    a.click()
    URL.revokeObjectURL(url)
    document.body.removeChild(a)
    alert('Changes prepared for application. Download started.')
  }

  function addResetButton(card, fIdx, cIdx) {
    const btn = document.createElement('button')
    btn.className = 'button secondary'
    btn.textContent = 'Reset'
    btn.onclick = () => resetChange(fIdx, cIdx)
    card.querySelector('.change-actions').appendChild(btn)
  }

  function getChangeTypeLabel(type) {
    switch(type) {
      case 'replace': return 'Replace Code'
      case 'insert':  return 'Insert Code'
      case 'delete':  return 'Delete Code'
      default:        return 'Change Code'
    }
  }

  function escapeHtml(str='') {
    return str
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#039;')
  }

  // Auto-select first file
  if (suggestions.files.length) {
    const first = fileList.querySelector('.file-item')
    first && first.click()
  }
})()
