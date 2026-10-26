// HM26 §12 — Phaser 2D canlı saha: TV yayın estetiği, zonal shifting ve top fiziği.
// Lazy-loaded; saha çizimi ve hareketler cihaz üzerinde üretilir (offline-first).
import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { ZoneId, ZONE_XY } from '../../engine/zones';
import { calculateGoalkeeperPosition, calculateRolePosition, toStadiumPoint } from '../../engine/pitch-ai';
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

class PitchScene extends Phaser.Scene {
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
  private pulseTween: Phaser.Tweens.Tween | null = null;
  private activeBallTween: Phaser.Tweens.Tween | null = null;
  private ballGround: Point = { x: 0, y: 0 };
  private resized = false;
  private cinematicUntil = 0;

  constructor() { super('pitch'); }

  create() {
    this.field = this.add.graphics().setDepth(0);
    this.heatOverlay = this.add.graphics().setDepth(0.6);
    this.trail = this.add.graphics().setDepth(1);
    this.dotLayer = this.add.container(0, 0).setDepth(2);
    this.shadow = this.add.ellipse(0, 0, 8, 4, 0x07130a, 0.36).setDepth(2.5);
    this.ball = this.add.circle(0, 0, 4.1, 0xfffaf0, 1).setDepth(4).setStrokeStyle(1.2, 0x17221a, 0.9);
    this.drawField();
    this.game.events.on('posevent', (ev: PitchEvent) => this.processEvent(ev));
    this.game.events.on('teamdots', (data: { home: TeamDots; away: TeamDots }) => { this.homeDots = data.home; this.awayDots = data.away; this.drawPlayers(); });
    this.game.events.on('runtime', (state: PitchRuntime) => { this.runtime = state; this.drawPlayers(); if (Date.now() >= this.cinematicUntil) this.moveBallToRuntime(); });
    this.game.events.on('heatmap', (data: { points: HeatPoint[]; enabled: boolean; team: 'all' | 'home' | 'away' }) => { this.heatPoints = data.points; this.heatEnabled = data.enabled; this.heatTeam = data.team; this.drawHeatmap(); });
    this.scale.on(Phaser.Scale.Events.RESIZE, () => { this.drawField(); this.drawHeatmap(); this.drawPlayers(); this.moveBallToRuntime(0); });
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
    this.resized = true;
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

  private formationSlots(f: string, width: number, defLine: 'deep' | 'normal' | 'high'): Point[] {
    const widthFactor = 0.55 + (width / 100) * 0.85;
    const lineY = defLine === 'deep' ? 82 : defLine === 'high' ? 62 : 74;
    const span = (n: number, y: number, lo = 22, hi = 78) => Array.from({ length: n }, (_, i) => ({ x: 50 + ((i + 0.5) / n - 0.5) * (hi - lo) * widthFactor, y }));
    const slots: Point[] = [{ x: 50, y: 92 }];
    if (f === '4-3-3') slots.push(...span(4, lineY - 3), ...span(3, lineY - 22), ...span(3, lineY - 52));
    else if (f === '4-2-3-1') slots.push(...span(4, lineY - 3), ...span(2, lineY - 16, 36, 64), ...span(3, lineY - 32), { x: 50, y: lineY - 56 });
    else if (f === '5-3-2') slots.push(...span(5, lineY - 4, 16, 84), ...span(3, lineY - 26), ...span(2, lineY - 52, 34, 66));
    else if (f === '3-5-2') slots.push(...span(3, lineY - 6, 26, 74), ...span(5, lineY - 28, 12, 88), ...span(2, lineY - 52, 34, 66));
    else if (f === '4-4-2') slots.push(...span(4, lineY - 3), ...span(4, lineY - 24), ...span(2, lineY - 52, 34, 66));
    else slots.push(...span(4, lineY - 3), ...span(4, lineY - 24), ...span(2, lineY - 52, 34, 66));
    return slots;
  }

  private makePlayerSprite(p: PitchPlayer, color: number, outline: number) {
    const c = this.add.container(0, 0);
    const pressAura = this.add.circle(0, 0, 14, 0xf08b39, 0).setStrokeStyle(1.2, 0xffb45e, 0);
    const halo = this.add.circle(0, 0, 10, 0xf4ce58, 0).setStrokeStyle(1.7, 0xffe98a, 0);
    const disc = this.add.circle(0, 0, 7.2, color, 0.98).setStrokeStyle(1.15, outline, 0);
    const fatigueMark = this.add.circle(5.7, -5.6, 2, 0x85d9ed, 0).setStrokeStyle(0.7, 0xe2fbff, 0);
    const label = this.add.text(0, 0.1, String(p.kitNumber ?? ''), { fontFamily: 'system-ui, sans-serif', fontSize: '8px', fontStyle: '700', color: '#fffdf2', stroke: '#14231b', strokeThickness: 2 }).setOrigin(0.5);
    const card = this.add.rectangle(5.8, -5.3, 4, 5.5, p.red ? 0xf04438 : p.yellow ? 0xf7cd4b : 0x000000, p.red || p.yellow ? 1 : 0).setOrigin(0.5);
    c.add([pressAura, halo, disc, label, card, fatigueMark]);
    c.setData('playerId', p.id);
    c.setData('halodot', halo);
    c.setData('pressAura', pressAura);
    c.setData('fatigueMark', fatigueMark);
    c.setData('label', label);
    c.setData('card', card);
    return c;
  }

  private drawPlayers() {
    if (!this.dotLayer || !this.homeDots || !this.awayDots) return;
    const { w, h, m } = this.dims();
    const ballPoint = toStadiumPoint(this.runtime.owner, { x: this.runtime.x, y: this.runtime.y });
    const wanted = new Set<string>();
    const drawTeam = (team: TeamDots) => {
      const formation = this.formationSlots(team.formation, team.width, team.defLine);
      const primary = Phaser.Display.Color.HexStringToColor(team.color1).color;
      const secondary = Phaser.Display.Color.HexStringToColor(team.color2).color;
      team.players.slice(0, 11).forEach((p, i) => {
        if (p.sentOff || p.injured) return;
        wanted.add(p.id);
        let sprite = this.spriteById.get(p.id);
        if (!sprite) { sprite = this.makePlayerSprite(p, primary, secondary); this.spriteById.set(p.id, sprite); this.dotLayer.add(sprite); }
        const slot = formation[i] ?? { x: 50, y: 50 };
        const base = { x: slot.x, y: team.side === 'away' ? 100 - slot.y : slot.y };
        const position = calculateRolePosition(p.group, team.side, this.runtime.owner === team.side, base, ballPoint);
        const tx = m + (position.x / 100) * (w - m * 2), ty = m + (position.y / 100) * (h - m * 2);
        this.tweens.killTweensOf(sprite);
        this.tweens.add({ targets: sprite, x: tx, y: ty, duration: 240, ease: 'Sine.out' });
        const label = sprite.getData('label') as Phaser.GameObjects.Text;
        const card = sprite.getData('card') as Phaser.GameObjects.Rectangle;
        if (label) label.setText(p.kitNumber ? String(p.kitNumber) : p.name.split(' ').slice(-1)[0]?.slice(0, 1) ?? '•');
        if (card) { card.setFillStyle(p.red ? 0xf04438 : 0xf7cd4b, p.red || p.yellow ? 1 : 0); }
        const fatigueMark = sprite.getData('fatigueMark') as Phaser.GameObjects.Arc;
        fatigueMark?.setAlpha(p.fitness < 50 ? 0.95 : 0).setFillStyle(p.fitness < 50 ? 0x54c5e5 : 0x85d9ed);
        const pressAura = sprite.getData('pressAura') as Phaser.GameObjects.Arc;
        const pressActive = !!team.pressing && this.runtime.owner !== team.side && ['ST', 'WG', 'AM'].includes(p.group);
        if (pressAura) {
          pressAura.setVisible(pressActive);
          if (pressActive && !sprite.getData('pressing')) {
            this.tweens.add({ targets: pressAura, scale: 1.22, alpha: 0.22, duration: 680, yoyo: true, repeat: -1 });
          } else if (!pressActive && sprite.getData('pressing')) {
            this.tweens.killTweensOf(pressAura); pressAura.setScale(1).setAlpha(1);
          }
          sprite.setData('pressing', pressActive);
        }
        const halo = sprite.getData('halodot') as Phaser.GameObjects.Arc;
        if (halo) {
          const onBall = p.id === this.runtime.ownerId;
          const actionActor = this.runtime.activeIds.includes(p.id);
          const focused = onBall || actionActor;
          halo.setStrokeStyle(1.8, onBall ? 0xffe98a : actionActor ? 0xbde8ff : 0xffffff, onBall ? 0.95 : actionActor ? 0.78 : 0);
          halo.setFillStyle(onBall ? 0xf7c94b : 0x70c8ef, onBall ? 0.12 : actionActor ? 0.09 : 0);
          if (focused && !sprite.getData('focused')) {
            const tw = this.tweens.add({ targets: halo, scale: onBall ? 1.4 : 1.22, alpha: 0.9, duration: 520, yoyo: true, repeat: -1 });
            sprite.setData('haloTween', tw);
          } else if (!focused && sprite.getData('focused')) {
            (sprite.getData('haloTween') as Phaser.Tweens.Tween | undefined)?.stop();
            halo.setScale(1).setAlpha(1);
          }
          sprite.setData('focused', focused);
        }
      });
    };
    drawTeam(this.homeDots); drawTeam(this.awayDots);
    for (const [id, sprite] of this.spriteById) if (!wanted.has(id)) { sprite.destroy(); this.spriteById.delete(id); }
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
  private moveBallToRuntime(duration = 260) {
    if (!this.ball || !this.shadow) return;
    const point = toStadiumPoint(this.runtime.owner, { x: this.runtime.x, y: this.runtime.y });
    const dest = this.groundPoint(point.x, point.y);
    this.activeBallTween?.stop();
    this.activeBallTween = this.tweens.add({ targets: this.ballGround, x: dest.x, y: dest.y, duration, ease: 'Sine.inOut', onUpdate: () => this.setBall(this.ballGround.x, this.ballGround.y, this.runtime.z) });
  }

  private drawFreeKickWall(ball: Point, side: 'home' | 'away', reduceMotion = false) {
    const dy = side === 'home' ? -1 : 1;
    const wallY = Phaser.Math.Clamp(ball.y + dy * 20, 12, this.scale.height - 12);
    const wall = this.add.graphics().setDepth(5);
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
    const pts: Point[] = (ev.path ?? []).map((z) => {
      const c = ZONE_XY[z];
      const p = ev.side === 'away' ? { x: 100 - c.x, y: 100 - c.y } : c;
      return this.groundPoint(p.x, p.y);
    });
    if (ev.kind === 'goal') pts.push({ x: this.scale.width / 2, y: ev.side === 'home' ? 12 : this.scale.height - 12 });
    if (ev.actionType === 'line_clearance' && pts.length) {
      const { h, m } = this.dims();
      pts.push({ x: pts[pts.length - 1].x, y: ev.side === 'home' ? m + 2 : h - m - 2 });
    }
    if (ev.actors?.length) { this.runtime.activeIds = ev.actors; this.drawPlayers(); }
    const slowMotionCue = ev.kind === 'goal' || ev.kind === 'save' || ev.actionType === 'shot' || ev.actionType === 'volley' || ev.actionType === 'woodwork';
    if (slowMotionCue && !ev.reduceMotion) this.cinematicUntil = Date.now() + 1800;
    if (slowMotionCue && !ev.reduceMotion) {
      const cam = this.cameras.main;
      this.tweens.killTweensOf(cam); cam.setZoom(1);
      this.tweens.add({ targets: cam, zoom: 1.12, duration: 340, yoyo: true, repeat: 1, ease: 'Sine.inOut' });
    }
    if (!ev.reduceMotion && (ev.actionType === 'woodwork' || ev.actionType === 'brawl' || ev.brawl)) this.cameras.main.shake(180, ev.actionType === 'brawl' || ev.brawl ? 0.004 : 0.006);
    if (ev.kind === 'var') {
      const { w, h } = this.dims();
      const label = this.add.text(w / 2, h / 2, 'VAR · İNCELEME', { fontFamily: 'system-ui, sans-serif', fontSize: '12px', fontStyle: '900', color: '#fff5dc', backgroundColor: '#5b2430', padding: { x: 10, y: 7 } }).setOrigin(0.5).setDepth(8);
      if (!ev.reduceMotion) this.tweens.add({ targets: label, alpha: 0, scale: 1.08, delay: 800, duration: 850, onComplete: () => label.destroy() });
      else this.time.delayedCall(1600, () => label.destroy());
    }
    if (ev.actionType === 'free_kick' && pts.length) this.drawFreeKickWall(pts[pts.length - 1], ev.side ?? 'home', !!ev.reduceMotion);
    if (!pts.length) { this.moveBallToRuntime(); return; }
    const last = pts[pts.length - 1];
    if (ev.kind === 'goal' || ev.kind === 'save' || ev.kind === 'card' || ev.actionType === 'line_clearance' || ev.actionType === 'woodwork') {
      const col = ev.actionType === 'line_clearance' ? 0xe7e0c4 : ev.actionType === 'woodwork' ? 0xd8c2a1 : ev.kind === 'goal' ? 0xf6c653 : ev.kind === 'save' ? 0x71c7f5 : 0xf7ce43;
      const ring = this.add.circle(last.x, last.y, 7, col, 0).setStrokeStyle(2.5, col, 0.95).setDepth(5);
      if (ev.reduceMotion) this.time.delayedCall(450, () => ring.destroy());
      else this.tweens.add({ targets: ring, scale: ev.kind === 'goal' ? 3.5 : 2.7, alpha: 0, duration: 850, ease: 'Cubic.out', onComplete: () => ring.destroy() });
      if (ev.brawl && !ev.reduceMotion) {
        for (let i = 0; i < 4; i++) {
          const marker = this.add.circle(last.x + (i - 1.5) * 7, last.y + (i % 2 ? 5 : -5), 2.4, i % 2 ? 0xe95f52 : 0xf0d58b, 0.9).setDepth(6);
          this.tweens.add({ targets: marker, x: last.x + (i - 1.5) * 10, y: last.y + (i % 2 ? 13 : -13), alpha: 0, duration: 600, onComplete: () => marker.destroy() });
        }
      }
      if (ev.actionType === 'line_clearance' && !ev.reduceMotion) {
        for (let i = 0; i < 8; i++) {
          const angle = (Math.PI * 2 * i) / 8, distance = 9 + (i % 3) * 3;
          const dust = this.add.circle(last.x, last.y, 1.4 + (i % 2) * 0.45, 0xe7e0c4, 0.9).setDepth(6);
          this.tweens.add({ targets: dust, x: last.x + Math.cos(angle) * distance, y: last.y + Math.sin(angle) * distance, alpha: 0, scale: 0.35, duration: 420 + (i % 3) * 45, ease: 'Cubic.out', onComplete: () => dust.destroy() });
        }
      }
    }
    const trailColor = ev.actionType === 'line_clearance' ? 0xe7e0c4 : ev.kind === 'goal' ? 0xffdc78 : ev.kind === 'save' ? 0x80d2ff : 0xf4f3e8;
    this.trail.clear(); this.trail.lineStyle(ev.kind === 'goal' ? 3 : 2.1, trailColor, 0.78);
    this.trail.beginPath().moveTo(pts[0].x, pts[0].y);
    pts.slice(1).forEach((p) => this.trail.lineTo(p.x, p.y));
    this.trail.strokePath();
    this.tweens.killTweensOf(this.trail);
    if (ev.reduceMotion) this.time.delayedCall(350, () => this.trail.clear());
    else this.tweens.add({ targets: this.trail, alpha: 0, delay: 500, duration: 550, onComplete: () => this.trail.clear() });
    this.activeBallTween?.stop();
    const moveSegment = (index: number) => {
      if (index >= pts.length) return;
      const from = index === 0 ? this.ballGround : pts[index - 1];
      const to = pts[index];
      const mid = { x: (from.x + to.x) / 2 + (to.y - from.y) * 0.08, y: (from.y + to.y) / 2 - (to.x - from.x) * 0.08 };
      const curve = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(from.x, from.y), new Phaser.Math.Vector2(mid.x, mid.y), new Phaser.Math.Vector2(to.x, to.y));
      const proxy = { t: 0 };
      const slowed = !ev.reduceMotion && slowMotionCue;
      this.activeBallTween = this.tweens.add({ targets: proxy, t: 1, duration: slowed ? (ev.kind === 'goal' ? 650 : 550) : 185, ease: 'Sine.inOut', onUpdate: () => {
        const p = curve.getPoint(proxy.t);
        const arc = (ev.highBall ? 25 : ev.kind === 'goal' ? 17 : 7) * Math.sin(Math.PI * proxy.t);
        this.setBall(p.x, p.y, arc);
      }, onComplete: () => { this.setBall(to.x, to.y, 0); moveSegment(index + 1); } });
    };
    moveSegment(0);
  }
}

export const PhaserPitch: React.FC<{ event: PitchEvent | null; homeDots?: TeamDots; awayDots?: TeamDots; runtime?: PitchRuntime; heatPoints?: HeatPoint[]; heatEnabled?: boolean; heatTeam?: 'all' | 'home' | 'away'; momentum?: number; className?: string }> = ({ event, homeDots, awayDots, runtime, heatPoints = [], heatEnabled = false, heatTeam = 'all', className }) => {
  const ref = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const lastEventKey = useRef<string>('');
  useEffect(() => {
    if (!ref.current || gameRef.current) return;
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      width: 320, height: 440, parent: ref.current, transparent: true,
      scene: [PitchScene], fps: { target: 60, smoothStep: true },
      scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH, width: 320, height: 440 },
      render: { antialias: true, roundPixels: true },
    });
    gameRef.current = game;
    game.canvas?.setAttribute('role', 'img');
    game.canvas?.setAttribute('aria-label', 'Canlı futbol sahası; numaralı oyuncuların ve topun hareketi gösterilir.');
    return () => { game.destroy(true); gameRef.current = null; };
  }, []);
  useEffect(() => {
    if (!gameRef.current || !homeDots || !awayDots) return;
    gameRef.current.events.emit('teamdots', { home: homeDots, away: awayDots });
  }, [homeDots, awayDots]);
  useEffect(() => {
    if (!gameRef.current || !runtime) return;
    gameRef.current.events.emit('runtime', runtime);
  }, [runtime?.x, runtime?.y, runtime?.z, runtime?.owner, runtime?.ownerId, runtime?.activeIds.join(',')]);
  useEffect(() => {
    if (!gameRef.current) return;
    gameRef.current.events.emit('heatmap', { points: heatPoints, enabled: heatEnabled, team: heatTeam });
  }, [heatPoints, heatEnabled, heatTeam]);
  useEffect(() => {
    if (!event || !gameRef.current) return;
    const key = `${event.minute ?? ''}:${event.kind}:${event.actionType ?? ''}:${event.side}:${event.path?.join(',')}:${event.actors?.join(',')}`;
    if (key === lastEventKey.current) return;
    lastEventKey.current = key;
    gameRef.current.events.emit('posevent', event);
  }, [event]);
  return <div ref={ref} className={className} style={{ width: '100%', height: '100%', minHeight: 0, overflow: 'hidden', borderRadius: 16 }} />;
};
