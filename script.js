/* script.js — Auto-fit de tooltips usando los límites de la IMAGEN (#base)
   Requiere en el HTML los ids: #board, #base, #hotspots, #coords
   Y que data.js defina window.HOTSPOTS = [{x,y,n,title,text}, ...]
*/
(function () {
  const board  = document.getElementById('board');     // contenedor visual
  const img    = document.getElementById('base');      // IMAGEN: límites reales
  const layer  = document.getElementById('hotspots');  // capa para hotspots
  const coords = document.getElementById('coords');    // visor modo coordenadas
  let coordMode = false;

  // ---------- Render básico desde data.js ----------
  function render() {
    if (!Array.isArray(window.HOTSPOTS)) {
      console.warn('No hay HOTSPOTS en data.js'); return;
    }
    layer.innerHTML = '';

    window.HOTSPOTS.forEach(h => {
      const btn = document.createElement('button');
      btn.className = 'hotspot';
      btn.type = 'button';
      btn.style.left = (h.x || 0) + '%';
      btn.style.top  = (h.y || 0) + '%';
      btn.setAttribute('aria-label', h.title || 'Detalle');

      const n = (h.n ?? '') + '';
      const title = (h.title || 'Detalle').replace(/</g, '&lt;');
      const text  = (h.text  || '').replace(/</g, '&lt;');

      btn.innerHTML = `
        <span class="num">${n}</span>
        <span class="tip" role="tooltip">
          <h3>${title}</h3>
          <p>${text}</p>
        </span>
      `;

      // Si en data.js pusiste orientaciones fijas, respétalas:
      if (h.align === 'left' || h.align === 'right') btn.dataset.align = h.align;
      if (h.vpos === 'top' || h.vpos === 'bottom')   btn.dataset.vpos  = h.vpos;

      // Ajuste automático al entrar con mouse/teclado
      btn.addEventListener('pointerenter', () => fitTooltip(btn));
      btn.addEventListener('focus', () => fitTooltip(btn));

      layer.appendChild(btn);
    });
  }

  // ---------- Orientaciones que entiende el CSS ----------
  function setOrientation(h, orient) {
    // orient = 'top' (default), 'bottom', 'left', 'right'
    // Limpiar
    h.removeAttribute('data-align');
    h.removeAttribute('data-vpos');

    if (orient === 'left' || orient === 'right') {
      h.dataset.align = orient;           // CSS mueve a izquierda/derecha
    } else if (orient === 'bottom') {
      h.dataset.vpos = 'bottom';          // CSS mueve debajo
    } else if (orient === 'top') {
      h.dataset.vpos = 'top';             // explícito (aunque top es el default)
    }
  }

  function fits(rect, bounds, pad) {
    return rect.left   >= bounds.left + pad &&
           rect.right  <= bounds.right - pad &&
           rect.top    >= bounds.top  + pad &&
           rect.bottom <= bounds.bottom - pad;
  }

  // ---------- Cálculo de orientación que sí cabe dentro de la IMAGEN ----------
  function fitTooltip(hotspot) {
    const tip = hotspot.querySelector('.tip');
    if (!tip) return;

    // Límites: rectángulo de la IMAGEN (#base), no del contenedor
    const bounds = img.getBoundingClientRect();
    const pad = 6;

    // Orden de prueba: derecha, izquierda, abajo, arriba
    const ORDER = ['right', 'left', 'bottom', 'top'];

    for (const o of ORDER) {
      setOrientation(hotspot, o);
      // Forzar reflow para medir con la orientación aplicada
      void tip.offsetWidth;
      const r = tip.getBoundingClientRect();
      if (fits(r, bounds, pad)) return; // cabe → nos quedamos con esta
    }

    // Fallback: arriba (centrado) que es el estilo por defecto del CSS
    setOrientation(hotspot, 'top');
  }

  // ---------- Modo coordenadas (tecla E) ----------
  function toggleCoordMode() {
    coordMode = !coordMode;
    coords.hidden = !coordMode;
    if (coordMode) coords.textContent = 'Modo coordenadas: clic copia { x:%, y:% }';
  }

  function onMove(e) {
    if (!coordMode) return;
    const r = img.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    coords.textContent = `x:${x.toFixed(2)}%  y:${y.toFixed(2)}%`;
  }

  function onClick(e) {
    if (!coordMode) return;
    const r = img.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    const snippet = `{ x: ${x.toFixed(2)}, y: ${y.toFixed(2)}, n: 0, title: "Título", text: "Descripción" },`;
    try { navigator.clipboard.writeText(snippet); } catch {}
    coords.textContent = `Copiado: ${snippet}`;
  }

  // ---------- Inicialización ----------
  window.addEventListener('load', () => {
    render();

    // Ajuste inicial cuando la imagen tenga tamaño
    const adjustAll = () =>
      layer.querySelectorAll('.hotspot').forEach(h => fitTooltip(h));

    if (img.complete) adjustAll();
    else img.addEventListener('load', adjustAll);

    // Segundo ajuste por si cambian fuentes/layout
    setTimeout(adjustAll, 120);
  });

  // Recalcular al redimensionar
  window.addEventListener('resize', () => {
    layer.querySelectorAll('.hotspot').forEach(h => fitTooltip(h));
  });

  // Eventos de modo coordenadas
  document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'e') toggleCoordMode();
  });
  img.addEventListener('mousemove', onMove);
  img.addEventListener('click', onClick);
})();
