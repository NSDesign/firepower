export interface TankSpec {
  id: number;
  key: string;
  name: string;
  /** px/sec */
  speed: number;
  /** display value 1-10 for the select screen */
  speedRating: number;
  /** rad/sec */
  turnRate: number;
  /** hit points ("DAMAGE" stat on the select screen) */
  maxDamage: number;
  shells: number;
  mg: number;
  /** seconds of full-throttle driving */
  fuel: number;
  lives: number;
  desc: string;
}

export const TANKS: TankSpec[] = [
  {
    id: 0,
    key: 'tank0',
    name: 'SCORPION',
    speed: 140,
    speedRating: 10,
    turnRate: 3.4,
    maxDamage: 50,
    shells: 15,
    mg: 150,
    fuel: 290,
    lives: 5,
    desc: 'FAST AND LIGHT. HIT AND RUN.'
  },
  {
    id: 1,
    key: 'tank1',
    name: 'PANTHER',
    speed: 112,
    speedRating: 7,
    turnRate: 2.9,
    maxDamage: 75,
    shells: 25,
    mg: 250,
    fuel: 350,
    lives: 5,
    desc: 'BALANCED BATTLE TANK.'
  },
  {
    id: 2,
    key: 'tank2',
    name: 'RHINO',
    speed: 88,
    speedRating: 4,
    turnRate: 2.4,
    maxDamage: 100,
    shells: 40,
    mg: 400,
    fuel: 420,
    lives: 5,
    desc: 'SLOW. ARMORED. UNSTOPPABLE.'
  }
];
