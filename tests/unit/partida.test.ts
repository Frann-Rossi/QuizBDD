import { describe, expect, it } from 'vitest';
import {
  MAX_JUGADORES,
  alternarVoto,
  calcularRanking,
  evaluarRonda,
  seleccionarPreguntas,
  sumarPuntos,
  todosRespondieron,
  validarJugadores,
  votantesDe,
} from '@/lib/juego/partida';
import type { Jugador } from '@/types/juego';
import type { OpcionId, PreguntaCuestionario } from '@/types/quiz';
import { crearPregunta } from '../fixtures';

const ana: Jugador = { id: 'j1', nombre: 'Ana' };
const bruno: Jugador = { id: 'j2', nombre: 'Bruno' };
const carla: Jugador = { id: 'j3', nombre: 'Carla' };
const jugadores = [ana, bruno, carla];

describe('validarJugadores', () => {
  it('normaliza nombres y asigna ids en orden', () => {
    const resultado = validarJugadores(['  Ana ', 'Bruno']);
    expect(resultado).toEqual({ ok: true, jugadores: [ana, bruno] });
  });

  it('usa "Jugador N" para los nombres vacíos', () => {
    const resultado = validarJugadores(['Ana', '   ']);
    expect(resultado.ok && resultado.jugadores[1]?.nombre).toBe('Jugador 2');
  });

  it('rechaza menos de dos jugadores', () => {
    expect(validarJugadores(['Ana']).ok).toBe(false);
  });

  it(`rechaza más de ${MAX_JUGADORES} jugadores`, () => {
    const nombres = Array.from({ length: MAX_JUGADORES + 1 }, (_, i) => `J${i}`);
    expect(validarJugadores(nombres).ok).toBe(false);
  });

  it('rechaza nombres repetidos sin distinguir mayúsculas', () => {
    const resultado = validarJugadores(['Ana', 'ana']);
    expect(resultado).toEqual({ ok: false, error: 'El nombre "ana" está repetido.' });
  });

  it('recorta nombres demasiado largos', () => {
    const resultado = validarJugadores(['A'.repeat(50), 'Bruno']);
    expect(resultado.ok && resultado.jugadores[0]?.nombre.length).toBe(20);
  });
});

describe('alternarVoto', () => {
  it('registra el voto de un jugador', () => {
    expect(Object.fromEntries(alternarVoto(new Map(), 'j1', 'a'))).toEqual({ j1: 'a' });
  });

  it('mueve el voto si el jugador elige otra opción (un solo voto por jugador)', () => {
    const votos = alternarVoto(new Map([['j1', 'a']]), 'j1', 'c');
    expect(Object.fromEntries(votos)).toEqual({ j1: 'c' });
  });

  it('quita el voto si el jugador vuelve a tocar la misma opción', () => {
    expect(alternarVoto(new Map([['j1', 'a']]), 'j1', 'a').size).toBe(0);
  });

  it('no modifica el mapa original', () => {
    const original = new Map<string, OpcionId>([['j1', 'a']]);
    alternarVoto(original, 'j2', 'b');
    expect(Object.fromEntries(original)).toEqual({ j1: 'a' });
  });
});

describe('votantesDe', () => {
  it('lista a quienes votaron una opción, siempre en el orden de los jugadores', () => {
    const votos = new Map<string, OpcionId>([
      ['j3', 'b'],
      ['j1', 'b'],
      ['j2', 'a'],
    ]);
    expect(votantesDe(jugadores, votos, 'b')).toEqual([ana, carla]);
    expect(votantesDe(jugadores, votos, 'd')).toEqual([]);
  });
});

describe('ronda', () => {
  const pregunta = crearPregunta(); // correcta: 'b'
  const respuestas = new Map<string, OpcionId>([
    ['j1', 'b'],
    ['j2', 'c'],
    ['j3', 'b'],
  ]);

  it('detecta cuándo respondieron todos', () => {
    expect(todosRespondieron(jugadores, new Map([['j1', 'a']]))).toBe(false);
    expect(todosRespondieron(jugadores, respuestas)).toBe(true);
  });

  it('indica quién acertó y qué eligió cada uno', () => {
    const resultados = evaluarRonda(pregunta, jugadores, respuestas);
    expect(resultados.map((r) => [r.jugador.nombre, r.opcion.id, r.esCorrecta])).toEqual([
      ['Ana', 'b', true],
      ['Bruno', 'c', false],
      ['Carla', 'b', true],
    ]);
  });

  it('falla si algún jugador no respondió', () => {
    expect(() => evaluarRonda(pregunta, jugadores, new Map([['j1', 'b']]))).toThrow('Bruno');
  });

  it('suma un punto solo a quienes acertaron, sin modificar el mapa original', () => {
    const iniciales = new Map([['j1', 2]]);
    const nuevos = sumarPuntos(iniciales, evaluarRonda(pregunta, jugadores, respuestas));
    expect(Object.fromEntries(nuevos)).toEqual({ j1: 3, j2: 0, j3: 1 });
    expect(iniciales.get('j1')).toBe(2);
  });
});

describe('calcularRanking', () => {
  it('ordena de mayor a menor y comparte posición en los empates', () => {
    const puntos = new Map([
      ['j1', 3],
      ['j2', 5],
      ['j3', 3],
    ]);
    expect(calcularRanking(jugadores, puntos).map((f) => [f.posicion, f.jugador.nombre, f.puntos])).toEqual([
      [1, 'Bruno', 5],
      [2, 'Ana', 3],
      [2, 'Carla', 3],
    ]);
  });

  it('pone a todos primeros si empatan', () => {
    expect(calcularRanking(jugadores, new Map()).map((f) => f.posicion)).toEqual([1, 1, 1]);
  });

  it('salta posiciones después de un empate (1, 1, 3)', () => {
    const puntos = new Map([
      ['j1', 4],
      ['j2', 4],
      ['j3', 1],
    ]);
    expect(calcularRanking(jugadores, puntos).map((f) => f.posicion)).toEqual([1, 1, 3]);
  });
});

describe('seleccionarPreguntas', () => {
  const preguntas: PreguntaCuestionario[] = [5, 5, 6, 6, 7].map((unidad, i) => ({
    ...crearPregunta({ id: `p${i}` }),
    unidad,
    tituloUnidad: `U${unidad}`,
  }));

  it('filtra por unidad', () => {
    const resultado = seleccionarPreguntas(preguntas, 6, null);
    expect(resultado.map((p) => p.id).sort()).toEqual(['p2', 'p3']);
  });

  it('limita la cantidad y usa todas las unidades con null', () => {
    expect(seleccionarPreguntas(preguntas, null, 3)).toHaveLength(3);
    expect(seleccionarPreguntas(preguntas, null, null)).toHaveLength(5);
  });

  it('no falla si se piden más preguntas de las disponibles', () => {
    expect(seleccionarPreguntas(preguntas, 7, 10)).toHaveLength(1);
  });
});
