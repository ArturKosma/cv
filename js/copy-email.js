/**
 * Contact email: click copies the address instead of opening a mail client.
 * Drag-select still works for manual copy (click is ignored while text is selected).
 */
(function () {
  const link = document.querySelector('a.contact-row[href^="mailto:"]');
  if (!link) return;

  const label = link.querySelector(".contact-value");
  const email = (link.getAttribute("href") || "").replace(/^mailto:/i, "").split("?")[0];
  if (!email || !label) return;

  const original = label.textContent.trim() || email;
  let resetTimer = 0;

  link.setAttribute("aria-label", `Copy email ${email}`);
  link.setAttribute("title", "Click to copy");

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(email);
    } catch {
      const field = document.createElement("textarea");
      field.value = email;
      field.setAttribute("readonly", "");
      field.style.cssText = "position:fixed;left:-9999px;top:0";
      document.body.appendChild(field);
      field.select();
      document.execCommand("copy");
      field.remove();
    }
  }

  function flashCopied() {
    window.clearTimeout(resetTimer);
    label.textContent = "Copied";
    link.classList.add("is-copied");
    resetTimer = window.setTimeout(() => {
      label.textContent = original;
      link.classList.remove("is-copied");
    }, 1200);
  }

  link.addEventListener("click", (event) => {
    event.preventDefault();
    const sel = window.getSelection();
    if (sel && !sel.isCollapsed && link.contains(sel.anchorNode)) {
      return;
    }
    copyEmail().then(flashCopied);
  });
})();
