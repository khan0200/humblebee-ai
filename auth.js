// Humblebee AI - Access Gate & Auth Guard
(function () {
  function checkAuth() {
    var isAuth = sessionStorage.getItem("humblebee_auth") === "true" ||
                 localStorage.getItem("humblebee_auth") === "true";
    var pathname = window.location.pathname;
    var isLoginPage = pathname.endsWith("/login.html") || 
                       pathname.endsWith("login.html") || 
                       pathname.endsWith("/login");

    if (!isAuth && !isLoginPage) {
      sessionStorage.setItem("humblebee_redirect_target", window.location.href);
      window.location.replace("login.html");
    } else if (isAuth && isLoginPage) {
      var target = sessionStorage.getItem("humblebee_redirect_target") || "index.html";
      sessionStorage.removeItem("humblebee_redirect_target");
      window.location.replace(target);
    }
  }

  checkAuth();
})();

function humblebeeLogout() {
  sessionStorage.removeItem("humblebee_auth");
  localStorage.removeItem("humblebee_auth");
  sessionStorage.removeItem("humblebee_redirect_target");
  window.location.replace("login.html");
}
