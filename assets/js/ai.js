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

  // Cosmic background: drifting, twinkling stars with the odd shooting star.
  // Drawn once and left still when the visitor prefers reduced motion.
  const sky = $('.cosmos');
  const ctx = sky && sky.getContext ? sky.getContext('2d') : null;
  if (ctx) {
    const TINTS = ['255,255,255', '246,227,176', '156,192,240']; // white, pale gold, steel blue
    const rand = (a, b) => a + Math.random() * (b - a);
    let w = 0;
    let h = 0;
    let stars = [];
    let shot = null;
    let nextShot = 0;
    let last = 0;
    const build = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      sky.width = Math.round(w * dpr);
      sky.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(340, (w * h) / 3800));
      stars = Array.from({ length: count }, () => {
        const z = Math.random() ** 1.6; // most stars far away, a few close
        const roll = Math.random();
        return {
          x: rand(0, w), y: rand(0, h), z, r: 0.35 + z * 1.4,
          tint: TINTS[roll < 0.7 ? 0 : roll < 0.86 ? 1 : 2],
          a: rand(0.35, 0.95), speed: rand(0.5, 2.2), phase: rand(0, Math.PI * 2),
        };
      });
    };
    const draw = (t, dt) => {
      ctx.clearRect(0, 0, w, h);
      const lift = window.scrollY;
      for (const s of stars) {
        s.x -= (0.004 + s.z * 0.02) * dt;
        if (s.x < -3) { s.x = w + 3; s.y = rand(0, h); }
        const y = (((s.y - lift * (0.04 + s.z * 0.18)) % h) + h) % h; // parallax while scrolling
        const alpha = s.a * (0.6 + 0.4 * Math.sin((t / 1000) * s.speed + s.phase));
        if (s.r > 1.3) { // soft glow around the nearest stars
          ctx.fillStyle = `rgba(${s.tint},${alpha * 0.18})`;
          ctx.beginPath(); ctx.arc(s.x, y, s.r * 3.2, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = `rgba(${s.tint},${alpha})`;
        ctx.beginPath(); ctx.arc(s.x, y, s.r, 0, Math.PI * 2); ctx.fill();
      }
      if (reduce) return;
      if (!shot && t > nextShot) {
        shot = { x: rand(w * 0.3, w * 1.05), y: rand(-20, h * 0.35), life: 0 };
        nextShot = t + rand(6000, 13000);
      }
      if (shot) {
        shot.life += dt;
        const p = shot.life / 900;
        const hx = shot.x - p * 420;
        const hy = shot.y + p * 210;
        const tail = ctx.createLinearGradient(hx, hy, hx + 110, hy - 55);
        tail.addColorStop(0, `rgba(246,227,176,${0.85 * (1 - p)})`);
        tail.addColorStop(1, 'rgba(246,227,176,0)');
        ctx.strokeStyle = tail;
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + 110, hy - 55); ctx.stroke();
        if (p >= 1) shot = null;
      }
    };
    const frame = (t) => {
      const dt = Math.min(t - (last || t), 50);
      last = t;
      draw(t, dt);
      requestAnimationFrame(frame);
    };
    build();
    nextShot = 2500;
    if (reduce) draw(0, 0);
    else requestAnimationFrame(frame);
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => { build(); if (reduce) draw(0, 0); }, 150);
    });
    if (reduce) window.addEventListener('scroll', () => draw(0, 0), { passive: true });
  }

  // Profile guide: pre-written answers streamed word by word, plus typed
  // questions answered by Claude when the chat Worker is configured.
  const agent = $('#agent');
  if (!agent) return;
  const thread = $('#agent-thread', agent);
  const asks = $$('.ask', agent);
  const form = $('#agent-form', agent);
  const input = $('#agent-input', agent);
  const sendBtn = $('.agent-send', agent);
  const endpoint = (agent.dataset.api || '').trim().replace(/\/+$/, '');
  const live = Boolean(endpoint && form && window.fetch && window.TextDecoder && window.ReadableStream);
  const EMAIL = 'gsubrama94@outlook.com';
  const MAX_HISTORY = 12;
  const MAX_QUESTIONS = 20;
  const history = []; // what the AI sees: answers shown so far, as plain text
  let timer;
  let pending = null; // finishes a pre-written answer that is still "typing"
  let busy = false;
  let asked = 0;

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

  // Plain-text version of a pre-written answer, so the AI can follow up on it
  const toPlain = (root) => {
    const parts = [];
    root.childNodes.forEach((n) => {
      if (n.nodeType === 1 && (n.tagName === 'OL' || n.tagName === 'UL')) {
        $$('li', n).forEach((li, i) => {
          parts.push(`${n.tagName === 'OL' ? `${i + 1}.` : '-'} ${li.textContent.replace(/\s+/g, ' ').trim()}`);
        });
      } else {
        const t = n.textContent.replace(/\s+/g, ' ').trim();
        if (t) parts.push(t);
      }
    });
    return parts.join('\n');
  };

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };
  const nearBottom = () => thread.scrollHeight - thread.scrollTop - thread.clientHeight < 80;
  const toBottom = () => { if (live) thread.scrollTop = thread.scrollHeight; };
  const typingDots = () => {
    const t = el('div', 'typing');
    t.setAttribute('aria-hidden', 'true');
    t.innerHTML = '<i></i><i></i><i></i>';
    return t;
  };
  const flush = () => { if (pending) { clearTimeout(timer); const f = pending; pending = null; f(); } };

  // Pre-written answers. Without the AI they replace the thread; with it they
  // join the conversation so follow-up questions have context.
  const answer = (key, question, replay = false) => {
    const tpl = document.getElementById(`a-${key}`);
    if (!tpl) return;
    flush();
    asks.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.q === key)));

    if (!live || replay) thread.textContent = '';
    thread.appendChild(el('div', 'msg user', question));
    const a = el('div', 'msg bot');
    a.appendChild(tpl.content.cloneNode(true));
    if (live && !replay) {
      history.push({ role: 'user', content: question }, { role: 'assistant', content: toPlain(tpl.content) });
    }

    if (reduce) { thread.appendChild(a); toBottom(); return; }

    const typing = typingDots();
    thread.appendChild(typing);
    toBottom();
    pending = () => {
      typing.remove();
      const words = wrapWords(a);
      a.classList.add('streaming');
      thread.appendChild(a);
      toBottom();
      setTimeout(() => a.classList.remove('streaming'), words * 18 + 400);
    };
    timer = setTimeout(flush, 700);
  };

  // Answers to clicked questions are announced; the automatic intro replay is not
  const enableLive = () => {
    thread.setAttribute('role', 'log');
    thread.setAttribute('aria-live', 'polite');
  };
  let intro;
  asks.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (busy) return; // wait for the AI answer that is streaming
      clearTimeout(intro);
      enableLive();
      answer(btn.dataset.q, btn.textContent.trim());
    });
  });

  // Render the AI's plain-text answer safely: paragraphs, "- " or "1." lists,
  // **bold**, and links only to Ganesh's own email, LinkedIn, WhatsApp and site.
  const SAFE_LINKS = /^https:\/\/(www\.)?linkedin\.com\/in\/ganesh-s-aa0b27b\/?$|^https:\/\/wa\.me\/16472733595\/?$|^https:\/\/gsubrama2010-infra\.github\.io(\/[\w./#-]*)?$/;
  const inline = (parent, text) => {
    const re = /\*\*(.+?)\*\*|([\w.+-]+@[\w-]+(?:\.[\w-]+)+)|(https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"])/g;
    let last = 0;
    let m;
    while ((m = re.exec(text))) {
      if (m.index > last) parent.appendChild(document.createTextNode(text.slice(last, m.index)));
      if (m[1]) {
        parent.appendChild(el('strong', null, m[1]));
      } else if (m[2] && m[2].toLowerCase() === EMAIL) {
        const a = el('a', null, m[2]);
        a.href = `mailto:${EMAIL}`;
        parent.appendChild(a);
      } else if (m[3] && SAFE_LINKS.test(m[3])) {
        const a = el('a', null, m[3].replace(/^https:\/\/(www\.)?/, ''));
        a.href = m[3];
        a.target = '_blank';
        a.rel = 'noopener';
        parent.appendChild(a);
      } else {
        parent.appendChild(document.createTextNode(m[0]));
      }
      last = re.lastIndex;
    }
    if (last < text.length) parent.appendChild(document.createTextNode(text.slice(last)));
  };
  const render = (box, text) => {
    box.textContent = '';
    text.trim().split(/\n{2,}/).forEach((block) => {
      let list = null;
      let para = null;
      block.split('\n').forEach((raw) => {
        const line = raw.trim();
        if (!line) return;
        const item = line.match(/^(?:[-*•]|(\d+)[.)])\s+(.*)$/);
        if (item) {
          const tag = item[1] ? 'OL' : 'UL';
          if (!list || list.tagName !== tag) { list = el(tag.toLowerCase()); box.appendChild(list); }
          const li = el('li');
          inline(li, item[2]);
          list.appendChild(li);
          para = null;
        } else {
          list = null;
          if (para) para.appendChild(document.createTextNode(' '));
          else { para = el('p'); box.appendChild(para); }
          inline(para, line);
        }
      });
    });
  };

  const MESSAGES = {
    rate: `Lots of questions right now. Please wait a minute and try again, or email Ganesh at ${EMAIL}.`,
    down: `The AI guide isn't available right now. The suggested questions above still work, or email Ganesh at ${EMAIL}.`,
    cut: '(The answer was cut off. Please try asking again.)',
    refusal: "I can't help with that one, but I'm happy to answer questions about Ganesh's experience, skills and background.",
    limit: `That's the question limit for this visit. To keep talking, email Ganesh at ${EMAIL}.`,
  };

  const setBusy = (on) => {
    busy = on;
    if (sendBtn) sendBtn.disabled = on;
    asks.forEach((b) => { if (on) b.setAttribute('aria-disabled', 'true'); else b.removeAttribute('aria-disabled'); });
    if (on) thread.setAttribute('aria-busy', 'true');
    else thread.removeAttribute('aria-busy');
  };

  // Typed question: stream Claude's answer from the chat Worker
  const ask = async (question) => {
    clearTimeout(intro);
    flush();
    enableLive();
    asks.forEach((b) => b.setAttribute('aria-pressed', 'false'));
    thread.appendChild(el('div', 'msg user', question));

    if (asked >= MAX_QUESTIONS) {
      const box = el('div', 'msg bot');
      render(box, MESSAGES.limit);
      thread.appendChild(box);
      toBottom();
      return;
    }
    asked += 1;
    setBusy(true);
    history.push({ role: 'user', content: question });
    const typing = typingDots();
    thread.appendChild(typing);
    toBottom();

    const box = el('div', 'msg bot');
    let text = '';
    let stop = null;
    let failed = null;
    let paint = 0;
    const show = () => {
      paint = 0;
      const stick = nearBottom();
      if (!box.isConnected) { typing.remove(); thread.appendChild(box); }
      render(box, text);
      if (stick) toBottom();
    };

    try {
      const res = await fetch(`${endpoint}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history.slice(-MAX_HISTORY) }),
      });
      if (!res.ok || !res.body) {
        let code = '';
        try { code = (await res.json()).error || ''; } catch { /* not JSON */ }
        failed = res.status === 429 || code === 'busy' ? 'rate' : 'down';
      } else {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          let nl;
          while ((nl = buf.indexOf('\n')) >= 0) {
            const line = buf.slice(0, nl);
            buf = buf.slice(nl + 1);
            if (!line.trim()) continue;
            let ev;
            try { ev = JSON.parse(line); } catch { continue; }
            if (ev.type === 'text' && typeof ev.text === 'string') {
              text += ev.text;
              if (!paint) paint = setTimeout(show, 40);
            } else if (ev.type === 'done') {
              stop = ev.stop_reason;
            } else if (ev.type === 'error') {
              failed = 'down';
            }
          }
        }
      }
    } catch {
      failed = 'down';
    }
    clearTimeout(paint);

    let ok = false;
    if (stop === 'refusal') {
      text = MESSAGES.refusal;
    } else if (!failed && stop && text.trim()) {
      ok = true;
      if (stop === 'max_tokens') text += '…';
    } else if (text.trim()) {
      text += `\n\n${MESSAGES.cut}`;
      box.classList.add('err');
    } else {
      text = MESSAGES[failed || 'down'];
      box.classList.add('err');
    }
    show();

    if (ok) history.push({ role: 'assistant', content: text });
    else history.pop(); // drop the unanswered question so the next one starts clean
    setBusy(false);
  };

  if (live) {
    agent.classList.add('is-live');
    form.hidden = false;
    thread.tabIndex = 0;
    thread.setAttribute('aria-label', 'Conversation');
    const status = $('.agent-status', agent);
    if (status) status.textContent = 'AI guide · answers from my resume';
    const note = $('#agent-note', agent);
    if (note) note.textContent = 'Buttons show pre-written answers. Typed questions are answered by Claude (Anthropic) from my resume and can be wrong. Nothing is stored on this site.';
    // The intro answer is already on screen, so the AI can follow up on it
    const firstQ = $('.msg.user', thread);
    const firstA = document.getElementById('a-hire');
    if (firstQ && firstA) {
      history.push({ role: 'user', content: firstQ.textContent.trim() }, { role: 'assistant', content: toPlain(firstA.content) });
    }
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = input.value.replace(/\s+/g, ' ').trim();
      if (!q || busy) return;
      input.value = '';
      ask(q);
    });
    input.addEventListener('focus', () => clearTimeout(intro), { once: true });
  }

  if (reduce) { enableLive(); return; }
  intro = setTimeout(() => {
    answer('hire', 'Why should we hire Ganesh?', true);
    intro = setTimeout(enableLive, 1200);
  }, 900);
})();
