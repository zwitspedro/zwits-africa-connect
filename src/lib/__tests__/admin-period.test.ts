import {describe,it,expect} from 'vitest';
import {adminRange} from '../admin-period';
const now=new Date('2026-10-16T08:41:00Z');
describe('Harare admin reporting boundaries',()=>{
 it('today begins at Harare midnight',()=>expect(adminRange('today',now)).toEqual({from:'2026-10-15T22:00:00.000Z',to:'2026-10-16T22:00:00.000Z'}));
 it('last 7 days includes today and six preceding dates',()=>expect(adminRange('7days',now).from).toBe('2026-10-09T22:00:00.000Z'));
 it('last 30 days includes today and 29 preceding dates',()=>expect(adminRange('30days',now).from).toBe('2026-09-16T22:00:00.000Z'));
 it('previous month uses exclusive October boundary',()=>expect(adminRange('previous',now)).toEqual({from:'2026-08-31T22:00:00.000Z',to:'2026-09-30T22:00:00.000Z'}));
 it('custom includes the whole selected end date',()=>expect(adminRange('custom',now,'2026-10-01','2026-10-02').to).toBe('2026-10-02T22:00:00.000Z'));
 it('invalid custom dates never fetch false totals',()=>expect(()=>adminRange('custom',now,'','')).toThrow());
});
