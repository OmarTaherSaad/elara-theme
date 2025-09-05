(async function(){
    const drawer = document.getElementById('elaraCart');
    if (!drawer) return;
  
    const panel = drawer.querySelector(".elara-cart__panel");
    const itemsEl = drawer.querySelector(".elara-cart__items");
    const totalEl = drawer.querySelector(".elara-cart__total .v");
    const btn = document.getElementById("elaraCartBtn");
    const countEl = document.getElementById("elaraCartCount");

    async function getCart() {
      const r = await fetch("/cart.js", {
        headers: { Accept: "application/json" },
      });
      return r.json();
    }

    function render(cart) {
      itemsEl.innerHTML = "";
      cart.items.forEach((it) => {
        const row = document.createElement("div");
        row.className = "elara-cart__item";
        row.innerHTML = `
          <img src="${it.image}" width="72" height="72" loading="lazy" />
          <div>
            <div>${it.product_title}</div>
            <div>${(it.price / 100).toFixed(2)} ${cart.currency}</div>
          </div>
          <button data-key="${it.key}" class="rm">Remove</button>`;
        itemsEl.appendChild(row);
      });
      totalEl.textContent =
        (cart.total_price / 100).toFixed(2) + " " + cart.currency;
      if (countEl) countEl.textContent = cart.item_count;
    }

    async function open() {
      render(await getCart());
      drawer.classList.add("is-open");
      document.documentElement.style.overflow = "hidden";
      panel.focus();
    }
    function close() {
      drawer.classList.remove("is-open");
      document.documentElement.style.overflow = "";
    }

    // open sources
    if (btn) btn.addEventListener("click", open);
    document.addEventListener("elara:cart:updated", open);

    // close actions
    drawer.addEventListener("click", (e) => {
      if (e.target === drawer) close();
    });
    drawer.querySelector(".elara-cart__close").addEventListener("click", close);
    addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });

    // remove line
    drawer.addEventListener("click", async (e) => {
      const rm = e.target.closest(".rm");
      if (!rm) return;
      await fetch("/cart/change.js", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ id: rm.dataset.key, quantity: 0 }),
      });
      render(await getCart());
    });

    // hydrate badge
    try {
      render(await getCart());
    } catch {}
  })();
  