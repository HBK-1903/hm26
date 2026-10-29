// HM26 §12 — Phaser 2D canlı saha: TV yayın estetiği, zonal shifting ve top fiziği.
// Lazy-loaded; saha çizimi ve hareketler cihaz üzerinde üretilir (offline-first).
import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { ZoneId, ZONE_XY } from '../../engine/zones';
import { toStadiumPoint } from '../../engine/pitch-ai';
import { pitchFormationSlots, pitchPlayerTarget, pitchTeamColors, pitchTransitionMs } from './pitchPresentation';
import type { MatchAnimationType } from '../../engine/engine';
import type { PositionGroup } from '../../types';

export interface PitchEvent {
  path?: ZoneId[];
  color?: string;
  kind?: 'goal' | 'save' | 'card' | 'info' | 'chance' | 'var';
  side?: 'home' | 'away';
  actors?: string[];
  highBall?: boolean;
  minute?: number;
  actionType?: MatchAnimationType;
  reduceMotion?: boolean;
  brawl?: boolean;
  /** Stable event sequence distinguishes similar actions in the same minute. */
  sequence?: number;
}
export interface PitchPlayer {
  id: string; name: string; kitNumber?: number; group: PositionGroup;
  fitness: number; rating: number; yellow: number; red: number; sentOff?: boolean; injured?: boolean;
}
export interface TeamDots {
  side: 'home' | 'away'; formation: string; color1: string; color2: string;
  width: number; defLine: 'deep' | 'normal' | 'high'; players: PitchPlayer[]; pressing?: boolean;
}
export interface HeatPoint { x: number; y: number; side: 'home' | 'away'; }
export interface PitchRuntime {
  x: number; y: number; z: number; owner: 'home' | 'away'; ownerId: string | null; activeIds: string[];
}

type Point = { x: number; y: number };
export interface PitchPresentationState {
  home?: TeamDots; away?: TeamDots; runtime?: PitchRuntime;
  heatPoints: HeatPoint[]; heatEnabled: boolean; heatTeam: 'all' | 'home' | 'away';
  paused: boolean; completed: boolean; reduceMotion: boolean; stepMs: number;
}

/** Phaser is presentation-only; the match session remains the source of truth. */
export class PitchScene extends Phaser.Scene {
  private field!: Phaser.GameObjects.Graphics;
  private heatOverlay!: Phaser.GameObjects.Graphics;
  private heatPoints: HeatPoint[] = [];
  private heatEnabled = false;
  private heatTeam: 'all' | 'home' | 'away' = 'all';
  private trail!: Phaser.GameObjects.Graphics;
  private ball!: Phaser.GameObjects.Arc;
  private shadow!: Phaser.GameObjects.Ellipse;
  private dotLayer!: Phaser.GameObjects.Container;
  private spriteById = new Map<string, Phaser.GameObjects.Container>();
  private homeDots: TeamDots | null = null;
  private awayDots: TeamDots | null = null;
  private runtime: PitchRuntime = { x: 50, y: 50, z: 0, owner: 'home', ownerId: null, activeIds: [] };
  private runtimeKey = '';
  private cueActors: string[] = [];
  private activeBallTween: Phaser.Tweens.Tween | null = null;
  private ballGround: Point = { x: 0, y: 0 };
  private ballTargetKey = '';
  private cinematic = false;
  private presentationPaused = false;
  private completed = false;
  private reduceMotion = false;
  private stepMs = 260;
  private cueObjects = new Set<Phaser.GameObjects.GameObject>();
  private trailVersion = 0;

  constructor(private readonly onReady?: (scene: PitchScene) => void) { super('pitch'); }

  create() {
    this.field = this.add.graphics().setDepth(0);
    this.heatOverlay = this.add.graphics().setDepth(0.6);
    this.trail = this.add.graphics().setDepth(1);
    this.dotLayer = this.add.container(0, 0).setDepth(2);
    this.shadow = this.add.ellipse(0, 0, 8, 4, 0x07130a, 0.36).setDepth(2.5);
    this.ball = this.add.circle(0, 0, 4.1, 0xfffaf0, 1).setDepth(4).setStrokeStyle(1.2, 0x17221a, 0.9);
    this.drawField();
    const centre = this.groundPoint(50, 50);
    this.setBall(centre.x, centre.y);
    this.game.events.on('posevent', (ev: PitchEvent) => this.processEvent(ev));
    this.game.events.on('pitchstate', (state: PitchPresentationState, initial = false) => this.applyPresentation(state, initial));
    this.scale.on(Phaser.Scale.Events.RESIZE, () => {
      // Old tweens use pixel coordinates from the old size; never drag them across the resized pitch.
      this.cancelBallAnimation();
      this.trailVersion++;
      this.tweens.killTweensOf(this.trail);
      this.trail.clear().setAlpha(1);
      this.drawField(); this.drawHeatmap(); this.drawPlayers(true); this.moveBallToRuntime(0);
    });
    this.onReady?.(this);
  }

  private applyPresentation(state: PitchPresentationState, initial: boolean) {
    const motionChanged = this.reduceMotion !== state.reduceMotion;
    const justCompleted = state.completed && !this.completed;
    this.completed = state.completed;
    const previousHeat = this.heatPoints;
    const heatChanged = this.heatEnabled !== state.heatEnabled || this.heatTeam !== state.heatTeam;
    this.reduceMotion = state.reduceMotion;
    this.stepMs = state.stepMs;
    this.homeDots = state.home ?? null;
    this.awayDots = state.away ?? null;
    if (state.runtime) {
      const runtimeKey = `${state.runtime.owner}:${state.runtime.ownerId}:${state.runtime.x}:${state.runtime.y}:${state.runtime.z}:${state.runtime.activeIds.join(',')}`;
      if (runtimeKey !== this.runtimeKey) this.cueActors = [];
      this.runtimeKey = runtimeKey;
      this.runtime = state.runtime;
    }
    this.heatPoints = state.heatPoints;
    this.heatEnabled = state.heatEnabled;
    this.heatTeam = state.heatTeam;
    if (heatChanged || (this.heatEnabled && previousHeat !== this.heatPoints)) this.drawHeatmap();
    if ((motionChanged && this.reduceMotion) || justCompleted) this.clearAnimatedCues();
    this.drawPlayers(initial || justCompleted || (motionChanged && this.reduceMotion));
    if (!this.cinematic) this.moveBallToRuntime(initial || this.reduceMotion || state.completed ? 0 : undefined);
    if (state.paused !== this.presentationPaused) {
      this.presentationPaused = state.paused;
      if (state.paused) this.scene.pause(); else this.scene.resume();
    }
  }

  private trackCue<T extends Phaser.GameObjects.GameObject>(object: T): T {
    this.cueObjects.add(object);
    object.once(Phaser.GameObjects.Events.DESTROY, () => this.cueObjects.delete(object));
    return object;
  }

  private cancelBallAnimation() {
    this.activeBallTween?.stop();
    this.activeBallTween = null;
    this.cinematic = false;
    this.ballTargetKey = '';
  }

  private clearAnimatedCues() {
    this.cancelBallAnimation();
    this.trailVersion++;
    this.tweens.killTweensOf([this.trail, this.cameras.main]);
    this.trail.clear().setAlpha(1);
    this.cameras.main.setZoom(1);
    this.cameras.main.shakeEffect.reset();
    for (const object of this.cueObjects) { this.tweens.killTweensOf(object); object.destroy(); }
    this.cueObjects.clear();
  }

  private dims() { return { w: this.scale.width, h: this.scale.height, m: Math.max(12, this.scale.width * 0.055) }; }
  private drawField() {
    if (!this.field) return;
    const { w, h, m } = this.dims();
    this.field.clear().fillStyle(0x204e34, 1).fillRect(0, 0, w, h);
    const bandH = (h - m * 2) / 10;
    for (let i = 0; i < 10; i++) this.field.fillStyle(i % 2 ? 0x2b6842 : 0x2f7047, 0.84).fillRect(m, m + i * bandH, w - m * 2, bandH);
    // Stadium-like soft end lighting and slightly dark touchline vignette.
    this.field.fillStyle(0xcbe8c8, 0.045).fillRect(m, m, w - m * 2, h * 0.13);
    this.field.fillStyle(0x07170d, 0.13).fillRect(0, 0, m, h);
    this.field.fillStyle(0x07170d, 0.13).fillRect(w - m, 0, m, h);
    const chalk = 0xe5f0dc;
    this.field.lineStyle(1.35, chalk, 0.88).strokeRect(m, m, w - m * 2, h - m * 2);
    this.field.lineStyle(1.15, chalk, 0.78).lineBetween(m, h / 2, w - m, h / 2);
    this.field.strokeCircle(w / 2, h / 2, Math.min(w, h) * 0.105);
    this.field.fillStyle(chalk, 0.88).fillCircle(w / 2, h / 2, 1.6);
    const boxW = (w - m * 2) * 0.58, boxH = (h - m * 2) * 0.16;
    const smallW = (w - m * 2) * 0.34, smallH = (h - m * 2) * 0.065;
    this.field.lineStyle(1.1, chalk, 0.8).strokeRect((w - boxW) / 2, m, boxW, boxH);
    this.field.strokeRect((w - boxW) / 2, h - m - boxH, boxW, boxH);
    this.field.strokeRect((w - smallW) / 2, m, smallW, smallH);
    this.field.strokeRect((w - smallW) / 2, h - m - smallH, smallW, smallH);
    this.field.fillStyle(chalk, 0.9).fillCircle(w / 2, m + boxH * 0.68, 1.5);
    this.field.fillStyle(chalk, 0.9).fillCircle(w / 2, h - m - boxH * 0.68, 1.5);
    this.field.lineStyle(1.1, 0xddebd4, 0.9).strokeRect(w / 2 - w * 0.12, m - 5, w * 0.24, 5);
    this.field.strokeRect(w / 2 - w * 0.12, h - m, w * 0.24, 5);
    // Penalty arcs are approximated with a partial circle to avoid an external asset dependency.
    this.field.lineStyle(1.0, chalk, 0.7).beginPath();
    this.field.arc(w / 2, m + boxH * 0.68, boxH * 0.35, 0.18 * Math.PI, 0.82 * Math.PI, false);
    this.field.strokePath();
    this.field.beginPath().arc(w / 2, h - m - boxH * 0.68, boxH * 0.35, 1.18 * Math.PI, 1.82 * Math.PI, false).strokePath();
  }

  private drawHeatmap() {
    if (!this.heatOverlay) return;
    this.heatOverlay.clear();
    if (!this.heatEnabled || !this.heatPoints.length) return;
    const bins = new Map<string, { x: number; y: number; count: number }>();
    for (const point of this.heatPoints) {
      if (this.heatTeam !== 'all' && this.heatTeam !== point.side) continue;
      const cx = Math.max(0, Math.min(9, Math.floor(point.x / 10)));
      const cy = Math.max(0, Math.min(9, Math.floor(point.y / 10)));
      const key = `${cx}:${cy}`;
      const bin = bins.get(key) ?? { x: cx * 10 + 5, y: cy * 10 + 5, count: 0 };
      bin.count++;
      bins.set(key, bin);
    }
    const max = Math.max(1, ...[...bins.values()].map((b) => b.count));
    const color = this.heatTeam === 'home' ? 0xf29b4b : this.heatTeam === 'away' ? 0x65b8da : 0xf07845;
    for (const bin of bins.values()) {
      const intensity = bin.count / max;
      const point = this.groundPoint(bin.x, bin.y);
      this.heatOverlay.fillStyle(color, 0.07 + intensity * 0.19).fillCircle(point.x, point.y, 12 + intensity * 18);
    }
  }

  private makePlayerSprite(p: PitchPlayer, color: number, outline: number, numberColor: string) {
    const c = this.add.container(0, 0);
    const pressAura = this.add.circle(0, 0, 14, 0xf08b39, 0.10).setStrokeStyle(1.2, 0xffb45e, 0.65).setVisible(false);
    const halo = this.add.circle(0, 0, 10, 0xf4ce58, 0).setStrokeStyle(1.7, 0xffe98a, 0);
    const disc = this.add.circle(0, 0, 7.2, color, 0.98).setStrokeStyle(1.35, outline, 0.96);
    const fatigueMark = this.add.circle(-5.7, -5.6, 2, 0x85d9ed, 0).setStrokeStyle(0.7, 0xe2fbff, 0.9);
    const label = this.add.text(0, 0.1, String(p.kitNumber ?? ''), { fontFamily: 'system-ui, sans-serif', fontSize: '8px', fontStyle: '700', color: numberColor, stroke: numberColor === '#182c24' ? '#fff5df' : '#14231b', strokeThickness: 1.8 }).setOrigin(0.5);
    const card = this.add.rectangle(5.8, -5.3, 4, 5.5, p.red ? 0xf04438 : p.yellow ? 0xf7cd4b : 0x000000, p.red || p.yellow ? 1 : 0).setOrigin(0.5);
    c.add([pressAura, halo, disc, label, card, fatigueMark]);
    c.setData('playerId', p.id);
    c.setData('disc', disc);
    c.setData('halodot', halo);
    c.setData('pressAura', pressAura);
    c.setData('fatigueMark', fatigueMark);
    c.setData('label', label);
    c.setData('card', card);
    return c;
  }

  private drawPlayers(instant = false) {
    if (!this.dotLayer || !this.homeDots || !this.awayDots) return;
    const ballPoint = toStadiumPoint(this.runtime.owner, { x: this.runtime.x, y: this.runtime.y });
    const colors = pitchTeamColors(this.homeDots, this.awayDots);
    const wanted = new Set<string>();
    const drawTeam = (team: TeamDots) => {
      const formation = pitchFormationSlots(team.formation, team.width, team.defLine);
      const swatch = colors[team.side];
      const primary = Phaser.Display.Color.HexStringToColor(swatch.fill).color;
      const secondary = Phaser.Display.Color.HexStringToColor(swatch.outline).color;
      team.players.slice(0, 11).forEach((p, i) => {
        if (p.sentOff || p.injured) return;
        wanted.add(p.id);
        let sprite = this.spriteById.get(p.id);
        const isNew = !sprite;
        if (!sprite) { sprite = this.makePlayerSprite(p, primary, secondary, swatch.number); this.spriteById.set(p.id, sprite); this.dotLayer.add(sprite); }
        const slot = formation[i] ?? { x: 50, y: 50 };
        const base = toStadiumPoint(team.side, slot);
        const onBall = team.side === this.runtime.owner && p.id === this.runtime.ownerId;
        const actionActor = this.runtime.activeIds.includes(p.id) || this.cueActors.includes(p.id);
        const position = pitchPlayerTarget(p.group, team.side, this.runtime.owner === team.side, base, ballPoint, onBall, actionActor && team.side === this.runtime.owner);
        const target = this.groundPoint(position.x, position.y);
        const oldTarget = sprite.getData('target') as Point | undefined;
        if (isNew || instant || this.reduceMotion) {
          this.tweens.killTweensOf(sprite);
          sprite.setPosition(target.x, target.y);
          sprite.setData('target', target);
        } else if (!oldTarget || Math.abs(oldTarget.x - target.x) > 0.05 || Math.abs(oldTarget.y - target.y) > 0.05) {
          // Retarget only when the engine's desired position changes. Re-renders
          // and heatmap updates must not keep restarting an identical tween.
          this.tweens.killTweensOf(sprite);
          sprite.setData('target', target);
          this.tweens.add({ targets: sprite, x: target.x, y: target.y, duration: pitchTransitionMs(this.stepMs), ease: 'Sine.out' });
        }
        const label = sprite.getData('label') as Phaser.GameObjects.Text;
        const card = sprite.getData('card') as Phaser.GameObjects.Rectangle;
        const paletteKey = `${swatch.fill}:${swatch.outline}:${swatch.number}`;
        if (sprite.getData('paletteKey') !== paletteKey) {
          const disc = sprite.getData('disc') as Phaser.GameObjects.Arc;
          disc.setFillStyle(primary, 0.98).setStrokeStyle(1.35, secondary, 0.96);
          label.setColor(swatch.number).setStroke(swatch.number === '#182c24' ? '#fff5df' : '#14231b', 1.8);
          sprite.setData('paletteKey', paletteKey);
        }
        if (label) label.setText(p.kitNumber ? String(p.kitNumber) : p.name.split(' ').slice(-1)[0]?.slice(0, 1) ?? '•');
        if (card) card.setFillStyle(p.red ? 0xf04438 : 0xf7cd4b, p.red || p.yellow ? 1 : 0);
        const fatigueMark = sprite.getData('fatigueMark') as Phaser.GameObjects.Arc;
        fatigueMark?.setAlpha(p.fitness < 50 ? 0.95 : 0).setFillStyle(p.fitness < 50 ? 0x54c5e5 : 0x85d9ed);

        const pressAura = sprite.getData('pressAura') as Phaser.GameObjects.Arc;
        const pressActive = !!team.pressing && this.runtime.owner !== team.side && ['ST', 'WG', 'AM'].includes(p.group);
        const pressMode = pressActive ? (this.reduceMotion ? 'static' : 'animated') : 'off';
        if (pressAura && sprite.getData('pressMode') !== pressMode) {
          this.tweens.killTweensOf(pressAura);
          pressAura.setVisible(pressActive).setScale(1).setAlpha(1);
          if (pressMode === 'animated') this.tweens.add({ targets: pressAura, scale: 1.18, alpha: 0.45, duration: 850, yoyo: true, repeat: -1 });
          sprite.setData('pressMode', pressMode);
        }
        const halo = sprite.getData('halodot') as Phaser.GameObjects.Arc;
        if (halo) {
          const focus = onBall ? 'owner' : actionActor ? 'actor' : 'off';
          const focusMode = `${focus}:${this.reduceMotion ? 'static' : 'animated'}`;
          if (sprite.getData('focusMode') !== focusMode) {
            this.tweens.killTweensOf(halo);
            halo.setScale(1).setAlpha(1);
            halo.setStrokeStyle(1.8, onBall ? 0xffe98a : 0xbde8ff, onBall ? 0.95 : actionActor ? 0.78 : 0);
            halo.setFillStyle(onBall ? 0xf7c94b : 0x70c8ef, onBall ? 0.12 : actionActor ? 0.09 : 0);
            if (focus !== 'off' && !this.reduceMotion) this.tweens.add({ targets: halo, scale: onBall ? 1.3 : 1.18, alpha: 0.72, duration: 700, yoyo: true, repeat: -1 });
            sprite.setData('focusMode', focusMode);
          }
        }
      });
    };
    drawTeam(this.homeDots); drawTeam(this.awayDots);
    for (const [id, sprite] of this.spriteById) if (!wanted.has(id)) {
      this.tweens.killTweensOf([sprite, sprite.getData('halodot'), sprite.getData('pressAura')]);
      sprite.destroy(); this.spriteById.delete(id);
    }
  }

  private groundPoint(x: number, y: number): Point {
    const { w, h, m } = this.dims();
    return { x: m + (x / 100) * (w - m * 2), y: m + (y / 100) * (h - m * 2) };
  }
  private setBall(x: number, y: number, z = 0) {
    this.ballGround = { x, y };
    const lift = Phaser.Math.Clamp(z, 0, 36);
    this.shadow.setPosition(x, y).setScale(0.8 + lift / 45, 0.8 + lift / 80).setAlpha(Math.max(0.10, 0.38 - lift / 105));
    this.ball.setPosition(x, y - lift).setScale(1 + lift / 100);
  }
  private moveBallToRuntime(duration = pitchTransitionMs(this.stepMs)) {
    if (!this.ball || !this.shadow) return;
    const point = toStadiumPoint(this.runtime.owner, { x: this.runtime.x, y: this.runtime.y });
    const dest = this.groundPoint(point.x, point.y);
    const targetKey = `${dest.x}:${dest.y}:${this.runtime.z}`;
    if (targetKey === this.ballTargetKey && duration > 0) return;
    this.activeBallTween?.stop();
    this.activeBallTween = null;
    this.ballTargetKey = targetKey;
    if (duration <= 0 || this.reduceMotion) { this.setBall(dest.x, dest.y); return; }
    // A dedicated proxy survives setBall() updates; the ball cannot stall after
    // the first frame when a target object is replaced. Height lands at the end.
    const proxy = { x: this.ballGround.x, y: this.ballGround.y, t: 0 };
    const height = Phaser.Math.Clamp(this.runtime.z, 0, 30);
    const tween = this.tweens.add({ targets: proxy, x: dest.x, y: dest.y, t: 1, duration, ease: 'Sine.inOut',
      onUpdate: () => this.setBall(proxy.x, proxy.y, height * Math.sin(Math.PI * proxy.t)),
      onComplete: () => { this.setBall(dest.x, dest.y); if (this.activeBallTween === tween) this.activeBallTween = null; },
    });
    this.activeBallTween = tween;
  }

  private drawFreeKickWall(ball: Point, side: 'home' | 'away', reduceMotion = false) {
    const dy = side === 'home' ? -1 : 1;
    const wallY = Phaser.Math.Clamp(ball.y + dy * 20, 12, this.scale.height - 12);
    const wall = this.trackCue(this.add.graphics().setDepth(5));
    wall.lineStyle(1.4, 0xf3ead6, 0.85).lineBetween(ball.x - 15, wallY, ball.x + 15, wallY);
    for (let i = 0; i < 4; i++) {
      const x = ball.x + (i - 1.5) * 7;
      wall.fillStyle(i % 2 ? 0xd5e0d1 : 0xb3c5b5, 0.95).fillCircle(x, wallY - 3, 2.6);
      wall.fillStyle(0x1d2a22, 0.8).fillCircle(x, wallY - 3, 1.1);
    }
    if (!reduceMotion) this.tweens.add({ targets: wall, alpha: 0, delay: 1200, duration: 450, onComplete: () => wall.destroy() });
    else this.time.delayedCall(1500, () => wall.destroy());
  }

  private processEvent(ev: PitchEvent) {
    const reduced = this.reduceMotion || !!ev.reduceMotion;
    const pts: Point[] = (ev.path ?? []).flatMap((zone) => {
      const point = ZONE_XY[zone];
      if (!point) return [];
      const stadium = toStadiumPoint(ev.side ?? 'home', point);
      return [this.groundPoint(stadium.x, stadium.y)];
    });
    if (ev.kind === 'goal') {
      const { w, h, m } = this.dims();
      pts.push({ x: w / 2, y: ev.side === 'home' ? m + 2 : h - m - 2 });
    }
    if (ev.actionType === 'line_clearance' && pts.length) {
      const { h, m } = this.dims();
      pts.push({ x: pts[pts.length - 1].x, y: ev.side === 'home' ? m + 2 : h - m - 2 });
    }
    if (ev.actors?.length) { this.cueActors = ev.actors; this.drawPlayers(); }
    const slowMotionCue = ev.kind === 'goal' || ev.kind === 'save' || ev.actionType === 'shot' || ev.actionType === 'volley' || ev.actionType === 'woodwork';
    if (slowMotionCue && !reduced) {
      const cam = this.cameras.main;
      this.tweens.killTweensOf(cam); cam.setZoom(1);
      this.tweens.add({ targets: cam, zoom: 1.05, duration: Phaser.Math.Clamp(this.stepMs * 0.55, 90, 280), yoyo: true, ease: 'Sine.inOut' });
    }
    if (!reduced && (ev.actionType === 'woodwork' || ev.actionType === 'brawl' || ev.brawl)) this.cameras.main.shake(140, ev.actionType === 'brawl' || ev.brawl ? 0.002 : 0.003);
    if (ev.kind === 'var') {
      const { w, h } = this.dims();
      const label = this.trackCue(this.add.text(w / 2, h / 2, 'VAR · İNCELEME', { fontFamily: 'system-ui, sans-serif', fontSize: '12px', fontStyle: '900', color: '#fff5dc', backgroundColor: '#5b2430', padding: { x: 10, y: 7 } }).setOrigin(0.5).setDepth(8));
      if (!reduced) this.tweens.add({ targets: label, alpha: 0, scale: 1.04, delay: 650, duration: 450, onComplete: () => label.destroy() });
      else this.time.delayedCall(1100, () => label.destroy());
    }
    if (ev.actionType === 'free_kick' && pts.length) this.drawFreeKickWall(pts[pts.length - 1], ev.side ?? 'home', reduced);
    // A text-only commentary event must not interrupt a ball already in flight.
    if (!pts.length) return;
    const last = pts[pts.length - 1];
    if (ev.kind === 'goal' || ev.kind === 'save' || ev.kind === 'card' || ev.actionType === 'line_clearance' || ev.actionType === 'woodwork') {
      const col = ev.actionType === 'line_clearance' ? 0xe7e0c4 : ev.actionType === 'woodwork' ? 0xd8c2a1 : ev.kind === 'goal' ? 0xf6c653 : ev.kind === 'save' ? 0x71c7f5 : 0xf7ce43;
      const ring = this.trackCue(this.add.circle(last.x, last.y, 7, col, 0).setStrokeStyle(2.5, col, 0.95).setDepth(5));
      if (reduced) this.time.delayedCall(450, () => ring.destroy());
      else this.tweens.add({ targets: ring, scale: ev.kind === 'goal' ? 3.1 : 2.5, alpha: 0, duration: Phaser.Math.Clamp(this.stepMs * 1.5, 300, 800), ease: 'Cubic.out', onComplete: () => ring.destroy() });
      if (ev.brawl && !reduced) {
        for (let i = 0; i < 4; i++) {
          const marker = this.trackCue(this.add.circle(last.x + (i - 1.5) * 7, last.y + (i % 2 ? 5 : -5), 2.4, i % 2 ? 0xe95f52 : 0xf0d58b, 0.9).setDepth(6));
          this.tweens.add({ targets: marker, x: last.x + (i - 1.5) * 10, y: last.y + (i % 2 ? 13 : -13), alpha: 0, duration: 450, onComplete: () => marker.destroy() });
        }
      }
      if (ev.actionType === 'line_clearance' && !reduced) {
        for (let i = 0; i < 8; i++) {
          const angle = (Math.PI * 2 * i) / 8, distance = 9 + (i % 3) * 3;
          const dust = this.trackCue(this.add.circle(last.x, last.y, 1.4 + (i % 2) * 0.45, 0xe7e0c4, 0.9).setDepth(6));
          this.tweens.add({ targets: dust, x: last.x + Math.cos(angle) * distance, y: last.y + Math.sin(angle) * distance, alpha: 0, scale: 0.35, duration: 350 + (i % 3) * 45, ease: 'Cubic.out', onComplete: () => dust.destroy() });
        }
      }
    }
    const trailColor = ev.actionType === 'line_clearance' ? 0xe7e0c4 : ev.kind === 'goal' ? 0xffdc78 : ev.kind === 'save' ? 0x80d2ff : 0xf4f3e8;
    const trailVersion = ++this.trailVersion;
    this.tweens.killTweensOf(this.trail);
    this.trail.clear().setAlpha(1).lineStyle(ev.kind === 'goal' ? 3 : 2.1, trailColor, 0.78);
    this.trail.beginPath().moveTo(pts[0].x, pts[0].y);
    pts.slice(1).forEach((p) => this.trail.lineTo(p.x, p.y));
    this.trail.strokePath();
    const clearTrail = () => { if (trailVersion === this.trailVersion) this.trail.clear().setAlpha(1); };
    if (reduced) this.time.delayedCall(350, clearTrail);
    else this.tweens.add({ targets: this.trail, alpha: 0, delay: 250, duration: 400, onComplete: clearTrail });

    this.cancelBallAnimation();
    if (reduced) { this.moveBallToRuntime(0); return; }
    this.cinematic = true;
    // Share a bounded animation budget across all segments. At 4× a long path
    // cannot hold the ball behind many later engine steps.
    const budget = Phaser.Math.Clamp(this.stepMs * (slowMotionCue ? 1.3 : 0.9), 140, 850);
    const segmentMs = Phaser.Math.Clamp(budget / pts.length, 45, 300);
    const moveSegment = (index: number) => {
      if (index >= pts.length) {
        this.cinematic = false;
        this.activeBallTween = null;
        this.ballTargetKey = '';
        this.moveBallToRuntime(); // pick up the latest runtime received during the event
        return;
      }
      const from = index === 0 ? this.ballGround : pts[index - 1];
      const to = pts[index];
      const mid = { x: (from.x + to.x) / 2 + (to.y - from.y) * 0.08, y: (from.y + to.y) / 2 - (to.x - from.x) * 0.08 };
      const curve = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(from.x, from.y), new Phaser.Math.Vector2(mid.x, mid.y), new Phaser.Math.Vector2(to.x, to.y));
      const proxy = { t: 0 };
      this.activeBallTween = this.tweens.add({ targets: proxy, t: 1, duration: segmentMs, ease: 'Sine.inOut', onUpdate: () => {
        const p = curve.getPoint(proxy.t);
        const arc = (ev.highBall ? 25 : ev.kind === 'goal' ? 17 : 7) * Math.sin(Math.PI * proxy.t);
        this.setBall(p.x, p.y, arc);
      }, onComplete: () => { this.setBall(to.x, to.y); moveSegment(index + 1); } });
    };
    moveSegment(0);
  }

}

const EMPTY_HEAT: HeatPoint[] = [];
const eventKey = (event: PitchEvent | null) => event
  ? `${event.sequence ?? ''}:${event.minute ?? ''}:${event.kind}:${event.actionType ?? ''}:${event.side}:${event.path?.join(',')}:${event.actors?.join(',')}`
  : '';

export const PhaserPitch: React.FC<{
  event: PitchEvent | null; homeDots?: TeamDots; awayDots?: TeamDots; runtime?: PitchRuntime;
  heatPoints?: HeatPoint[]; heatEnabled?: boolean; heatTeam?: 'all' | 'home' | 'away';
  momentum?: number; className?: string; paused?: boolean; completed?: boolean; reduceMotion?: boolean; stepMs?: number;
}> = ({ event, homeDots, awayDots, runtime, heatPoints = EMPTY_HEAT, heatEnabled = false, heatTeam = 'all', className, paused = false, completed = false, reduceMotion = false, stepMs = 260 }) => {
  const ref = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const readyRef = useRef(false);
  const lastEventKey = useRef('');
  const latestEvent = useRef(event);
  const latestState = useRef<PitchPresentationState>({ home: homeDots, away: awayDots, runtime, heatPoints, heatEnabled, heatTeam, paused, completed, reduceMotion, stepMs });
  latestEvent.current = event;
  latestState.current = { home: homeDots, away: awayDots, runtime, heatPoints, heatEnabled, heatTeam, paused, completed, reduceMotion, stepMs };
  useEffect(() => {
    if (!ref.current || gameRef.current) return;
    let alive = true;
    const parent = ref.current;
    const syncSize = (game: Phaser.Game) => {
      if (!alive || !readyRef.current) return;
      const { width, height } = parent.getBoundingClientRect();
      const w = Math.round(width), h = Math.round(height);
      if (w > 0 && h > 0 && (game.scale.width !== w || game.scale.height !== h)) game.scale.setParentSize(w, h);
    };
    const scene = new PitchScene((created) => {
      if (!alive) return;
      readyRef.current = true;
      syncSize(created.game);
      created.game.canvas?.setAttribute('role', 'img');
      created.game.canvas?.setAttribute('aria-label', 'Canlı futbol sahası; numaralı oyuncuların ve topun hareketi gösterilir.');
      // Phaser boots asynchronously. Apply the latest snapshot even if the match
      // is paused or its tabs were switched before the scene finished creating.
      created.game.events.emit('pitchstate', latestState.current, true);
      // A newly opened pitch reflects the current state, not an old goal replay.
      lastEventKey.current = eventKey(latestEvent.current);
    });
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      width: 320, height: 440, parent: ref.current, transparent: true,
      scene: [scene], fps: { target: 60, smoothStep: true },
      scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH, width: 320, height: 440 },
      render: { antialias: true, roundPixels: false },
    });
    gameRef.current = game;
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => syncSize(game));
    observer?.observe(parent);
    return () => { alive = false; observer?.disconnect(); readyRef.current = false; game.destroy(true); gameRef.current = null; };
  }, []);
  useEffect(() => {
    if (readyRef.current) gameRef.current?.events.emit('pitchstate', latestState.current, false);
  }, [homeDots, awayDots, runtime, heatPoints, heatEnabled, heatTeam, paused, completed, reduceMotion, stepMs]);
  useEffect(() => {
    if (!event) return;
    const key = eventKey(event);
    if (key === lastEventKey.current) return;
    lastEventKey.current = key;
    if (readyRef.current && !latestState.current.completed) gameRef.current?.events.emit('posevent', event);
  }, [event]);
  return <div ref={ref} className={className} data-testid="live-phaser" data-paused={paused} data-reduced-motion={reduceMotion}
    style={{ width: '100%', height: '100%', minHeight: 0, overflow: 'hidden', borderRadius: 16 }} />;
};
