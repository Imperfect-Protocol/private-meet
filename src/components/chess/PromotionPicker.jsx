import { Modal } from '../Modal.jsx';
import { ChessPiece } from './ChessPiece.jsx';

const CHOICES = Object.freeze([
  { letter: 'Q', name: 'Queen' },
  { letter: 'R', name: 'Rook' },
  { letter: 'B', name: 'Bishop' },
  { letter: 'N', name: 'Knight' },
]);

/** Asks which piece the Pawn becomes. */
export function PromotionPicker(props) {
  return (
    <Modal title="Promote your pawn" onClose={props.onCancel}>
      <div className="flex justify-center gap-3">
        {CHOICES.map((choice) => (
          <button
            key={choice.letter}
            type="button"
            title={choice.name}
            aria-label={choice.name}
            onClick={() => props.onChoose(choice.letter)}
            className="grid h-16 w-16 place-items-center rounded-lg bg-[#ecd6b0] text-5xl hover:ring-4 hover:ring-rose-400"
          >
            <ChessPiece piece={choice.letter} white={props.white} />
          </button>
        ))}
      </div>
    </Modal>
  );
}
