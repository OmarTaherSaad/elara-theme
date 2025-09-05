(async function(){
    const drawer = document.getElementById('elaraCart');
    if (!drawer) return;
    const itemsEl = drawer.querySelector('.elara-cart__items');
    const totalEl = drawer.querySelector('.elara-cart__total .v');
  
    async function getCart(){ const r = await fetch('/cart.js'); return r.json(); }
    function render(cart){
      itemsEl.innerHTML = '';
      cart.items.forEach(it=>{
        const row = document.createElement('div'); row.className='elara-cart__item';
        row.innerHTML = `
          <img src="${it.image}" width="72" height="72" loading="lazy" />
          <div>
            <div>${it.product_title}</div>
            <div>${(it.price/100).toFixed(2)} ${cart.currency}</div>
          </div>
          <button data-key="${it.key}" class="rm">Remove</button>`;
        itemsEl.appendChild(row);
      });
      totalEl.textContent = (cart.total_price/100).toFixed(2) + ' ' + cart.currency;
    }
    async function open(){ drawer.hidden = false; render(await getCart()); }
    function close(){ drawer.hidden = true; }
    drawer.addEventListener('click', e=>{ if(e.target===drawer) close(); });
    drawer.querySelector('.elara-cart__close').addEventListener('click', close);
  
    document.addEventListener('elara:cart:updated', open);
    addEventListener('click', async e=>{
      const rm = e.target.closest('.rm'); if(!rm) return;
      await fetch('/cart/change.js', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({id: rm.dataset.key, quantity: 0})});
      render(await getCart());
    });
  
    // Open via header cart icon later; for now open on add-to-cart
  })();
  