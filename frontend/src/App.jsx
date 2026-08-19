import { Routes, Route, Navigate, Link } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import PetProfilePage from "./pages/PetProfilePage.jsx";

function PrivateRoute({ children }) {
  const { owner } = useAuth();
  return owner ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const { owner, logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/" className="brand">🐾 Pet Health</Link>
        {owner && (
          <div className="topbar-actions">
            <span>Hola, {owner.name}</span>
            <button onClick={logout} className="btn-ghost">Cerrar sesión</button>
          </div>
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
        </Routes>
      </main>
    </div>
  );
}
