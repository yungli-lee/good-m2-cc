(function () {
  var form = document.getElementById("admin-login-form");
  var message = document.getElementById("admin-login-message");

  if (!form || !message) return;

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    message.textContent = "靜態版後台尚未連接登入服務。請部署 Next.js / Supabase Auth 版本後再登入。";
  });
})();
