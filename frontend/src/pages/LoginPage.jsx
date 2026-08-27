import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";
import "../styles/Auth.css";
export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err.message || "Credenciales incorrectas");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-viewport">
      <div className="auth-decoration circle-1" />
      <div className="auth-decoration circle-2" />

      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-brand-badge">
              <span className="badge-icon">🐾</span>
            </div>
            <h1 className="auth-title">Bienvenido de nuevo</h1>
            <p className="auth-subtitle">Gestiona la salud y bienestar de tus mascotas</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="input-group">
              <label htmlFor="email">Correo Electrónico</label>
              <div className="input-wrapper">
                <span className="input-icon">✉️</span>
                <input
                  id="email"
                  type="email"
                  placeholder="ejemplo@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="input-group">
              <div className="label-row">
                <label htmlFor="password">Contraseña</label>
              </div>
              <div className="input-wrapper">
                <span className="input-icon">🔒</span>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Alternar visibilidad"
                >
                  {showPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
            </div>

            {error && (
              <div className="error-alert">
                <span className="error-icon">⚠️</span>
                <span className="error-message">{error}</span>
              </div>
            )}

            <button type="submit" className="btn-primary-auth" disabled={loading}>
              {loading ? (
                <span className="spinner-loader"></span>
              ) : (
                "Iniciar Sesión"
              )}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              ¿Aún no tienes una cuenta?{" "}
              <Link to="/register" className="auth-link">
                Regístrate gratis
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}