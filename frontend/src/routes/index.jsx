import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from '../pages/Home/Home';
import Setores from '../pages/Setores/Setores';
import Manager from '../pages/Manager/Manager';
import Relatorio from '../pages/Relatorio/Relatorio';
import Motoristas from '../pages/Motorista/Motorista';
import Login2 from '../pages/Login2/Login2'

const AppRoutes = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Login2 />} />
                <Route path="/chamado" element={<Home />} />
                <Route path="/setores" element={<Setores />} />
                <Route path="/manager" element={<Manager />} />
                <Route path="/relatorio" element={<Relatorio />} />
                <Route path="/motoristas" element={<Motoristas />} />            
                </Routes>
        </BrowserRouter>
    )
}

export default AppRoutes;