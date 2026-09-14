const toast = document.getElementById("toast");
const showToast = (message, error = false) => {
  toast.textContent = message;
  toast.className = `toast show${error ? " error" : ""}`;
  setTimeout(() => toast.className = "toast", 2800);
};

const loginView = document.getElementById("loginView");
const signupView = document.getElementById("signupView");

document.getElementById("showSignup").onclick = () => {
  loginView.classList.add("hidden");
  signupView.classList.remove("hidden");
};
document.getElementById("showLogin").onclick = () => {
  signupView.classList.add("hidden");
  loginView.classList.remove("hidden");
};

if (!BizPlus.configured) {
  showToast("Add your Supabase URL and Publishable Key in supabase.js.", true);
}

document.getElementById("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!BizPlus.supabase) return showToast("Supabase is not configured.", true);

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  const { error } = await BizPlus.supabase.auth.signInWithPassword({ email, password });
  if (error) return showToast(error.message, true);
  location.href = "app.html";
});

document.getElementById("signupForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!BizPlus.supabase) return showToast("Supabase is not configured.", true);

  const name = document.getElementById("signupName").value.trim();
  const business = document.getElementById("signupBusiness").value.trim();
  const email = document.getElementById("signupEmail").value.trim();
  const password = document.getElementById("signupPassword").value;
  const confirm = document.getElementById("signupConfirm").value;

  if (password !== confirm) return showToast("Passwords do not match.", true);

  const { data, error } = await BizPlus.supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name, business_name: business } }
  });

  if (error) return showToast(error.message, true);

  if (data.session) {
    location.href = "app.html";
  } else {
    showToast("Account created. Check your email if confirmation is enabled.");
    document.getElementById("showLogin").click();
  }
});