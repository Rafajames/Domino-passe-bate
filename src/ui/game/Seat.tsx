import type { PlayerSlot } from '../../engine/types';
import { Avatar } from '../components/Avatar';
import { TileBack } from '../components/Tile';
import { DIFFICULTY_LABEL } from '../../ai/bots';

export type SeatPosition = 'top' | 'left' | 'right';

interface Props {
  player: PlayerSlot;
  position: SeatPosition;
  count: number;
  active: boolean;
  teamColor: string;
  bubble: { key: number; text: string } | null;
  showBacks: boolean;
}

export function Seat({ player, position, count, active, teamColor, bubble, showBacks }: Props) {
  return (
    <div className={`seat seat--${position} ${active ? 'is-active' : ''}`} aria-label={`${player.name}, ${count} pedras${active ? ', jogando agora' : ''}`}>
      <div className="seat__chip">
        <span className="seat__avatar">
          <Avatar emoji={player.avatar} size={34} ring={teamColor} />
          {active && <span className="seat__pulse" aria-hidden />}
        </span>
        <span className="seat__info">
          <span className="seat__name">{player.name}</span>
          <span className="seat__meta">
            {count === 0 ? 'bateu ✓' : `${count} pedra${count === 1 ? '' : 's'}`}
            {player.kind === 'bot' && player.difficulty ? ` · ${DIFFICULTY_LABEL[player.difficulty]}` : ''}
          </span>
        </span>
        {bubble && (
          <span key={bubble.key} className="seat__bubble" role="status">
            {bubble.text}
          </span>
        )}
      </div>
      {showBacks && count > 0 && (
        <div className="seat__backs" aria-hidden>
          {Array.from({ length: Math.min(count, 10) }, (_, i) => (
            <TileBack key={i} unit={11} />
          ))}
        </div>
      )}
    </div>
  );
}
