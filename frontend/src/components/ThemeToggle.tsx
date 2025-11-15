import { useTheme } from "../context/ThemeContext";

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const nextTheme = theme === "light" ? "dark" : "light";

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={`Switch to ${nextTheme} mode`}
    >
      <span className="theme-toggle__icon" aria-hidden="true">
        {theme === "light" ? "🌙" : "🔆"}
      </span>
      <span className="theme-toggle__label">{nextTheme === "light" ? "Light" : "Dark"}</span>
    </button>
  );
}

export default ThemeToggle;

