/* frontend/src/assets/css/ProductorDashboard.css */

/* ============================================================
   TLAPIANI - ProductorDashboard Responsivo
   ============================================================ */

/* ── Estilos Base (Desktop) ────────────────────────────────── */
.pd - wrapper {
    background: linear - gradient(135deg, #2b2620 0 %, #1a0a05 100 %);
    min - height: 100vh;
    padding: 20px;
    font - family: Georgia, serif;
}

.pd - container {
    max - width: 900px;
    margin: 0 auto;
}

.pd - header {
    background: #f0ebdc;
    border: 2px solid #b8860b;
    border - radius: 12px;
    padding: 20px;
    margin - bottom: 20px;
}

.pd - header h1 {
    color: #2b2620;
    font - size: 28px;
    margin: 0 0 8px 0;
}

.pd - header p {
    color: #6b1a2a;
    margin: 0;
    font - size: 14px;
}

.pd - stats {
    display: grid;
    grid - template - columns: repeat(3, 1fr);
    gap: 12px;
    margin - bottom: 20px;
}

.pd - stat {
    background: #f0ebdc;
    border: 2px solid #b8860b;
    border - radius: 12px;
    padding: 16px;
    text - align: center;
}

.pd - stat - number {
    font - size: 32px;
    font - weight: bold;
    color: #6b1a2a;
    line - height: 1;
    margin - bottom: 4px;
}

.pd - stat - label {
    font - size: 12px;
    color: #2b2620;
    opacity: 0.8;
    text - transform: uppercase;
    letter - spacing: 0.5px;
}

.pd - cultivos - grid {
    display: grid;
    grid - template - columns: 1fr;
    gap: 16px;
    margin - bottom: 20px;
}

.pd - card {
    background: #f0ebdc;
    border: 2px solid #b8860b;
    border - radius: 12px;
    padding: 18px;
    position: relative;
    overflow: hidden;
}

.pd - card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 6px;
    height: 100 %;
    background: var(--accent - color, #b8860b);
}

.pd - card - header {
    display: flex;
    justify - content: space - between;
    align - items: center;
    margin - bottom: 12px;
    padding - left: 12px;
}

.pd - card - title {
    font - size: 20px;
    color: #2b2620;
    font - weight: bold;
    margin: 0;
}

.pd - semaforo {
    display: inline - flex;
    align - items: center;
    gap: 6px;
    padding: 6px 12px;
    border - radius: 16px;
    font - size: 12px;
    font - weight: bold;
    text - transform: uppercase;
}

.pd - semaforo.verde {
    background: #E1F5EE;
    color: #1D9E75;
}

.pd - semaforo.amarillo {
    background: #FAEEDA;
    color: #BA7517;
}

.pd - semaforo.rojo {
    background: #FCEBEB;
    color: #D85A30;
}

.pd - card - body {
    padding - left: 12px;
}

.pd - metrics {
    display: grid;
    grid - template - columns: repeat(2, 1fr);
    gap: 12px;
    margin - bottom: 12px;
}

.pd - metric {
    display: flex;
    flex - direction: column;
}

.pd - metric - label {
    font - size: 11px;
    color: #2b2620;
    opacity: 0.7;
    margin - bottom: 2px;
    text - transform: uppercase;
}

.pd - metric - value {
    font - size: 18px;
    color: #2b2620;
    font - weight: bold;
}

.pd - recomendacion {
    background: #fff;
    padding: 12px;
    border - radius: 8px;
    border - left: 4px solid #6b1a2a;
    margin - top: 12px;
}

.pd - recomendacion - title {
    font - size: 13px;
    font - weight: bold;
    color: #6b1a2a;
    margin - bottom: 4px;
}

.pd - recomendacion - text {
    font - size: 13px;
    color: #2b2620;
    line - height: 1.5;
}

.pd - alerta {
    background: #FCEBEB;
    border: 2px solid #D85A30;
    border - radius: 8px;
    padding: 12px;
    margin - bottom: 20px;
    display: flex;
    align - items: start;
    gap: 10px;
}

.pd - alerta - icon {
    font - size: 20px;
    flex - shrink: 0;
}

.pd - alerta - text {
    font - size: 14px;
    color: #791F1F;
    line - height: 1.6;
}

/* ── Media Queries (Mobile) ───────────────────────────────── */

@media(max - width: 768px) {
  .pd - wrapper {
        padding: 12px;
    }

  .pd - header {
        padding: 16px;
        margin - bottom: 16px;
    }

  .pd - header h1 {
        font - size: 22px;
    }

  .pd - header p {
        font - size: 13px;
    }

  /* Stats apiladas verticalmente en móvil */
  .pd - stats {
        grid - template - columns: 1fr;
        gap: 10px;
        margin - bottom: 16px;
    }

  .pd - stat {
        padding: 14px;
    }

  .pd - stat - number {
        font - size: 28px;
    }

  .pd - stat - label {
        font - size: 11px;
    }

  /* Cards de cultivo */
  .pd - cultivos - grid {
        gap: 12px;
        margin - bottom: 16px;
    }

  .pd - card {
        padding: 14px;
    }

  .pd - card - header {
        flex - direction: column;
        align - items: flex - start;
        gap: 8px;
    }

  .pd - card - title {
        font - size: 18px;
    }

  .pd - semaforo {
        align - self: flex - start;
        font - size: 11px;
        padding: 5px 10px;
    }

  /* Métricas apiladas en móvil */
  .pd - metrics {
        grid - template - columns: 1fr;
        gap: 10px;
    }

  .pd - metric - value {
        font - size: 16px;
    }

  .pd - recomendacion {
        padding: 10px;
    }

  .pd - recomendacion - title {
        font - size: 12px;
    }

  .pd - recomendacion - text {
        font - size: 12px;
    }

  .pd - alerta {
        padding: 10px;
        flex - direction: column;
    }

  .pd - alerta - icon {
        font - size: 18px;
    }

  .pd - alerta - text {
        font - size: 13px;
    }
}

/* ── Pantallas muy pequeñas (<400px) ─────────────────────── */
@media(max - width: 400px) {
  .pd - wrapper {
        padding: 8px;
    }

  .pd - header {
        padding: 12px;
    }

  .pd - header h1 {
        font - size: 20px;
    }

  .pd - card - title {
        font - size: 16px;
    }

  .pd - stat - number {
        font - size: 24px;
    }
}
