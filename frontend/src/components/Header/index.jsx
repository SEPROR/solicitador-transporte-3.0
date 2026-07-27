import { useState, useRef, useEffect } from 'react';
import { UserCircle, LogOut, ChevronDown, ArrowLeftRight } from 'lucide-react';
import styles from './index.module.css';

export function Header() {
  const [currentUser] = useState('Usuário');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <div className={styles.topRow}>
          <div className={styles.brand}>
            <img src="/images/governo.png" alt="Logo" className={styles.logo} />
            <div className={styles.divider} />
            <div>
              <h1 className={styles.title}>Suporte Técnico</h1>
              <p className={styles.subtitle}>GILOG</p>
            </div>
          </div>

          <div className={styles.userMenu} ref={ref}>
            <button
              onClick={() => setOpen((v) => !v)}
              className={styles.userButton}
            >
              <div className={styles.avatar}>
                <UserCircle className={styles.avatarIcon} />
              </div>
              <div className={styles.userInfo}>
                <p className={styles.userName}>{currentUser}</p>
                <p className={styles.userRole}>SEPROR</p>
              </div>
              <ChevronDown className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`} />
            </button>

            {open && (
              <div className={styles.dropdown}>
                <div className={styles.dropdownHeader}>
                  <p className={styles.dropdownLabel}>Usuário atual</p>
                  <p className={styles.dropdownUserName}>{currentUser}</p>
                </div>

                <div className={styles.dropdownList}>
                  <button
                    onClick={() => setOpen(false)}
                    className={styles.dropdownItem}
                  >
                    <ArrowLeftRight className={styles.trocaruser} />
                    <span>Trocar usuário</span>
                  </button>

                  <button
                    onClick={() => setOpen(false)}
                    className={styles.dropdownItem}
                  >
                    <div className={styles.headerItens} />
                    <a href="/">Solicitação de transporte</a>
                  </button>

                  <button
                    onClick={() => setOpen(false)}
                    className={styles.dropdownItem}
                  >
                    <div className={styles.headerItens} />
                    <a href="/manager">Gerenciador de transporte</a>
                  </button>

                  <button
                    onClick={() => setOpen(false)}
                    className={styles.dropdownItem}
                  >
                    <div className={styles.headerItens} />
                    <a href="/motoristas">Gerenciar Motoristas</a>
                  </button>

                  <button
                    onClick={() => setOpen(false)}
                    className={styles.dropdownItem}
                  >
                    <div className={styles.headerItens} />
                    <a href="/setores">Gerenciar Setores</a>
                  </button>

                  <button
                    onClick={() => setOpen(false)}
                    className={styles.dropdownItem}
                  >
                    <div className={styles.headerItens} />
                    <a href="/relatorio">Acessar Relatório</a>
                  </button>

                  <button
                    onClick={() => setOpen(false)}
                    className={styles.dropdownItem}
                  >
                    <div className={styles.headerItens} />
                    <a href="/alterar-senha">Alterar senha</a>
                  </button>
                  

                  <div className={styles.dropdownDivider} />

                  <button
                    onClick={() => setOpen(false)}
                    className={styles.dropdownItemDanger}
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sair</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;