import React from 'react';
import styles from './index.module.css';

const Footer = () => {

  return (
    <footer className={styles.footer}> 
      <div className={styles['footer-content']}>

        <nav className={styles['footer-text']}>
          <a >Desenvolvido por Ana Paula Matos e Ingrid Gabrielly Medeiros | GILOG</a>
          {/* <a href="/politica-de-privacidade" className={styles['footer-link']}>Política de Privacidade</a>
          <a href="/termos-de-uso" className={styles['footer-link']}>Termos de Uso</a> */}
        </nav>
      
      </div>

      <div className={styles.FooterBar}>
              <div className={styles.FooterBarContainer}>
                <span className={styles.copyright}>Copyright © 2026 By Sepror</span>
              </div>
            </div>
            
    </footer>  
  );
};

export default Footer;