import { UserCircle, LogOut, ChevronDown, ArrowLeftRight } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './index.module.css';
import { useAuth } from '../../context/AuthContext'; // ajuste o caminho conforme sua estrutura

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:2999';

export function Header() {
  const [currentUser, setCurrentUser] = useState('Usuário');
  const [isGilog, setIsGilog] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    async function fetchAuthStatus() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/status`, {
          credentials: 'include',
        });
        const data = await res.json();
        if (data.usuario) setCurrentUser(data.usuario);
        setIsGilog(!!data.isGilog);
      } catch (err) {
        console.error('Erro ao verificar autenticação:', err);
      }
    }
    fetchAuthStatus();
  }, []);

const handleLogout = async () => {
    try {
      setOpen(false);

      // 1. Notifica o servidor para destruir os cookies/sessão
      await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });

      // 2. Se o contexto tiver a função de logout para limpar o estado global
      if (logout) {
        await logout();
      }

      // 3. Redireciona o usuário para a página de login
      navigate('/');
    } catch (err) {
      console.error('Erro ao realizar logout:', err);
    }
  };

  return (
    <header className={styles.header}>
      {/* Faixa institucional superior */}
      <div className={styles.topBar}>
        <div className={styles.topBarContainer}>
          <span className={styles.topBarTitle}>SEPROR</span>
          <span className={styles.topBarSubtitle}>
            Sistema Integrado de Gestão de Transporte
          </span>
        </div>
      </div>

      {/* Corpo principal do header */}
      <div className={styles.mainHeader}>
        <div className={styles.mainHeaderContainer}>
          <div className={styles.flexBetween}>

            <div className={styles.brandContainer}>
              <img src="/images/governo.png" alt="Logo" className={styles.logo} />
            </div>

            <div className={styles.userWrapper} ref={ref}>
              <button
                onClick={() => setOpen((v) => !v)}
                className={styles.userButton}
              >
                <div className={styles.avatar}>
                  <UserCircle className={styles.avatarIcon} />
                </div>
                <div className={styles.userInfo}>
                  <p className={styles.userName}>{currentUser}</p>
                </div>
                <ChevronDown
                  className={`${styles.chevronIcon} ${open ? styles.rotate : ''}`}
                />
              </button>

              {/* Dropdown */}
              {open && (
                <div className={styles.dropdown}>
                  {/* Cabeçalho do dropdown */}
                  <div className={styles.dropdownHeader}>
                    <p className={styles.dropdownHeaderTag}>
                      Usuário atual
                    </p>
                    <p className={styles.dropdownHeaderName}>{currentUser}</p>
                  </div>

                  {/* Ações e Navegação */}
                  <div className={styles.dropdownActions}>
                    <button
                      onClick={() => setOpen(false)}
                      className={styles.actionButton}
                    >
                      <div className={styles.actionIconBgBlue}>
                        <ArrowLeftRight className={styles.actionIconBlue} />
                      </div>
                      <span>Trocar usuário</span>
                    </button>

                    <div className={styles.dropdownDivider} />

                    {/* Visível para todos os usuários autenticados */}
                    <Link
                      to="/chamado"
                      onClick={() => setOpen(false)}
                      className={styles.dropdownItem}
                    >
                      Solicitação de transporte
                    </Link>

                    {/* Itens exclusivos do GILOG */}
                    {isGilog && (
                      <>
                        <div className={styles.dropdownDivider} />

                        <Link
                          to="/manager"
                          onClick={() => setOpen(false)}
                          className={styles.dropdownItem}
                        >
                          Gerenciador de transporte
                        </Link>

                        <Link
                          to="/motoristas"
                          onClick={() => setOpen(false)}
                          className={styles.dropdownItem}
                        >
                          Gerenciar Motoristas
                        </Link>

                        <Link
                          to="/setores"
                          onClick={() => setOpen(false)}
                          className={styles.dropdownItem}
                        >
                          Gerenciar Setores
                        </Link>

                        <Link
                          to="/relatorio"
                          onClick={() => setOpen(false)}
                          className={styles.dropdownItem}
                        >
                          Acessar Relatório
                        </Link>
                      </>
                    )}

                    <div className={styles.dropdownDivider} />

                    <button
                      onClick={handleLogout}
                      className={styles.actionButtonDanger}
                    >
                      <div className={styles.actionIconBgRed}>
                        <LogOut className={styles.actionIconRed} />
                      </div>
                      <span>Sair</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;