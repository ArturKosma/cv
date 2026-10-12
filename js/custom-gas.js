document.querySelectorAll('[data-table-pan-toggle]').forEach(button => {
  const figure = button.closest('.gas-ability-table');
  button.addEventListener('click', () => {
    const paused = figure.dataset.paused !== 'true';
    figure.dataset.paused = String(paused);
    button.setAttribute('aria-pressed', String(paused));
    button.textContent = paused ? 'Resume scroll' : 'Pause scroll';
  });
});
