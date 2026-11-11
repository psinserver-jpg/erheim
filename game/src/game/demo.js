// 녹화용 자동 모드: 마을 → 자동사냥 → 레벨업 → 강화(성공·실패·증발) → 레이드. 시간표대로 연출한다.
import * as THREE from 'three';
import { POI } from '../world/world.js';

export function createDemo({ engine, world, game, ui, vfx, sound, chat }) {
  const { hud, win } = ui; const P = game.P, G = game.G;
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  let on = false, t = 0, idx = 0, wait = null;
  const steps = [];
  const at = (time, fn) => steps.push({ time, fn });
  const cap = (s) => hud.showDemoCaption(s);
  const goto = (p) => { P.moveTo = p.clone(); };
  const until = (pred, max) => { wait = { pred, left: max }; };          // 조건이 될 때까지 시간표를 멈춘다

  // ① 마을 (0~24초)
  at(0.0, () => { G.demo = true; P.pos.set(2, 0, 10); P.yaw = Math.PI; hud.cinema(true); hud.fade(1, 0); hud.fade(0, 1800); cap('① 마을 — 벨로스 성채');
    engine.cam.cine = null; engine.camera.position.set(-30, 34, 52); engine.cam.look.set(0, 2, 0); engine.cineTo(V(16, 16, 30), V(0, 2, -2), 7.5, { fov: 34 }); hud.zoneBanner('벨로스 성채', '에르하임 왕국의 관문'); });
  at(7.8, () => { engine.cineTo(V(9, 6.5, 19), V(1.5, 1.4, 8), 3.0, { fov: 30 }); });
  at(11.0, () => { engine.cineOff(1.6); hud.cinema(false); goto(V(4, 0, -8)); hud.chat.add({ channel: 'guild', name: '새벽출근', guild: '은사자', text: '카일님 오셨네요 ㅎㅇㅎㅇ 오늘 레이드 가시죠?' }); });
  at(14.5, () => { goto(POI.smithStand); });
  at(15.5, () => { hud.bubble(P.id, '사냥부터 하고 강화하러 오겠습니다.', 2600); });
  at(19.0, () => { goto(V(0, 0, -30)); });
  at(22.5, () => { goto(POI.gateOut); cap('② 사냥터로 — 속삭이는 숲'); });
  // ② 숲으로 이동 (달리기) → 자동사냥
  at(26.0, () => { goto(V(2, 0, -92)); P.speed = 9.5; });
  at(31.0, () => { goto(V(-2, 0, -112)); });
  at(33.5, () => { P.speed = 6.4; cap('③ 자동사냥 — AUTO'); game.setAuto(true); P.huntAnchor = V(-4, 0, -122); });
  at(35.0, () => { hud.chat.add({ channel: 'local', name: '사냥터지박령', guild: '철권단', text: '여기 자리 있어요~ 같이 잡으실?' }); });
  at(52.0, () => { cap('④ 레벨업'); P.exp = Math.max(P.exp, 0.93); });
  at(53.0, () => until(() => G.events.includes('levelup'), 30));
  at(58.0, () => { cap('③ 자동사냥 — 스킬 연계'); });
  at(74.0, () => { game.setAuto(false); cap('⑤ 장비 강화 — 대장장이 브롬'); game.castSkill('recall'); if (P.pos.distanceTo(POI.plaza) > 20) game.teleport(POI.plaza); });
  at(75.5, () => { goto(POI.smithStand); P.speed = 8; });
  at(76.0, () => until(() => P.pos.distanceTo(POI.smithStand) < 1.4, 12));
  at(77.0, () => { P.speed = 6.4; P.moveTo = null; P.yaw = Math.atan2(POI.smith.x - P.pos.x, POI.smith.z - P.pos.z); P.ch.root.rotation.y = P.yaw; engine.cineTo(V(POI.smith.x - 8.5, 4.6, POI.smith.z + 8.0), V(POI.smith.x - 1.4, 1.2, POI.smith.z + 1.0), 1.6, { fov: 30 });
    win.dialog.show({ name: '대장장이 브롬', portrait: 'ui/portrait_blacksmith.jpg', text: '오, 카일! 그 여명의 장검… 더 벼려 볼 텐가? 쇠는 정직하지만, 운은 그렇지 않다네.', options: [{ label: '강화한다', id: 'enh' }, { label: '다음에', id: 'no' }] }); });
  at(80.5, () => { win.dialog.hide(); game.enh.open(); });
  at(82.0, () => { game.enh.run('success'); });
  at(85.4, () => { game.enh.run('success'); });
  at(88.8, () => { game.enh.run('success'); cap('⑤ 장비 강화 — +7 성공!'); });
  at(93.0, () => { hud.bubble(P.id, '+8… 한 번만 더.', 2200); cap('⑤ 장비 강화 — 욕심'); });
  at(95.0, () => { game.enh.run('destroy'); });
  at(98.6, () => { cap('⑤ 장비 강화 — 증발…'); hud.bubble(P.id, '아…', 2500); });
  at(102.5, () => { win.close('enhance'); engine.cineOff(1.4); hud.chat.add({ channel: 'guild', name: '물약셔틀', guild: '은사자', text: '카일님 예비검 창고에 있어요.. 힘내세요 ㅠㅠ' }); });
  at(104.5, () => { P.plus = 7; P.weaponName = '여명의 장검'; game.refreshWindows(); hud.toast('문파 창고에서 [+7 여명의 장검]을 꺼냈습니다.', 'info'); try { window.__GAME__ && 0; } catch (e) { } game.G.events.push('reequip'); });
  // ⑥ 레이드
  at(106.5, () => { cap('⑥ 레이드 — 염옥의 군주 발카르'); game.teleport(V(POI.altar.x + 3, 0, POI.altar.z + 24)); game.startRaid(); engine.cineTo(V(POI.altar.x + 16, 12, POI.altar.z + 30), V(POI.altar.x, 7, POI.altar.z), 0.01, { fov: 36 }); hud.cinema(true); });
  at(106.6, () => { engine.cineTo(V(POI.altar.x - 10, 7, POI.altar.z + 22), V(POI.altar.x, 8, POI.altar.z), 4.2, { fov: 30 }); });
  at(111.2, () => { hud.cinema(false); engine.cineOff(1.0); engine.cam.zoomTarget = 28; game.setAuto(true); P.huntAnchor = POI.altar.clone(); });
  at(112.0, () => until(() => G.events.includes('raidDone'), 110));
  at(113.0, () => { game.setAuto(false); cap('레이드 성공 — 은사자 문파의 승리'); engine.cam.zoomTarget = 14; });
  at(121.0, () => { win.raidResult.hide(); hud.fade(1, 1600); });
  at(123.0, () => { cap(null); hud.setVisible(false); win.ending.show({ lines: ['에르하임: 사자의 맹세', `카일 Lv.${P.level} · 문파 [은사자]`, '자동사냥 · 강화 · 레이드 — 지금 바로 시작하세요'] }); hud.fade(0, 1200); on = false; });

  // 보스 체력: 시연 길이에 맞춰 조절(약 55~65초)
  const tuneBoss = () => { const B = G.boss; if (B && !B.tuned) { B.tuned = true; B.hpMax = B.hp = 150000; } };
  return {
    get running() { return on; },
    start(from = 0) { on = true; t = from; idx = 0; while (idx < steps.length && steps[idx].time < from) idx++; if (from > 0) { G.demo = true; } },
    update(dt) {
      if (!on) return; tuneBoss();
      if (wait) { wait.left -= dt; if (wait.pred() || wait.left <= 0) wait = null; else return; }
      t += dt;
      while (on && idx < steps.length && steps[idx].time <= t) { const s = steps[idx++]; try { s.fn(); } catch (e) { console.error('[demo]', s.time, e); } if (wait) break; }
    },
    jump(time) { t = time; idx = 0; while (idx < steps.length && steps[idx].time < time) idx++; wait = null; on = true; G.demo = true; },
  };
}
