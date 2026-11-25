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

  // Schematics: draw curved connectors between components (decorative; the
  // components and a text summary carry the meaning without them).
  const SVGNS = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, attrs, parent) => {
    const n = document.createElementNS(SVGNS, tag);
    Object.entries(attrs || {}).forEach(([k, v]) => n.setAttribute(k, String(v)));
    if (parent) parent.appendChild(n);
    return n;
  };
  const drawSchem = (root, index) => {
    const box = root.getBoundingClientRect();
    if (!box.width) return;
    let svg = root.querySelector(':scope > .wires');
    if (!svg) {
      svg = svgEl('svg', { class: 'wires', 'aria-hidden': 'true', focusable: 'false' });
      root.appendChild(svg);
    }
    svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
    svg.textContent = '';
    const defs = svgEl('defs', {}, svg);
    ['flow', 'manage'].forEach((kind) => {
      const m = svgEl('marker', { id: `w${index}-${kind}`, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs);
      svgEl('path', { d: 'M0 1 L10 5 L0 9 z', class: `arrowhead ${kind}` }, m);
    });
    const pos = (el) => {
      const r = el.getBoundingClientRect();
      const l = r.left - box.left;
      const t = r.top - box.top;
      return { l, t, r: l + r.width, b: t + r.height, cx: l + r.width / 2, cy: t + r.height / 2 };
    };
    const narrow = box.width < 700;
    const cards = $$('.comp', root).map((el) => ({ el, r: pos(el) }));
    // Skip a wire that would run behind another card (common once zones stack on phones)
    const blocked = (pts, from, to) => cards.some(({ el, r }) => {
      if (el === from || el === to || from.contains(el) || to.contains(el) || el.contains(from) || el.contains(to)) return false;
      return pts.some(([x, y]) => x > r.l + 2 && x < r.r - 2 && y > r.t + 2 && y < r.b - 2);
    });
    root.querySelectorAll('[data-links]').forEach((from) => {
      let links;
      try { links = JSON.parse(from.dataset.links); } catch { return; }
      const a = pos(from);
      links.forEach((link) => {
        const target = root.querySelector(`#${link.to}`);
        if (!target || (link.wide && narrow)) return;
        const b = pos(target);
        const off = link.off || 0;
        let p0;
        let p3;
        let horizontal = true;
        if (b.l >= a.r - 2) { p0 = [a.r, a.cy + off]; p3 = [b.l, b.cy + off]; }
        else if (b.r <= a.l + 2) { p0 = [a.l, a.cy + off]; p3 = [b.r, b.cy + off]; }
        else if (b.t >= a.b - 2) { horizontal = false; p0 = [a.cx + off, a.b]; p3 = [b.cx + off, b.t]; }
        else { horizontal = false; p0 = [a.cx + off, a.t]; p3 = [b.cx + off, b.b]; }
        const axis = horizontal ? 0 : 1;
        const span = p3[axis] - p0[axis];
        const bend = Math.sign(span || 1) * Math.max(Math.abs(span) / 2, 16);
        const p1 = horizontal ? [p0[0] + bend, p0[1]] : [p0[0], p0[1] + bend];
        const p2 = horizontal ? [p3[0] - bend, p3[1]] : [p3[0], p3[1] - bend];
        const curve = (t, k) => {
          const u = 1 - t;
          return u * u * u * p0[k] + 3 * u * u * t * p1[k] + 3 * u * t * t * p2[k] + t * t * t * p3[k];
        };
        const samples = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9].map((t) => [curve(t, 0), curve(t, 1)]);
        if (blocked(samples, from, target)) return;
        const d = `M${p0} C${p1} ${p2} ${p3}`;
        const kind = link.kind === 'manage' ? 'manage' : 'flow';
        svgEl('path', { d, class: `wire ${kind}`, 'marker-end': `url(#w${index}-${kind})` }, svg);
        if (kind === 'flow' && !reduce) {
          const dot = svgEl('circle', { r: 3, class: 'packet' }, svg); // moved along the wire by animateMotion
          svgEl('animateMotion', { dur: `${(2.4 + Math.abs(span) / 260).toFixed(2)}s`, repeatCount: 'indefinite', path: d }, dot);
        }
        if (link.label) {
          // Point on the curve at t (default: the middle)
          const t = link.at || 0.5;
          let mx = curve(t, 0);
          let my = curve(t, 1);
          const g = svgEl('g', { class: `wire-label ${kind}` }, svg);
          const rect = svgEl('rect', { rx: 6 }, g);
          const text = svgEl('text', { x: mx, y: my, 'text-anchor': 'middle', 'dominant-baseline': 'central' }, g);
          text.textContent = link.label;
          let bb = text.getBBox();
          if (off) { // paired wires: push each label out to its own side
            if (horizontal) my += Math.sign(off) * (bb.height / 2 + 5);
            else mx += Math.sign(off) * (bb.width / 2 + 8);
            text.setAttribute('x', mx);
            text.setAttribute('y', my);
            bb = text.getBBox();
          }
          rect.setAttribute('x', bb.x - 6);
          rect.setAttribute('y', bb.y - 3);
          rect.setAttribute('width', bb.width + 12);
          rect.setAttribute('height', bb.height + 6);
        }
      });
    });
  };
  const schems = $$('.schem');
  if (schems.length) {
    const redraw = () => schems.forEach(drawSchem);
    let pending = 0;
    const queue = () => { cancelAnimationFrame(pending); pending = requestAnimationFrame(redraw); };
    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(queue);
      schems.forEach((el) => ro.observe(el));
    } else {
      window.addEventListener('resize', queue);
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(queue);
    window.addEventListener('load', queue);
    queue();
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
