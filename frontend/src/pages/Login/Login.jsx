import { useState, useRef, useEffect } from 'react';
import styles from './index.module.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:2999';

export default function Login() {

    const [usuario, setUsuario] = useState('');
    const [senha, setSenha] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [hasError, setHasError] = useState(false);

    const usuarioRef = useRef(null);

    useEffect(() => {
        if (usuarioRef.current) {
            usuarioRef.current.focus();
        }
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setHasError(false);
        setErrorMessage('');
        try {
            const response = await fetch(`${API_BASE_URL}/api/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ usuario, senha }),
            });
            const data = await response.json();
            if (data.success) {
                window.location.href = '/manager';
            } else {
                throw new Error(data.error || 'Credenciais inválidas');
}
        } catch (error) {
            console.error('Erro no login:', error);
            setHasError(true);
            setErrorMessage(error.message || 'Credenciais inválidas.Tente novamente.');
            setIsLoading(false);
        }
    };
    return (
        <div className={styles.loginContainer}>
            <div className={styles.loginHeader}>
                <h1>Login</h1>
            </div>
            <form onSubmit={handleSubmit}
                className={styles.loginForm}>
                <div className={styles.formGroup}>
                    <label htmlFor="usuario">Usuário:</label>
                    <input
                        type="text"
                        id="usuario"
                        name="usuario"
                        ref={usuarioRef}
                        value={usuario}
                        onChange={(e) => setUsuario(e.target.value)}
                        required
                        autoComplete="username"
                    />
                </div>
                <div className={styles.formGroup}>
                    <label htmlFor="senha">Senha:</label>
                    <input
                        type="password"
                        id="senha"
                        name="senha"
                        value={senha}
                        onChange={(e) => setSenha(e.target.value)}
                        required
                        autoComplete="current-password"
                    />
                </div>
                <button
                    type="submit"
                    className={styles.loginButton}
                    id="loginButton"
                    disabled={isLoading}
                >
                    <span style={{
                        display: isLoading ? 'none' : 'inline'
                    }}>Entrar</span>
                    <span style={{
                        display: isLoading ? 'inline' : 'none'
                    }}>Carregando...</span>
                </button>
                <div
                    id="errorMessage"
                    className={styles.errorMessage}
                    style={{ display: hasError ? 'block' : 'none' }}
                >
                    {errorMessage}
                </div>
            </form>
            <div className={styles.loginLinks}>
                <a href="/">← Voltar para abertura de
                    chamado</a>
            </div>
        </div>
    );
}
