(function () {
  const body = document.body;
  const toggle = document.getElementById('menu-toggle');
  const nav = document.getElementById('site-nav');
  const navLinks = nav ? Array.from(nav.querySelectorAll('a[href^="#"]')) : [];

  if (toggle) {
    toggle.addEventListener('click', function () {
      const isOpen = body.classList.toggle('menu-open');
      toggle.setAttribute('aria-expanded', String(isOpen));
    });
  }

  navLinks.forEach(function (link) {
    link.addEventListener('click', function () {
      body.classList.remove('menu-open');
      if (toggle) {
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  });

  const sectionIds = navLinks
    .map(function (link) {
      const id = link.getAttribute('href');
      return id ? id.slice(1) : null;
    })
    .filter(Boolean);

  const sections = sectionIds
    .map(function (id) {
      return document.getElementById(id);
    })
    .filter(Boolean);

  const observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        const id = entry.target.getAttribute('id');
        navLinks.forEach(function (link) {
          const isActive = link.getAttribute('href') === '#' + id;
          link.classList.toggle('active', isActive);
        });
      });
    },
    { threshold: 0.35 }
  );

  sections.forEach(function (section) {
    observer.observe(section);
  });

  const revealTargets = Array.from(document.querySelectorAll('[data-reveal]'));
  if (revealTargets.length > 0) {
    const revealObserver = new IntersectionObserver(
      function (entries, io) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
    );

    revealTargets.forEach(function (el) {
      revealObserver.observe(el);
    });
  }

  const year = document.getElementById('year');
  if (year) {
    year.textContent = String(new Date().getFullYear());
  }
})();
