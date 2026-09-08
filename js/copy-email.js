/**
 * Contact email: click copies the address instead of opening a mail client.
 * Drag-select still works for manual copy (click-to-copy is skipped after a drag
 * or when text is already selected).
 */
(function () {
  const link = document.querySelector(
    "a.contact-email[href^='mailto:'], a.contact-row--primary[href^='mailto:']"
  );
  if (!link) return;

  const label = link.querySelector(".contact-value");
  const email = (link.getAttribute("href") || "").replace(/^mailto:/i, "").split("?")[0];
  if (!email || !label) return;

  const original = label.textContent.trim() || email;
  let resetTimer = 0;
  let dragMoved = false;
  let pointerX = 0;
  let pointerY = 0;

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

  function hasEmailSelection() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return false;
    return link.contains(sel.anchorNode) || link.contains(sel.focusNode);
  }

  link.addEventListener("pointerdown", (event) => {
    dragMoved = false;
    pointerX = event.clientX;
    pointerY = event.clientY;
  });

  link.addEventListener("pointermove", (event) => {
    if (event.buttons === 0) return;
    if (Math.abs(event.clientX - pointerX) > 3 || Math.abs(event.clientY - pointerY) > 3) {
      dragMoved = true;
    }
  });

  link.addEventListener("click", (event) => {
    event.preventDefault();
    if (dragMoved || hasEmailSelection()) return;
    copyEmail().then(flashCopied);
  });
})();
