import test from 'node:test';
import { ChessBoard } from '../src/lib/chess/ChessBoard.js';

test('debug starting position', () => {
  const board = new ChessBoard();
  console.error('TURN', board.turn);
  console.error('BOARD_LINE_8', board.board.slice(0, 8).join(''));
  console.error('BOARD_LINE_7', board.board.slice(8, 16).join(''));
  console.error('BOARD_LINE_2', board.board.slice(48, 56).join(''));
  console.error('BOARD_LINE_1', board.board.slice(56, 64).join(''));
  const moves = board.legalMoves();
  console.error('MOVES_COUNT', moves.length);
});
