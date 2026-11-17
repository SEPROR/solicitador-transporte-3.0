import { useState, useEffect, useRef } from 'react';
import { MapPin } from 'lucide-react';
import styles from './index.module.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:2999';

export default function AddressInput({ name, value, onChange, placeholder, className }) {
  const [sugestoes, setSugestoes] = useState([]);
  const [aberto, setAberto] = useState(false);
  const [indiceAtivo, setIndiceAtivo] = useState(-1);
  const escolheuRef = useRef(false);
  const wrapperRef = useRef(null);

  // Busca com debounce de 400 ms para não gastar a cota a cada tecla
  useEffect(() => {
    if (escolheuRef.current) {
      escolheuRef.current = false;
      return;
    }
    if (!value || value.trim().length < 3) {
      setSugestoes([]);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/enderecos/autocomplete?q=${encodeURIComponent(value)}`,
          { credentials: 'include', signal: controller.signal }
        );
        const data = await res.json();
        setSugestoes(Array.isArray(data) ? data : []);
        setIndiceAtivo(-1);
        setAberto(true);
      } catch (e) {
        if (e.name !== 'AbortError') setSugestoes([]);
      }
    }, 400);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value]);

  // Fecha a lista ao clicar fora
  useEffect(() => {
    const fechar = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setAberto(false);
    };
    document.addEventListener('mousedown', fechar);
    return () => document.removeEventListener('mousedown', fechar);
  }, []);

  const escolher = (endereco) => {
    escolheuRef.current = true;
    onChange({ target: { name, value: endereco } });
    setSugestoes([]);
    setAberto(false);
    setIndiceAtivo(-1);
  };

  const handleKeyDown = (e) => {
    if (!aberto || sugestoes.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndiceAtivo((i) => (i + 1) % sugestoes.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndiceAtivo((i) => (i <= 0 ? sugestoes.length - 1 : i - 1));
    } else if (e.key === 'Enter' && indiceAtivo >= 0) {
      e.preventDefault(); // evita enviar o formulário
      escolher(sugestoes[indiceAtivo].endereco);
    } else if (e.key === 'Escape') {
      setAberto(false);
    }
  };

  return (
    <div ref={wrapperRef} className={styles.wrapper}>
      <input
        type="text"
        name={name}
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        onFocus={() => sugestoes.length > 0 && setAberto(true)}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
        required
      />

      {aberto && sugestoes.length > 0 && (
        <ul className={styles.lista} role="listbox">
          {sugestoes.map((s, i) => (
            <li
              key={s.id}
              role="option"
              aria-selected={i === indiceAtivo}
              className={`${styles.item} ${i === indiceAtivo ? styles.itemAtivo : ''}`}
              onMouseDown={(e) => {
                e.preventDefault(); // mantém o foco no input
                escolher(s.endereco);
              }}
            >
              <MapPin className={styles.itemIcon} />
              <span>{s.endereco}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}