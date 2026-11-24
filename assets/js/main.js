(() => {
  // Header border once the page is scrolled
  const header = document.querySelector('.site-header');
  const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Footer year
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  const reveals = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    reveals.forEach((el) => el.classList.add('visible'));
    return;
  }

  // Fade sections in as they scroll into view
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.05 });
  reveals.forEach((el) => revealObserver.observe(el));

  // Highlight the nav link for the section in view
  const links = [...document.querySelectorAll('.nav-links a[href^="#"]')];
  const sections = links
    .map((a) => document.querySelector(a.getAttribute('href')))
    .filter(Boolean);
  const navObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      links.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + entry.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach((s) => navObserver.observe(s));
})();
