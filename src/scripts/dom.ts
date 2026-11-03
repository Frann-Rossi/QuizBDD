/** Utilidades de DOM compartidas por los scripts del navegador (cuestionario y juego). */
import type { MaterialReferencia } from '@/types/quiz';
import { urlMaterial } from '@/utils/rutas';
import { tokenizarSql, type TipoToken } from '@/utils/sql';

export const LETRAS = ['A', 'B', 'C', 'D'] as const;

const CLASES_OPCION = {
  base: 'flex w-full items-start gap-3 border-[3px] px-3 py-3 text-left transition-transform duration-75 sm:px-4',
  disponible:
    'cursor-pointer border-borde bg-panel shadow-pixel hover:-translate-x-px hover:-translate-y-px hover:bg-panel-2 active:translate-x-1 active:translate-y-1 active:shadow-none',
  /** Opción que no se clickea entera (en la votación se tocan los nombres). */
  neutra: 'border-borde bg-panel shadow-pixel',
  correcta: 'border-ok bg-ok-suave shadow-pixel-ok',
  incorrecta: 'border-error bg-error-suave shadow-pixel-error',
  descartada: 'border-borde/40 bg-panel opacity-60',
};

const CLASES_LETRA = {
  base: 'flex size-8 shrink-0 items-center justify-center border-[3px] font-pixel text-base font-bold',
  disponible: 'border-borde bg-acento text-sobre-acento',
  neutra: 'border-borde bg-acento text-sobre-acento',
  correcta: 'border-ok bg-ok text-panel',
  incorrecta: 'border-error bg-error text-panel',
  descartada: 'border-borde/40 bg-panel-2 text-tenue',
};

const CLASES_TOKEN: Record<TipoToken, string> = {
  texto: '',
  clave: 'font-bold text-sql-clave',
  funcion: 'text-sql-funcion',
  cadena: 'text-sql-cadena',
  numero: 'text-sql-numero',
};

export type EstadoOpcion = keyof typeof CLASES_OPCION & keyof typeof CLASES_LETRA;

export function requerir<T extends Element>(raiz: ParentNode, selector: string): T {
  const elemento = raiz.querySelector<T>(selector);
  if (!elemento) throw new Error(`Falta el elemento "${selector}".`);
  return elemento;
}

export function crear<K extends keyof HTMLElementTagNameMap>(
  etiqueta: K,
  clases = '',
  texto?: string,
): HTMLElementTagNameMap[K] {
  const elemento = document.createElement(etiqueta);
  if (clases) elemento.className = clases;
  if (texto !== undefined) elemento.textContent = texto;
  return elemento;
}

/** Nodos con el texto y el SQL resaltado. Siempre con textContent: nunca se interpreta HTML. */
export function nodosSql(texto: string): Node[] {
  return tokenizarSql(texto).map((token) =>
    token.tipo === 'texto' ? document.createTextNode(token.texto) : crear('span', CLASES_TOKEN[token.tipo], token.texto),
  );
}

export function renderizarSql(elemento: HTMLElement, texto: string): void {
  elemento.replaceChildren(...nodosSql(texto));
}

export function crearBloque(titulo: string, texto: string): HTMLElement {
  const bloque = crear('div');
  const parrafo = crear('p', 'mt-1 text-sm leading-relaxed');
  parrafo.append(...nodosSql(texto));
  bloque.append(crear('p', 'font-pixel text-base font-semibold text-tinta', titulo), parrafo);
  return bloque;
}

export function crearEnlaceMaterial(material: MaterialReferencia): HTMLLIElement {
  const item = crear('li');
  const enlace = crear(
    'a',
    'inline-flex items-center gap-1 text-sm font-semibold text-primario underline decoration-2 underline-offset-4 hover:text-primario-fuerte',
  );
  enlace.href = urlMaterial(material);
  enlace.target = '_blank';
  enlace.rel = 'noopener';
  enlace.textContent = `▸ ${material.titulo} ↗`;
  item.append(enlace);
  return item;
}

/** Botón de opción con su letra (A–D) y el texto con SQL resaltado. */
export function crearBotonOpcion(id: string, posicion: number, texto: string): HTMLButtonElement {
  const letraTexto = LETRAS[posicion] ?? '?';
  const boton = crear('button');
  boton.type = 'button';
  boton.dataset['opcion'] = id;
  const letra = crear('span', '', letraTexto);
  letra.dataset['letra'] = '';
  letra.setAttribute('aria-hidden', 'true');
  const contenido = crear('span', 'min-w-0 pt-1 text-sm leading-relaxed text-tinta wrap-anywhere sm:text-base');
  contenido.append(...nodosSql(texto));
  boton.append(letra, contenido);
  boton.setAttribute('aria-label', `Opción ${letraTexto}: ${texto}`);
  aplicarEstadoOpcion(boton, 'disponible');
  return boton;
}

export function aplicarEstadoOpcion(elemento: HTMLElement, estado: EstadoOpcion): void {
  elemento.className = `${CLASES_OPCION.base} ${CLASES_OPCION[estado]}`;
  const letra = elemento.querySelector('[data-letra]');
  if (letra) letra.className = `${CLASES_LETRA.base} ${CLASES_LETRA[estado]}`;
}

/**
 * Tarjeta de opción para la votación: letra + texto, y un contenedor `[data-zona-votos]`
 * debajo del texto donde se agregan los botones de los jugadores.
 */
export function crearTarjetaOpcion(id: string, posicion: number, texto: string): HTMLDivElement {
  const tarjeta = crear('div');
  tarjeta.dataset['opcion'] = id;
  const letra = crear('span', '', LETRAS[posicion] ?? '?');
  letra.dataset['letra'] = '';
  letra.setAttribute('aria-hidden', 'true');
  const cuerpo = crear('div', 'min-w-0 flex-1');
  const contenido = crear('p', 'pt-1 text-sm leading-relaxed text-tinta wrap-anywhere sm:text-base');
  contenido.append(...nodosSql(texto));
  const zonaVotos = crear('div', 'mt-3 flex flex-wrap gap-2');
  zonaVotos.dataset['zonaVotos'] = '';
  zonaVotos.setAttribute('role', 'group');
  zonaVotos.setAttribute('aria-label', `Votos para la opción ${LETRAS[posicion] ?? ''}`);
  cuerpo.append(contenido, zonaVotos);
  tarjeta.append(letra, cuerpo);
  aplicarEstadoOpcion(tarjeta, 'neutra');
  return tarjeta;
}

/** Lee los datos JSON incrustados por el servidor en `<script type="application/json">`. */
export function leerDatos<T>(raiz: ParentNode, selector: string): T {
  return JSON.parse(requerir<HTMLScriptElement>(raiz, selector).textContent ?? 'null') as T;
}

/**
 * Lectura de localStorage tolerante a fallos (modo privado, almacenamiento bloqueado…).
 * Los datos guardados son solo conveniencias locales: la app funciona sin ellos.
 */
export function leerLocal<T>(clave: string, porDefecto: T): T {
  try {
    const valor = localStorage.getItem(clave);
    return valor === null ? porDefecto : (JSON.parse(valor) as T);
  } catch {
    return porDefecto;
  }
}

export function guardarLocal(clave: string, valor: unknown): void {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    // Sin almacenamiento disponible: no es necesario para usar la app.
  }
}

const CLAVE_POSICIONES = 'quiz-bdd:posiciones';

/** Última posición donde se mostró la respuesta correcta de cada pregunta (id → 0–3). */
export function leerPosicionesPrevias(): Map<string, number> {
  const guardado = leerLocal<unknown>(CLAVE_POSICIONES, {});
  const mapa = new Map<string, number>();
  if (guardado && typeof guardado === 'object') {
    for (const [id, posicion] of Object.entries(guardado)) {
      if (typeof posicion === 'number') mapa.set(id, posicion);
    }
  }
  return mapa;
}

export function guardarPosicion(id: string, posicion: number): void {
  const actuales = Object.fromEntries(leerPosicionesPrevias());
  actuales[id] = posicion;
  guardarLocal(CLAVE_POSICIONES, actuales);
}

/** Desplazamiento suave, salvo que el usuario haya pedido reducir el movimiento en su sistema. */
export function comportamientoScroll(): ScrollBehavior {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}
