import { isSupabaseConfigured } from '../../services/supabase';
import { Icon, type IconName } from '../components/Icon';
import { ScreenHeader } from '../components/ScreenHeader';
import './menus.css';

const FEATURES: { icon: IconName; title: string; text: string }[] = [
  { icon: 'plus', title: 'Criar sala', text: 'Escolha modalidade e perfil; os convidados veem o resumo das regras antes de aceitar.' },
  { icon: 'share', title: 'Entrar por convite ou código', text: 'Link ou código de 6 letras.' },
  { icon: 'bolt', title: 'Partida rápida', text: 'Busca de adversários por modalidade.' },
  { icon: 'users', title: 'Grupos permanentes', text: 'Sua turma com as regras salvas do grupo.' },
  { icon: 'chat', title: 'Chat, mensagens rápidas e emojis', text: 'Durante a partida.' },
  { icon: 'trophy', title: 'Ranking, temporadas e torneios', text: 'Glicko-2 separado por modalidade, individual e duplas.' },
];

export function OnlineScreen() {
  return (
    <main className="screen">
      <ScreenHeader title="Jogar online" />
      <div className="screen__body">
        <div className="panel" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <Icon name="info" />
          <p style={{ fontSize: 'var(--fs-sm)' }}>
            O multiplayer está em desenvolvimento (Etapa 5). O banco de dados e as regras de segurança já estão desenhados;
            os botões abaixo ainda <strong>não funcionam</strong>.
            {!isSupabaseConfigured && ' Servidor ainda não configurado neste ambiente.'}
          </p>
        </div>
        <div className="list">
          {FEATURES.map((f) => (
            <div key={f.title} className="list__item" aria-disabled="true">
              <Icon name={f.icon} />
              <span className="list__main">
                <span className="list__label">{f.title}</span>
                <span className="list__hint">{f.text}</span>
              </span>
              <span className="badge badge--soon">Em breve</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
