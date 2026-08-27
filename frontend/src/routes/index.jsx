import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { PrivateRoute } from './PrivateRoute';

import Home from '../pages/Home/Home';
import Setores from '../pages/Setores/Setores';
import Manager from '../pages/Manager/Manager';
import Relatorio from '../pages/Relatorio/Relatorio';
import Motoristas from '../pages/Motorista/Motorista';
import Login from '../pages/Login/Login';

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Login />} />

          {/* Acessível a qualquer usuário autenticado */}
          <Route
            path="/chamado"
            element={
              <PrivateRoute>
                <Home />
              </PrivateRoute>
            }
          />

          {/* Exclusivas do GILOG */}
          <Route
            path="/setores"
            element={
              <PrivateRoute requireGilog>
                <Setores />
              </PrivateRoute>
            }
          />
          <Route
            path="/manager"
            element={
              <PrivateRoute requireGilog>
                <Manager />
              </PrivateRoute>
            }
          />
          <Route
            path="/relatorio"
            element={
              <PrivateRoute requireGilog>
                <Relatorio />
              </PrivateRoute>
            }
          />
          <Route
            path="/motoristas"
            element={
              <PrivateRoute requireGilog>
                <Motoristas />
              </PrivateRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default AppRoutes;