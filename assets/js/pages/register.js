/*
  Halaman Pendaftaran.
  Peran yang bisa dipilih: siswa atau guru. Admin ditetapkan terpisah.
*/
import { signUp, getSession } from "../modules/auth.js";
import { el, toast } from "../modules/ui.js";

getSession().then((s) => {
  if (s) window.location.replace("index.html");
});

const root = document.getElementById("auth-root");

const fullName = el("input", { type: "text", placeholder: "Nama lengkap" });
const email = el("input", { type: "email", placeholder: "email@contoh.com" });
const password = el("input", { type: "password", placeholder: "Minimal 6 karakter" });
const role = el("select", {}, [
  el("option", { value: "siswa", text: "Siswa" }),
  el("option", { value: "guru", text: "Guru" }),
]);

const btn = el("button", {
  class: "btn btn-primary btn-block mt-8",
  text: "Daftar",
  onClick: async () => {
    if (!fullName.value || !email.value || !password.value)
      return toast("Lengkapi semua kolom", "error");
    btn.disabled = true;
    btn.textContent = "Memproses...";
    try {
      const data = await signUp({
        fullName: fullName.value.trim(),
        email: email.value.trim(),
        password: password.value,
        role: role.value,
      });
      if (data.session) {
        window.location.replace("index.html");
      } else {
        toast("Pendaftaran berhasil. Silakan masuk (cek email bila perlu verifikasi).", "success");
        setTimeout(() => window.location.replace("login.html"), 1800);
      }
    } catch (e) {
      toast(e.message, "error");
      btn.disabled = false;
      btn.textContent = "Daftar";
    }
  },
});

root.append(
  el("div", { class: "field" }, [el("label", { text: "Nama lengkap" }), fullName]),
  el("div", { class: "field" }, [el("label", { text: "Email" }), email]),
  el("div", { class: "field" }, [el("label", { text: "Kata sandi" }), password]),
  el("div", { class: "field" }, [el("label", { text: "Daftar sebagai" }), role]),
  btn,
  el("p", { class: "muted text-center mt-16" }, [
    "Sudah punya akun? ",
    el("a", { href: "login.html", text: "Masuk di sini" }),
  ])
);
