/* Keyboard navigation supplements the existing tab click handlers. */
(function () {
  document.addEventListener('keydown', function (event) {
    var tab = event.target.closest && event.target.closest('[role="tab"]');
    if (!tab || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    var tabs = Array.from(tab.closest('[role="tablist"]').querySelectorAll('[role="tab"]'));
    var index = tabs.indexOf(tab);
    if (event.key === 'Home') index = 0;
    else if (event.key === 'End') index = tabs.length - 1;
    else index = (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    event.preventDefault();
    tabs[index].focus({ preventScroll: true });
    tabs[index].click();
  });
})();
