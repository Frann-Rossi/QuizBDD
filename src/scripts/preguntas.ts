/** Página /preguntas: buscar entre las preguntas y eliminar una (guarda el banco de la unidad). */
import { quitarPregunta } from '@/lib/crear/pregunta';
import type { BancoPreguntas } from '@/types/quiz';

interface BancoAutoria extends BancoPreguntas {
  archivo: string;
}

export function iniciarPreguntas(): void {
  const datos: BancoAutoria[] = JSON.parse(document.getElementById('datos-preguntas')?.textContent ?? '[]');
  const buscar = document.getElementById('buscar-pregunta') as HTMLInputElement | null;
  const estado = document.getElementById('estado-preguntas');

  const decir = (texto: string, tipo: 'ok' | 'error' | 'neutro' = 'neutro') => {
    if (!estado) return;
    estado.textContent = texto;
    estado.className = `mt-3 text-sm ${tipo === 'ok' ? 'text-ok' : tipo === 'error' ? 'text-error' : 'text-tenue'}`;
  };

  // Buscador: oculta las preguntas que no coinciden y las unidades que quedan vacías.
  buscar?.addEventListener('input', () => {
    const texto = buscar.value.trim().toLowerCase();
    document.querySelectorAll<HTMLElement>('li[data-pregunta]').forEach((item) => {
      item.hidden = texto !== '' && !(item.dataset['buscable'] ?? '').includes(texto);
    });
    document.querySelectorAll<HTMLElement>('section[data-unidad]').forEach((seccion) => {
      const visibles = [...seccion.querySelectorAll<HTMLElement>('li[data-pregunta]')].some((item) => !item.hidden);
      seccion.hidden = !visibles;
      // Al buscar, se abren las unidades con coincidencias para verlas.
      const plegable = seccion.querySelector<HTMLDetailsElement>('details');
      if (plegable && texto !== '') plegable.open = visibles;
    });
  });

  document.querySelectorAll<HTMLButtonElement>('button[data-eliminar]').forEach((boton) => {
    boton.addEventListener('click', async () => {
      const id = boton.dataset['eliminar'] ?? '';
      const unidad = Number(boton.dataset['unidad']);
      const origen = datos.find((b) => b.unidad === unidad);
      if (!origen || !id) return;
      if (!window.confirm(`¿Eliminar la pregunta ${id}? Se quita del archivo ${origen.archivo}.`)) return;

      boton.disabled = true;
      try {
        const actualizado = quitarPregunta(origen, id);
        const { archivo, ...banco } = { ...actualizado, archivo: origen.archivo };
        const respuesta = await fetch(`/__autoria/banco?archivo=${encodeURIComponent(archivo)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(banco),
        });
        const cuerpo = (await respuesta.json().catch(() => null)) as { error?: string } | null;
        if (!respuesta.ok) throw new Error(cuerpo?.error ?? 'No se pudo guardar.');
        boton.closest('li[data-pregunta]')?.remove();
        origen.preguntas = actualizado.preguntas;
        decir(`Eliminada ${id}. Guardado en ${archivo}.`, 'ok');
      } catch (error) {
        boton.disabled = false;
        decir(
          `${error instanceof Error ? error.message : 'Error desconocido.'} (Esta página solo funciona con npm run dev.)`,
          'error',
        );
      }
    });
  });
}
