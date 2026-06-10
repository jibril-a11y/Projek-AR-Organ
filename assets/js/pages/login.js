/*
  Halaman Login.
*/
import { signIn, getSession } from "../modules/auth.js";
import { el, toast } from "../modules/ui.js";

// Bila sudah login, langsung ke beranda.
getSession().then((s) => {
  if (s) window.location.replace("index.html");
});

const root = document.getElementById("auth-root");

const email = el("input", { type: "email", placeholder: "email@contoh.com" });
const password = el("input", { type: "password", placeholder: "Kata sandi" });

const btn = el("button", {
  class: "btn btn-primary btn-block mt-8",
  text: "Masuk",
  onClick: async () => {
    if (!email.value || !password.value) return toast("Isi email dan kata sandi", "error");
    btn.disabled = true;
    btn.textContent = "Memproses...";
    try {
      await signIn({ email: email.value.trim(), password: password.value });
      window.location.replace("index.html");
    } catch (e) {
      toast(e.message, "error");
      btn.disabled = false;
      btn.textContent = "Masuk";
    }
  },
});

root.append(
  el("div", { class: "field" }, [el("label", { text: "Email" }), email]),
  el("div", { class: "field" }, [el("label", { text: "Kata sandi" }), password]),
  btn,
  el("p", { class: "muted text-center mt-16" }, [
    "Belum punya akun? ",
    el("a", { href: "register.html", text: "Daftar di sini" }),
  ])
);

// Tekan Enter untuk masuk.
[email, password].forEach((i) =>
  i.addEventListener("keydown", (e) => e.key === "Enter" && btn.click())
);
