function LoggedInName() {
  const _ud = localStorage.getItem("user_data");
  const ud = _ud ? JSON.parse(_ud) : { firstName: "User", lastName: "" };

  function doLogout(event: any): void {
    event.preventDefault();
    localStorage.removeItem("user_data");
    localStorage.removeItem("token_data");
    sessionStorage.clear();
    window.location.href = "/";
  }

  return (
    <div className="logged-in-user">
      <span className="logged-in-user__name">
        {ud.firstName} {ud.lastName}
      </span>
      <button type="button" className="btn-topbar" onClick={doLogout}>
        Log Out
      </button>
    </div>
  );
}

export default LoggedInName;
