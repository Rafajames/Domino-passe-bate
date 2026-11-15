import { useState } from 'react';
import type { GameMode, RuleProfile } from '../../engine/rules/types';
import { decodeProfile, encodeProfile } from '../../services/shareCode';
import { useNav } from '../../state/navigation';
import { useProfiles } from '../../state/profilesStore';
import { Icon } from '../components/Icon';
import { RuleSummary } from '../components/RuleSummary';
import { ScreenHeader } from '../components/ScreenHeader';
import { MODE_LABEL } from '../rules/describe';
import { useToast } from '../components/Toast';
import './menus.css';

export function ProfilesScreen({ mode }: { mode: GameMode }) {
  const go = useNav((s) => s.go);
  const custom = useProfiles((s) => s.custom);
  const byMode = useProfiles((s) => s.byMode);
  const create = useProfiles((s) => s.create);
  const remove = useProfiles((s) => s.remove);
  const toast = useToast();
  const profiles = byMode(mode);
  const [open, setOpen] = useState<string | null>(profiles[0]?.id ?? null);
  const [importCode, setImportCode] = useState('');
  void custom; // re-render quando perfis personalizados mudam

  async function share(p: RuleProfile) {
    const code = encodeProfile({ name: p.name, mode: p.mode, rules: p.rules, basedOn: p.basedOn ?? p.id });
    try {
      if (navigator.share) {
        await navigator.share({ title: `Regras: ${p.name}`, text: `Perfil de regras “${p.name}” para o Passe & Bate:\n${code}` });
        return;
      }
      await navigator.clipboard.writeText(code);
      toast('Código copiado. Envie para seus amigos.');
    } catch {
      toast('Não foi possível compartilhar automaticamente.');
    }
  }

  function doImport() {
    try {
      const shared = decodeProfile(importCode);
      if (shared.mode !== mode) {
        toast(`Esse código é de ${MODE_LABEL[shared.mode]}.`);
        return;
      }
      const p = create({ name: shared.name, mode: shared.mode, rules: shared.rules, basedOn: shared.basedOn, description: 'Importado de um código compartilhado.' });
      setImportCode('');
      setOpen(p.id);
      toast(`Perfil “${p.name}” importado.`);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Código inválido.');
    }
  }

  return (
    <main className="screen">
      <ScreenHeader title={MODE_LABEL[mode]} />
      <div className="screen__body">
        <h2 className="section-title">Perfis de regras</h2>
        <div className="list">
          {profiles.map((p) => {
            const isOpen = open === p.id;
            return (
              <section key={p.id} className="profile">
                <button className="profile__head" onClick={() => setOpen(isOpen ? null : p.id)} aria-expanded={isOpen}>
                  <span className="list__main">
                    <span className="profile__name">{p.name}</span>
                    <span className="profile__desc">
                      {p.builtIn ? 'Perfil oficial' : `Personalizado · v${p.version}`}
                    </span>
                  </span>
                  <span className={`chev ${isOpen ? 'chev--open' : ''}`}>
                    <Icon name="back" size={18} />
                  </span>
                </button>
                {isOpen && (
                  <div className="profile__body">
                    <p className="muted" style={{ fontSize: 'var(--fs-sm)' }}>{p.description}</p>
                    <RuleSummary rules={p.rules} status={p.ruleStatus} />
                    <div className="profile__actions">
                      <button className="btn btn--primary" onClick={() => go({ name: 'setup', profileId: p.id })}>
                        <Icon name="play" size={18} /> Jogar
                      </button>
                      <button className="btn btn--sm" onClick={() => go({ name: 'editor', mode, profileId: p.id })}>
                        <Icon name="edit" size={18} /> {p.builtIn ? 'Personalizar' : 'Editar'}
                      </button>
                      <button className="btn btn--sm" onClick={() => share(p)}>
                        <Icon name="share" size={18} /> Compartilhar
                      </button>
                      {!p.builtIn && (
                        <button
                          className="btn btn--sm btn--ghost"
                          onClick={() => {
                            if (confirm(`Excluir o perfil “${p.name}”?`)) remove(p.id);
                          }}
                        >
                          <Icon name="trash" size={18} /> Excluir
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>

        <section className="panel" aria-labelledby="import-title">
          <div className="field">
            <label id="import-title" className="field__label" htmlFor="import-code">
              Recebeu um código de regras?
            </label>
            <textarea
              id="import-code"
              className="input"
              placeholder="Cole aqui o código (começa com DPB1.)"
              value={importCode}
              onChange={(e) => setImportCode(e.target.value)}
            />
            <button className="btn btn--sm" onClick={doImport} disabled={!importCode.trim()}>
              <Icon name="download" size={18} /> Importar perfil
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
