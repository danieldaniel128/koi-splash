import { describe, expect, it } from 'vitest';

/** Every source file's text, by its path from the tests folder ('../src/model/Board.ts'). */
const SOURCES = import.meta.glob<string>('../src/**/*.ts', { query: '?raw', import: 'default', eager: true });

/** Joins a relative import onto the folder of the file that makes it. */
function resolve(from: string, path: string): string {
  const parts = from.split('/').slice(0, -1);
  for (const part of path.split('/')) {
    if (part === '..') parts.pop();
    else if (part !== '.') parts.push(part);
  }
  return `${parts.join('/')}.ts`;
}

/** Each file's imports of other source files, types included. */
function importGraph(): Map<string, string[]> {
  const graph = new Map<string, string[]>();
  for (const [file, text] of Object.entries(SOURCES)) {
    const targets = [...text.matchAll(/from '(\.[^']+)'/g)].map(([, path = '']) => resolve(file, path));
    graph.set(file, targets);
  }
  return graph;
}

/** The first import cycle found (files that import each other in a ring), or null. Depth-first. */
function findCycle(graph: Map<string, string[]>): string[] | null {
  const done = new Set<string>();
  const path: string[] = [];
  const visit = (file: string): string[] | null => {
    const at = path.indexOf(file);
    if (at >= 0) return [...path.slice(at), file];
    if (done.has(file)) return null;
    path.push(file);
    for (const next of graph.get(file) ?? []) {
      const cycle = visit(next);
      if (cycle) return cycle;
    }
    path.pop();
    done.add(file);
    return null;
  };
  for (const file of graph.keys()) {
    const cycle = visit(file);
    if (cycle) return cycle;
  }
  return null;
}

describe('the source imports', () => {
  it('reads every source file', () => {
    expect(Object.keys(SOURCES).length).toBeGreaterThan(100);
  });

  it('have no cycles, types included, so every module can be read (and tested) on its own', () => {
    expect(findCycle(importGraph())).toBeNull();
  });
});
