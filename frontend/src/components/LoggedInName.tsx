function LoggedInName() {
  const _ud = localStorage.getItem('user_data');
  const ud = _ud ? JSON.parse(_ud) : { firstName: 'User', lastName: '' };

  function doLogout(event: any): void {
    event.preventDefault();
    localStorage.removeItem('user_data');
    localStorage.removeItem('token_data');
    sessionStorage.clear();
    window.location.href = '/';
  }

  return (
    <div className="flex items-center gap-4">
      <span className="text-lg font-medium">
        Logged in as {ud.firstName} {ud.lastName}
      </span>
      <button
        type="button"
        className="bg-white text-[#A8C3A0] px-3 py-1 rounded-md shadow hover:bg-gray-100"
        onClick={doLogout}
      >
        Log Out
      </button>
    </div>
  );
}

export default LoggedInName;
