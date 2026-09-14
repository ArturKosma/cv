/**
 * About contact lines: click copies email / phone.
 * Email text is not a mailto link so drag-select works; copy is skipped
 * after a drag or when text is selected. Phone is not selectable.
 */
(function () {
  async function writeClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const field = document.createElement("textarea");
      field.value = text;
      field.setAttribute("readonly", "");
      field.style.cssText = "position:fixed;left:-9999px;top:0";
      document.body.appendChild(field);
      field.select();
      document.execCommand("copy");
      field.remove();
    }
  }

  function bindCopy(el, { text, ariaLabel, allowSelect }) {
    const label = el.querySelector(".contact-value");
    if (!el || !label || !text) return;

    const original = label.textContent.trim() || text;
    let resetTimer = 0;
    let dragMoved = false;
    let pointerX = 0;
    let pointerY = 0;

    el.setAttribute("aria-label", ariaLabel);
    el.setAttribute("title", "Click to copy");

    function flashCopied() {
      window.clearTimeout(resetTimer);
      label.textContent = "Copied";
      el.classList.add("is-copied");
      resetTimer = window.setTimeout(() => {
        label.textContent = original;
        el.classList.remove("is-copied");
      }, 1200);
    }

    function hasSelection() {
      if (!allowSelect) return false;
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) return false;
      return el.contains(sel.anchorNode) || el.contains(sel.focusNode);
    }

    el.addEventListener("pointerdown", (event) => {
      dragMoved = false;
      pointerX = event.clientX;
      pointerY = event.clientY;
    });

    el.addEventListener("pointermove", (event) => {
      if (event.buttons === 0) return;
      if (
        Math.abs(event.clientX - pointerX) > 3 ||
        Math.abs(event.clientY - pointerY) > 3
      ) {
        dragMoved = true;
      }
    });

    function onActivate(event) {
      if (
        event.type === "keydown" &&
        event.key !== "Enter" &&
        event.key !== " "
      ) {
        return;
      }
      if (event.type === "keydown") event.preventDefault();
      if (dragMoved || hasSelection()) return;
      writeClipboard(text).then(flashCopied);
    }

    el.addEventListener("click", onActivate);
    el.addEventListener("keydown", onActivate);
  }

  const email = document.querySelector(".contact-email");
  if (email) {
    const address =
      email.getAttribute("data-copy") ||
      (email.querySelector(".contact-value")?.textContent || "").trim();
    bindCopy(email, {
      text: address,
      ariaLabel: `Copy email ${address}`,
      allowSelect: true,
    });
  }

  const phone = document.querySelector(".contact-phone");
  if (phone) {
    const raw =
      phone.getAttribute("data-copy") ||
      (phone.querySelector(".contact-value")?.textContent || "").replace(
        /[^\d+]/g,
        ""
      );
    bindCopy(phone, {
      text: raw,
      ariaLabel: `Copy phone ${
        phone.querySelector(".contact-value")?.textContent.trim() || raw
      }`,
      allowSelect: false,
    });
  }
})();
