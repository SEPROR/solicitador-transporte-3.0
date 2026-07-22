import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from '../pages/Home/Home';
import Setores from '../pages/Setores/Setores';
import Manager from '../pages/Manager/Manager';
import Login from '../pages/Login/Login';

const AppRoutes = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/setores" element={<Setores />} />
                <Route path="/manager" element={<Manager />} />
                <Route path="/login" element={<Login />} />
            </Routes>
        </BrowserRouter>
    )
}

export default AppRoutes;
