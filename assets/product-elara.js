(function(){
    const root = document.querySelector('.elara-product'); if(!root) return;
    const form = root.querySelector('form[action="/cart/add"]');
    const variantIdInput = form?.querySelector('input[name="id"]');
    const data = JSON.parse(root.querySelector('[type="application/json"]').textContent); // product JSON
  
    // swatches → update variant
    root.addEventListener('click', (e)=>{
      const b = e.target.closest('.elara-swatch'); if(!b) return;
      const optName = b.parentElement.dataset.opt;
      const value = b.dataset.value;
      // update active
      b.parentElement.querySelectorAll('.elara-swatch').forEach(x=>x.classList.toggle('is-active', x===b));
      // compute desired options
      const current = root.dataset.opts ? JSON.parse(root.dataset.opts) : {};
      current[optName] = value; root.dataset.opts = JSON.stringify(current);
      // find variant
      const opts = data.options; // array of names
      const want = opts.map(n=>current[n]);
      const v = data.variants.find(v=>JSON.stringify(v.options)===JSON.stringify(want)) || data.variants[0];
      variantIdInput.value = v.id;
      root.querySelector('.elara-price').innerHTML = v.available ? v.price_html : 'Sold out';
      root.querySelector('.elara-atc').disabled = !v.available;
      // update image if present
      if (v.featured_image && root.querySelector('.elara-gallery img'))
        root.querySelector('.elara-gallery img').src = v.featured_image.src;
    });
  
    // size guide drawer
    const sgBtn = root.querySelector('.elara-sizeguide');
    const drawer = document.getElementById('elaraSizeGuide');
    if (sgBtn && drawer) {
      const close = drawer.querySelector('.elara-drawer__close');
      sgBtn.addEventListener('click', ()=> drawer.hidden=false);
      close.addEventListener('click', ()=> drawer.hidden=true);
      drawer.addEventListener('click', (e)=>{ if(e.target===drawer) drawer.hidden=true; });
    }
  })();
  