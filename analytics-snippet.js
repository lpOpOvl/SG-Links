/* SG Links Analytics — add this at the end of <body> in index.html */
(function () {
  'use strict';

  var sid = sessionStorage.getItem('_sgl_sid');
  if (!sid) {
    sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem('_sgl_sid', sid);
  }

  function getDevice() {
    return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
  }

  function send(mode) {
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: '/', mode: mode, device: getDevice(), session: sid }),
      keepalive: true,
    }).catch(function () {});
  }

  // Initial page visit after 3 s delay
  setTimeout(function () {
    send('home');

    // Track which link card the user clicks
    document.querySelectorAll('a.card').forEach(function (card) {
      card.addEventListener('click', function () {
        var titleEl = card.querySelector('.card-title');
        var mode = titleEl ? titleEl.textContent.trim().slice(0, 64) : 'link';
        send(mode);
      });
    });
  }, 3000);
}());
