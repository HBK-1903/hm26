// Live/quick compatibility adapter. Scheduling and the optional legacy SubManager
// stay here; all football simulation and command/event state live in SimulationCore.
import type { MatchInput, SubManager } from './engine';
import type { MatchResult, MatchStateEvent } from './core/contracts';
import { SimulationCore, type TeamTalkChoice, type TouchlineCommand } from './core/simulation';
import { toSimulationInput } from './adapters/simulationInput';
import type { MatchSide } from './core/types';
import type { TacticPlan } from '../types';

export type { LiveBallState, TeamTalkChoice, TouchlineCommand, TouchlineState } from './core/simulation';

export class MatchSession {
  private readonly core: SimulationCore;
  private readonly subManager?: SubManager;

  constructor(input: MatchInput) {
    this.core = new SimulationCore(toSimulationInput(input));
    this.subManager = input.subMgr;
  }

  get done(): boolean { return this.core.done; }
  getSimulationInput() { return this.core.getInput(); }
  getStepCount() { return this.core.getStepCount(); }
  getCommandLog() { return this.core.getCommandLog(); }
  getCommandLogHash() { return this.core.getCommandLogHash(); }
  getCoreEvents() { return this.core.getCoreEvents(); }
  getAiDecisionTraces() { return this.core.getAiDecisionTraces(); }
  getReferee() { return this.core.getReferee(); }
  getMinute() { return this.core.getMinute(); }
  getSecond() { return this.core.getSecond(); }
  getElapsedSeconds() { return this.core.getElapsedSeconds(); }
  getStats() { return this.core.getStats(); }
  getBallState() { return this.core.getBallState(); }
  getMomentum() { return this.core.getMomentum(); }
  getTouchlineState(side: MatchSide) { return this.core.getTouchlineState(side); }
  getEvents() { return this.core.getEvents(); }
  getWeather() { return this.core.getWeather(); }
  getShotsLog() { return this.core.getShotsLog(); }
  getTactic(side: MatchSide) { return this.core.getTactic(side); }
  getTeamProfile(side: MatchSide) { return this.core.getTeamProfile(side); }
  getSlots(side: MatchSide) { return this.core.getSlots(side); }
  getBench(side: MatchSide) { return this.core.getBench(side); }
  subsLeft(side: MatchSide) { return this.core.subsLeft(side); }
  windowsLeft(side: MatchSide) { return this.core.windowsLeft(side); }
  canQueueSub(side: MatchSide) { return this.core.canQueueSub(side); }
  queueSub(side: MatchSide, outId: string, inId: string) { return this.core.queueSub(side, outId, inId); }
  queueTactic(side: MatchSide, plan: TacticPlan) { return this.core.queueTactic(side, plan); }
  useShout(side: MatchSide, command: TouchlineCommand) { return this.core.useShout(side, command); }
  canProtest(side: MatchSide) { return this.core.canProtest(side); }
  protest(side: MatchSide) { return this.core.protest(side); }
  protestLeft(side: MatchSide) { return this.core.protestLeft(side); }
  applyTeamTalk(side: MatchSide, choice: TeamTalkChoice) { return this.core.applyTeamTalk(side, choice); }
  waitForInjuredPlayer(playerId: string) { return this.core.waitForInjuredPlayer(playerId); }

  step(): MatchStateEvent[] {
    const started = this.core.beginStep();
    if (!started.ready) return started.events;
    try {
      // Historical callbacks are queried at their original boundaries, but never
      // enter the normalized core input. Their accepted requests are logged too.
      for (const side of ['home', 'away'] as const) {
        if (this.core.canPollLegacyTactic(side)) {
          const request = this.subManager?.takeTacticRequest(side);
          if (request) this.core.queueLegacyTactic(side, request.plan);
        }
      }
      this.core.applyTacticsBoundary();
      for (const side of ['home', 'away'] as const) {
        if (this.core.canPollLegacySub(side)) {
          const request = this.subManager?.takeSubRequest(side);
          if (request) this.core.queueLegacySub(side, request.outId, request.inId);
        }
        this.core.applySubstitutionBoundary(side);
      }
      return this.core.completeStep();
    } catch (error) { this.core.abortStep(); throw error; }
  }

  finishNow(): MatchResult {
    while (!this.done) this.step();
    return this.toResult();
  }
  toResult(): MatchResult { return this.core.toResult(); }
}
