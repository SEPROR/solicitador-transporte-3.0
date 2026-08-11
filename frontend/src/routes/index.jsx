import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from '../pages/Home/Home';
import Setores from '../pages/Setores/Setores';
import Manager from '../pages/Manager/Manager';
import Login from '../pages/Login/Login';
import Relatorio from '../pages/Relatorio/Relatorio';
import Motoristas from '../pages/Motorista/Motorista';
import Login2 from '../pages/Login2/Login2'

const AppRoutes = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/setores" element={<Setores />} />
                <Route path="/manager" element={<Manager />} />
                <Route path="/login" element={<Login />} />
                <Route path="/relatorio" element={<Relatorio />} />
                <Route path="/motoristas" element={<Motoristas />} />
                <Route path="/login2" element={<Login2 />} />
            </Routes>
        </BrowserRouter>
    )
}

export default AppRoutes;
