import { html, nothing, type TemplateResult } from 'lit';
import { styleMap } from 'lit/directives/style-map.js';

import { driverCode, fullName, toNumber } from '../f1/data';
import { raceFacts } from '../f1/race-facts';
import { sessionDate, sessionStatus, type WeekendSession } from '../f1/sessions';
import { countryFlag, teamColor } from '../f1/teams';
import type { TitleFight } from '../f1/title-fight';
import type { F1Data, Race, RaceResult } from '../f1/types';
import type { HomeAssistant } from '../ha-types';
import { localize, localizePlural } from '../localize/localize';
import type { CardMode } from '../types';
import { formatCountdown, formatDate, formatDateRange } from '../utils/format';

export interface RenderContext {
  hass: HomeAssistant;
  now: Date;
  data: F1Data;
  mode: CardMode;
  sessions: WeekendSession[];
  upcoming?: WeekendSession;
  titleFight?: TitleFight;
}

type Block = TemplateResult | typeof nothing;

export function renderHeader(ctx: RenderContext, round: string | undefined): TemplateResult {
  const { hass } = ctx;
  const tag =
    ctx.mode !== 'off' && ctx.titleFight?.clinched
      ? `🏆 ${localize(hass, 'mode.clinched')}`
      : localize(hass, `mode.${ctx.mode}`);
  return html`
    <div class="header">
      <span>🏎️ ${localize(hass, 'header.title')}</span>
      ${round ? html`<span class="round">${localize(hass, 'header.round', { round })}</span>` : nothing}
      <span class="tag">${tag}</span>
    </div>
  `;
}

export function renderGrandPrix(ctx: RenderContext, race: Race): Block {
  if (!race.raceName) return nothing;
  const start = sessionDate(race);
  const first = ctx.sessions[0]?.start ?? start;
  const circuit = race.Circuit ?? {};
  const details = [
    circuit.circuitName,
    circuit.Location?.locality,
    first && start ? formatDateRange(first, start, ctx.hass) : undefined,
  ].filter(Boolean);
  return html`
    <div class="gp">
      <div class="flag" aria-hidden="true">${countryFlag(race)}</div>
      <div>
        <div class="name">${race.raceName}</div>
        <div class="sub">${details.join(' · ')}</div>
      </div>
    </div>
  `;
}

export function renderCountdown(ctx: RenderContext): Block {
  const { hass, now } = ctx;
  const start = sessionDate(ctx.data.next);
  const first = ctx.upcoming && ctx.upcoming.key !== 'race' ? ctx.upcoming : undefined;
  return html`
    <div class="countdown">
      <div class="label">${localize(hass, 'week.race_start')}</div>
      <div class="value">${start ? formatCountdown(start, now, hass) : '—'}</div>
      <div class="sub">
        ${
          start
            ? formatDate(start, hass, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                hour: '2-digit',
                minute: '2-digit',
              })
            : nothing
        }
      </div>
    </div>
    ${
      first
        ? html`<div class="foot">
            ⏱️ ${localize(hass, 'week.first_session')}
            <b>${localize(hass, `session.${first.key}`)}</b> ·
            ${formatDate(first.start, hass, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>`
        : nothing
    }
  `;
}

export function renderSessions(ctx: RenderContext): Block {
  const { hass, now } = ctx;
  if (!ctx.sessions.length) return nothing;
  return html`
    <div class="section">${localize(hass, 'weekend.schedule')}</div>
    ${ctx.sessions.map((session) => {
      const status = sessionStatus(session, now, ctx.upcoming);
      const when = formatDate(session.start, hass, {
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
      let pill: Block = nothing;
      if (status === 'done') {
        pill = html`<span class="pill done">${localize(hass, 'status.done')}</span>`;
      } else if (status === 'live') {
        pill = html`<span class="pill live">${localize(hass, 'status.live')}</span>`;
      } else if (status === 'next') {
        pill = html`<span class="pill next"
          >${localize(hass, 'status.next', { time: formatCountdown(session.start, now, hass) })}</span
        >`;
      }
      return html`
        <div class="row session ${status === 'done' ? 'done' : ''}">
          <span class="driver">${localize(hass, `session.${session.key}`)}</span>
          <span class="when">${when}</span>
          ${pill}
        </div>
      `;
    })}
  `;
}

export function renderStandings(ctx: RenderContext, rows: number): Block {
  const { hass, data } = ctx;
  const standings = data.driverStandings;
  if (!standings.length) return nothing;
  const leaderPoints = toNumber(standings[0].points);
  const round = data.standings.round;
  return html`
    <div class="section">
      ${localize(hass, 'standings.title')}${
        round ? ` · ${localize(hass, 'standings.after_round', { round })}` : nothing
      }
    </div>
    ${standings.slice(0, rows).map((standing, index) => {
      const team = standing.Constructors?.[0];
      const gap = toNumber(standing.points) - leaderPoints;
      return html`
        <div class="row standing">
          <span class="pos">${standing.position ?? index + 1}</span>
          <span class="bar" style=${styleMap({ background: teamColor(team) })}></span>
          <span class="driver"
            >${standing.Driver.familyName}<span class="team">${team?.name ?? ''}</span></span
          >
          <span class="points">${standing.points}</span>
          <span class="gap">${gap ? gap : ''}</span>
        </div>
      `;
    })}
  `;
}

function renderStep(result: RaceResult, place: string): TemplateResult {
  return html`
    <div class="step ${place}">
      <div class="who">${driverCode(result.Driver)}</div>
      <div class="time">${result.Time?.time ?? result.status ?? ''}</div>
      <div class="block" style=${styleMap({ background: teamColor(result.Constructor) })}>
        ${result.position}
      </div>
    </div>
  `;
}

/** Name and date of the last Grand Prix: no result, so it stays visible behind the spoiler veil. */
export function renderLastGrandPrix(ctx: RenderContext): TemplateResult {
  const { hass } = ctx;
  const last = ctx.data.last;
  const start = sessionDate(last);
  return html`
    <div class="gp">
      <div class="flag" aria-hidden="true">${countryFlag(last)}</div>
      <div>
        <div class="name">${last.raceName ?? localize(hass, 'results.last_grand_prix')}</div>
        <div class="sub">
          ${
            start
              ? formatDate(start, hass, { weekday: 'long', day: 'numeric', month: 'long' })
              : nothing
          }
        </div>
      </div>
    </div>
  `;
}

/** Podium and race facts of the last Grand Prix. */
export function renderResults(ctx: RenderContext): Block {
  const { hass, data } = ctx;
  const results = data.results;
  const facts = raceFacts(results);
  return html`
    ${
      results.length >= 3
        ? html`<div class="podium">
            ${renderStep(results[1], 'p2')}${renderStep(results[0], 'p1')}${renderStep(
              results[2],
              'p3',
            )}
          </div>`
        : nothing
    }
    ${
      results.length
        ? html`<div class="facts">
            ${
              facts.fastestLap
                ? html`<div class="fact">
                    <b>${localize(hass, 'results.fastest_lap')}</b
                    >${driverCode(facts.fastestLap.driver)} · ${facts.fastestLap.time}
                  </div>`
                : nothing
            }
            ${
              facts.biggestGain
                ? html`<div class="fact">
                    <b>${localize(hass, 'results.biggest_gain')}</b>${driverCode(
                      facts.biggestGain.driver,
                    )}
                    · ${localizePlural(hass, 'results.places', facts.biggestGain.places)}
                  </div>`
                : nothing
            }
            <div class="fact">
              <b>${localize(hass, 'results.retirements')}</b>${
                facts.retirements.length
                  ? facts.retirements.map(driverCode).join(', ')
                  : localize(hass, 'results.none')
              }
            </div>
          </div>`
        : nothing
    }
  `;
}

/**
 * Blurs `content` while `hidden`, under a veil that reveals it when pressed.
 * The veil stays in the DOM once revealed so that it fades out.
 */
export function renderSpoilerShield(
  ctx: RenderContext,
  content: Block,
  shield: { hidden: boolean; until: Date; onReveal: () => void },
): TemplateResult {
  const { hass, now } = ctx;
  // The card's tap and hold actions listen on the card: the veil keeps its presses to itself.
  const stop = (event: Event) => event.stopPropagation();
  return html`
    <div class="spoiler ${shield.hidden ? 'hidden' : ''}">
      <div
        class="spoiler-content"
        aria-hidden=${shield.hidden ? 'true' : 'false'}
        ?inert=${shield.hidden}
      >
        ${content}
      </div>
      <button
        class="veil"
        type="button"
        tabindex=${shield.hidden ? '0' : '-1'}
        aria-hidden=${shield.hidden ? 'false' : 'true'}
        @click=${shield.onReveal}
        @pointerdown=${stop}
        @pointerup=${stop}
        @keydown=${stop}
      >
        <span class="veil-badge">
          <span class="veil-flag" aria-hidden="true"></span>
          <ha-icon class="veil-icon" icon="mdi:eye-off-outline" aria-hidden="true"></ha-icon>
          <span class="veil-title">${localize(hass, 'spoiler.title')}</span>
          <span class="veil-action">${localize(hass, 'spoiler.reveal')}</span>
          <span class="veil-sub"
            >${localize(hass, 'spoiler.auto', { time: formatCountdown(shield.until, now, hass) })}</span
          >
        </span>
      </button>
    </div>
  `;
}

export function renderNextRaceFooter(ctx: RenderContext): Block {
  const { hass, now, data } = ctx;
  const start = sessionDate(data.next);
  if (!start || !data.next.raceName) return nothing;
  return html`
    <div class="foot">
      ${countryFlag(data.next)} ${localize(hass, 'results.next')} <b>${data.next.raceName}</b>
      ${localize(hass, 'results.in', { time: formatCountdown(start, now, hass) })}
    </div>
  `;
}

export function renderTitleFight(ctx: RenderContext): Block {
  const { hass } = ctx;
  const fight = ctx.titleFight;
  if (!fight) return nothing;
  const leader = fight.leader.Driver;
  if (fight.clinched) {
    return html`
      <div class="champion">
        🏆 <b>${localize(hass, 'title_fight.clinched', { name: fullName(leader) })}</b>
        <div class="sub">
          ${localize(hass, 'title_fight.clinched_detail', {
            lead: fight.lead,
            points: fight.pointsLeft,
          })}
        </div>
      </div>
    `;
  }
  const remaining = [localizePlural(hass, 'title_fight.races', fight.racesLeft)];
  if (fight.sprintsLeft) {
    remaining.push(localizePlural(hass, 'title_fight.sprints', fight.sprintsLeft));
  }
  return html`
    <div class="section">${localize(hass, 'title_fight.title')}</div>
    <div class="title-fight">
      <div>
        <b>${fight.pointsLeft}</b> ${localize(hass, 'title_fight.points_left')}
        <span class="sub">(${remaining.join(' + ')})</span>
      </div>
      <div>
        ${localize(hass, 'title_fight.contenders')}
        <b>${leader.familyName}</b>${fight.contenders.map(
          (contender) =>
            html`, ${contender.standing.Driver.familyName}
              <span class="sub">(−${contender.gap})</span>`,
        )}
      </div>
      ${
        fight.matchPoint
          ? html`<div class="match-point">
              ⚡
              ${localize(hass, 'title_fight.match_point', {
                name: leader.familyName,
                race: fight.matchPoint.race.raceName ?? '',
                points: fight.matchPoint.requiredLead,
              })}
            </div>`
          : nothing
      }
    </div>
  `;
}

export function renderOffSeason(ctx: RenderContext): Block {
  const { hass, data } = ctx;
  const champion = data.driverStandings[0];
  const winner = data.results[0];
  const season = data.standings.season;
  return html`
    <div class="countdown">
      <div class="label">
        ${
          season
            ? localize(hass, 'off.season_over', { season })
            : localize(hass, 'off.season_over_unknown')
        }
      </div>
      <div class="value">🏆 ${champion ? fullName(champion.Driver) : '—'}</div>
      <div class="sub">
        ${
          champion
            ? [
                localize(hass, 'off.points', { points: champion.points }),
                champion.Constructors?.[0]?.name,
              ]
                .filter(Boolean)
                .join(' · ')
            : nothing
        }
      </div>
    </div>
    ${
      data.last.raceName
        ? html`<div class="foot">
            ${countryFlag(data.last)} ${localize(hass, 'off.last_race')}
            <b>${data.last.raceName}</b>${
              winner
                ? html` · ${localize(hass, 'off.won_by', { name: winner.Driver.familyName })}`
                : nothing
            }
          </div>`
        : nothing
    }
  `;
}
