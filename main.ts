import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

function solve(level) {
  const rows = level.trimEnd().split(/\r?\n/);
  const width = Math.max(...rows.map(row => row.length));
  const tiles = rows.map(row => row.padEnd(width, '#')).join('');
  const start = tiles.indexOf('@');
  const hallRow = Math.floor(start / width);
  const directions = [-width, width, -1, 1];
  const letters = 'udlr';
  const onHall = cell => Math.floor(cell / width) === hallRow;
  const floor = cell => cell >= 0 && cell < tiles.length && tiles[cell] !== '#';

  function walks(from, allowed, boxes) {
    const paths = new Map([[from, '']]);
    for (const [cell, path] of paths) {
      directions.forEach((step, direction) => {
        const next = cell + step;
        if (allowed(next) && !boxes.has(next) && !paths.has(next)) {
          paths.set(next, path + letters[direction]);
        }
      });
    }
    return paths;
  }

  function roomSolution(door, room) {
    const allowed = cell => cell === door || room.has(cell);
    const goals = new Set([...room].filter(cell => '.*'.includes(tiles[cell])));
    const initial = [...room].filter(cell => '$*'.includes(tiles[cell])).sort((a, b) => a - b);

    // Mark the squares from which a single box can ever reach a goal.
    const useful = new Set(goals);
    for (const cell of useful) {
      for (const step of directions) {
        const previous = cell - step;
        if (room.has(previous) && allowed(previous - step)) useful.add(previous);
      }
    }

    // Every edge is one push. Walking within a reachable region costs no pushes.
    const queue = [{ player: door, boxes: initial, path: '' }];
    const seen = new Set();
    for (const { player, boxes, path } of queue) {
      const occupied = new Set(boxes);
      const paths = walks(player, allowed, occupied);
      const key = String.fromCharCode(Math.min(...paths.keys()), ...boxes);
      if (seen.has(key)) continue;
      seen.add(key);
      if (boxes.every(cell => goals.has(cell))) return path + paths.get(door);

      boxes.forEach((cell, index) => {
        directions.forEach((step, direction) => {
          const destination = cell + step;
          const approach = paths.get(cell - step);
          if (approach === undefined || !useful.has(destination) || occupied.has(destination)) return;
          const moved = boxes.slice();
          moved[index] = destination;
          moved.sort((a, b) => a - b);
          queue.push({ player: cell, boxes: moved, path: path + approach + letters[direction] });
        });
      });
    }
    throw new Error('Room has no solution');
  }

  // Each room connects at a single hallway square and can be solved independently.
  const empty = new Set();
  const hall = cell => floor(cell) && onHall(cell);
  const inside = cell => floor(cell) && !onHall(cell);
  let player = start;
  let solution = '';
  for (const door of walks(start, hall, empty).keys()) {
    for (const step of [-width, width]) {
      if (!inside(door + step)) continue;
      const room = new Set(walks(door + step, inside, empty).keys());
      solution += walks(player, hall, empty).get(door) + roomSolution(door, room);
      player = door;
    }
  }
  return solution;
}

const input = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const output = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
for (const id of readdirSync(input).sort()) {
  const solution = solve(readFileSync(join(input, id, 'level.txt'), 'utf8'));
  mkdirSync(join(output, id), { recursive: true });
  writeFileSync(join(output, id, 'solution.txt'), solution + '\n');
}
