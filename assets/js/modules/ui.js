/*
  Modul utilitas UI: pembuat elemen, toast, modal, dan dialog konfirmasi.
  Tanpa emoji.
*/

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "class") node.className = value;
    else if (key === "html") node.innerHTML = value;
    else if (key === "text") node.textContent = value;
    else if (key.startsWith("on") && typeof value === "function") {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (value !== null && value !== undefined) {
      node.setAttribute(key, value);
    }
  }
  const list = Array.isArray(children) ? children : [children];
  for (const child of list) {
    if (child == null) continue;
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
  return node;
}

function toastHost() {
  let host = document.getElementById("toast-host");
  if (!host) {
    host = el("div", { id: "toast-host" });
    document.body.appendChild(host);
  }
  return host;
}

export function toast(message, type = "info") {
  const node = el("div", { class: `toast ${type}`, text: message });
  toastHost().appendChild(node);
  setTimeout(() => {
    node.style.opacity = "0";
    node.style.transition = "opacity 0.3s ease";
    setTimeout(() => node.remove(), 300);
  }, 3400);
}

export function confirmDialog(message) {
  return new Promise((resolve) => {
    const backdrop = el("div", { class: "modal-backdrop open" });
    const box = el("div", { class: "modal", style: "max-width:420px" }, [
      el("h2", { text: "Konfirmasi" }),
      el("p", { class: "muted", text: message }),
      el("div", { class: "flex gap-8 mt-16", style: "justify-content:flex-end" }, [
        el("button", {
          class: "btn btn-ghost",
          text: "Batal",
          onClick: () => {
            backdrop.remove();
            resolve(false);
          },
        }),
        el("button", {
          class: "btn btn-danger",
          text: "Ya, lanjutkan",
          onClick: () => {
            backdrop.remove();
            resolve(true);
          },
        }),
      ]),
    ]);
    backdrop.appendChild(box);
    document.body.appendChild(backdrop);
  });
}

export function openModal(titleText, contentNode) {
  const backdrop = el("div", { class: "modal-backdrop open" });
  const close = () => backdrop.remove();
  const box = el("div", { class: "modal" }, [
    el("div", { class: "flex between center" }, [
      el("h2", { text: titleText, style: "margin:0" }),
      el("button", {
        class: "icon-btn",
        text: "Tutup",
        style: "color:var(--c-text-soft)",
        onClick: close,
      }),
    ]),
    contentNode,
  ]);
  backdrop.appendChild(box);
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) close();
  });
  document.body.appendChild(backdrop);
  return { close, box };
}
