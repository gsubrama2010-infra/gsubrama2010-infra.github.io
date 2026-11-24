/* Alternative "AI-native" design: progressive enhancements only.
   The page is fully readable without this script. */
(() => {
  'use strict';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // Footer year
  const year = $('#year');
  if (year) year.textContent = String(new Date().getFullYear());

  // Header background once the page scrolls
  const header = $('.hdr');
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Mobile menu
  const menuBtn = $('.menu-btn');
  const menu = $('#site-menu');
  const setMenu = (open) => {
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    header.classList.toggle('menu-open', open);
  };
  menuBtn.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && header.classList.contains('menu-open')) { setMenu(false); menuBtn.focus(); }
  });
  document.addEventListener('click', (e) => {
    if (header.classList.contains('menu-open') && !header.contains(e.target)) setMenu(false);
  });
  window.matchMedia('(min-width: 861px)').addEventListener('change', (m) => { if (m.matches) setMenu(false); });

  // Reveal on scroll
  const reveals = $$('.rv');
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('in'));
  }

  // Count-up numbers (final values are already in the HTML)
  const counters = $$('[data-count]');
  if ('IntersectionObserver' in window && !reduce) {
    const fmt = (n) => n.toLocaleString('en-US');
    const run = (el) => {
      const end = Number(el.dataset.count);
      const dur = 1100;
      const t0 = performance.now();
      const tick = () => {
        const p = Math.min((performance.now() - t0) / dur, 1);
        el.textContent = fmt(Math.round(end * (1 - Math.pow(1 - p, 3))));
        if (p < 1) setTimeout(tick, 32);
      };
      tick();
    };
    const co = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { run(en.target); co.unobserve(en.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach((el) => co.observe(el));
  }

  // Active section in the nav
  const navLinks = $$('.nav-links a[href^="#"]');
  const byId = new Map(navLinks.map((a) => [a.getAttribute('href').slice(1), a]));
  if ('IntersectionObserver' in window) {
    const so = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        navLinks.forEach((a) => { a.classList.remove('active'); a.removeAttribute('aria-current'); });
        const link = byId.get(en.target.id);
        if (link) { link.classList.add('active'); link.setAttribute('aria-current', 'location'); }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    byId.forEach((_, id) => { const s = document.getElementById(id); if (s) so.observe(s); });
  }

  // Spotlight that follows the pointer on cards (fine pointers only)
  if (!reduce && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    $$('.spot').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${e.clientX - r.left}px`);
        card.style.setProperty('--my', `${e.clientY - r.top}px`);
      });
    });
  }

  // Profile guide: pre-written answers, streamed word by word
  const agent = $('#agent');
  if (!agent) return;
  const thread = $('#agent-thread', agent);
  const asks = $$('.ask', agent);
  let timer;

  // Wrap every word in a span so it can fade in; the full text is in the DOM at once
  const wrapWords = (root) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    let i = 0;
    nodes.forEach((node) => {
      const frag = document.createDocumentFragment();
      node.nodeValue.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
        const s = document.createElement('span');
        s.className = 'w';
        s.style.setProperty('--i', String(i++));
        s.textContent = part;
        frag.appendChild(s);
      });
      node.parentNode.replaceChild(frag, node);
    });
    return i;
  };

  const answer = (key, question) => {
    const tpl = document.getElementById(`a-${key}`);
    if (!tpl) return;
    clearTimeout(timer);
    asks.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.q === key)));

    thread.textContent = '';
    const q = document.createElement('div');
    q.className = 'msg user';
    q.textContent = question;
    thread.appendChild(q);

    const a = document.createElement('div');
    a.className = 'msg bot';
    a.appendChild(tpl.content.cloneNode(true));

    if (reduce) { thread.appendChild(a); return; }

    const typing = document.createElement('div');
    typing.className = 'typing';
    typing.setAttribute('aria-hidden', 'true');
    typing.innerHTML = '<i></i><i></i><i></i>';
    thread.appendChild(typing);

    timer = setTimeout(() => {
      typing.remove();
      const words = wrapWords(a);
      a.classList.add('streaming');
      thread.appendChild(a);
      timer = setTimeout(() => a.classList.remove('streaming'), words * 18 + 400);
    }, 700);
  };

  // Answers to clicked questions are announced; the automatic intro replay is not
  const enableLive = () => {
    thread.setAttribute('role', 'log');
    thread.setAttribute('aria-live', 'polite');
  };
  let intro;
  asks.forEach((btn) => {
    btn.addEventListener('click', () => {
      clearTimeout(intro);
      enableLive();
      answer(btn.dataset.q, btn.textContent.trim());
    });
  });

  if (reduce) { enableLive(); return; }
  intro = setTimeout(() => {
    answer('hire', 'Why should we hire Ganesh?');
    intro = setTimeout(enableLive, 1200);
  }, 900);
})();
