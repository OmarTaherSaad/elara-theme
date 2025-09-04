addEventListener('click', async (e) => {
    const b = e.target.closest('.elara-qa'); if (!b) return;
    b.disabled = true;
    try {
      const body = new FormData(); body.append('id', b.dataset.variant); body.append('quantity', 1);
      const res = await fetch('/cart/add.js', { method:'POST', body, headers:{'Accept':'application/json'} });
      if (!res.ok) throw new Error('add_fail');
      b.textContent = 'Added ✓'; setTimeout(()=> b.textContent='Quick add', 1500);
      document.dispatchEvent(new CustomEvent('elara:cart:updated'));
    } catch { b.textContent = 'Error'; setTimeout(()=> b.textContent='Quick add', 1500); }
    b.disabled = false;
  });
  