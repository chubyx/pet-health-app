import { Routes, Route, Navigate, Link, NavLink } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import PetProfilePage from "./pages/PetProfilePage.jsx";
import MarketplacePage from "./pages/MarketplacePage.jsx";

function PrivateRoute({ children }) {
  const { owner } = useAuth();
  return owner ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const { owner, logout } = useAuth();

  return (
    <div className="app-shell">
      {/* NAVBAR */}
      <header className="topbar">
        <Link to="/" className="brand">🐾 Pet Health</Link>
        {owner && (
          <>
            <nav className="topbar-nav" aria-label="Navegación principal">
              <NavLink to="/" end className={({ isActive }) => isActive ? "topbar-link active" : "topbar-link"}>
                Mis mascotas
              </NavLink>
              <NavLink to="/marketplace" className={({ isActive }) => isActive ? "topbar-link active" : "topbar-link"}>
                Tienda
              </NavLink>
            </nav>
            <div className="topbar-actions">
              <span>Hola, {owner.name}</span>
              <button onClick={logout} className="btn-ghost">Cerrar sesión</button>
            </div>
          </>
        )}
      </header>

      
      <main className="content">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <DashboardPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/pets/:id"
            element={
              <PrivateRoute>
                <PetProfilePage />
              </PrivateRoute>
            }
          />
          <Route
            path="/marketplace"
            element={
              <PrivateRoute>
                <MarketplacePage />
              </PrivateRoute>
            }
          />
        </Routes>
      </main>

      {/* FOOTER */}
      <footer className="footer">
        <p>&copy; {new Date().getFullYear()} Pet Health. Todos los derechos reservados.</p>
        <p className="footer-credits">Desarrollado para el bienestar de tus mascotas 🐶🐈</p>
      </footer>
    </div>
  );
}