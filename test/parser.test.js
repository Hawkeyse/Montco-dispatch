const test = require('node:test');
const assert = require('node:assert/strict');
const { parseDispatch } = require('../src/dispatch/parser');

const S1 = '1061005 #F2515222 at 330 WALNUT ST NRSN,321: @SANDY HILL TERRACE, Note: ALL UNITS SWITCH TO FIRE OPS 6 AND ALL UNITS STAGE ON WALNUT PER CMND (MCECC) - 61 General';
const S2 = '0325005 231 BRIDGE ST XST: N PENN ST/N CHURCH ST MUN:CHCO NAT: BEHAVIORAL/PSYCH EMERGENCY [E2], ADC:3252B1,I#E2536922,TIME: 15:57:07, NOTES: SPRING CITY BORO 325F COV 3A83 APT 1 ACTIVE DOMESTIC PD ENROUTE 13/F TRUCKS: 325-65 - 325 EMS';

test('example 1: incident update', () => {
  const p = parseDispatch({ body: S1 });
  assert.equal(p.leadingCode, '1061005');
  assert.equal(p.incidentId, 'F2515222');
  assert.equal(p.address, '330 WALNUT ST NRSN,321');
  assert.equal(p.place, 'SANDY HILL TERRACE');
  assert.equal(p.notes, 'ALL UNITS SWITCH TO FIRE OPS 6 AND ALL UNITS STAGE ON WALNUT PER CMND (MCECC)');
  assert.equal(p.group, '61 General');
  assert.equal(p.raw, S1);
});

test('example 2: emergency dispatch', () => {
  const p = parseDispatch({ body: S2 });
  assert.equal(p.leadingCode, '0325005');
  assert.equal(p.incidentId, 'E2536922');
  assert.equal(p.address, '231 BRIDGE ST');
  assert.equal(p.crossStreets, 'N PENN ST/N CHURCH ST');
  assert.equal(p.municipality, 'CHCO');
  assert.equal(p.callType, 'BEHAVIORAL/PSYCH EMERGENCY [E2]');
  assert.equal(p.adc, '3252B1');
  assert.equal(p.time, '15:57:07');
  assert.equal(p.notes, 'SPRING CITY BORO 325F COV 3A83 APT 1 ACTIVE DOMESTIC PD ENROUTE 13/F');
  assert.equal(p.units, '325-65');
  assert.equal(p.group, '325 EMS');
});

test('falls back to subject when body is empty', () => {
  assert.equal(parseDispatch({ subject: S2, body: '' }).incidentId, 'E2536922');
});

test('never throws on empty, odd or partial input', () => {
  for (const input of [undefined, {}, { body: '' }, { body: '   ' }, { body: 'hello world' }, { body: ':::: - - #' }, { body: 'NOTES:' }]) {
    const p = parseDispatch(input);
    assert.equal(typeof p.raw, 'string');
  }
  assert.equal(parseDispatch({ body: 'hello world' }).incidentId, undefined);
});

test('no street address: head is just "code /"', () => {
  const p = parseDispatch({ body: '0015141 / XST: CHELTENHAM AVE/N 21ST ST MUN:CHEL NAT: RESCUE - WATER [F1], MAP/BOX:26-24, ADC:3370F9,I#F2620213,TIME: 20:05:33, NOTES: VEHICLE STUCK IN WATER TRUCKS: E2,L1,SD4,R20 - Station 20' });
  assert.equal(p.address, undefined);
  assert.equal(p.callType, 'RESCUE - WATER [F1]');
  assert.equal(p.mapBox, '26-24');
  assert.equal(p.incidentId, 'F2620213');
  assert.equal(p.units, 'E2,L1,SD4,R20');
  assert.equal(p.group, 'Station 20');
});

test('update email: "<code> #<incident> at <address>, Note: ..."', () => {
  const p = parseDispatch({ body: '0015141 #F2620213 at CHELTENHAM AVE/N 21ST ST CHEL, Note: HOLD THE RESPONSE TO UNITS ON SCENE PER CMMD (MCECC) - Station 20' });
  assert.equal(p.incidentId, 'F2620213');
  assert.equal(p.address, 'CHELTENHAM AVE/N 21ST ST CHEL');
  assert.equal(p.notes, 'HOLD THE RESPONSE TO UNITS ON SCENE PER CMMD (MCECC)');
  assert.equal(p.group, 'Station 20');
});

test('group containing a hyphen, PRE-PLAN label, hyphenated call type', () => {
  const p = parseDispatch({ body: '1081005 57 ELM DR XST: FORREST ST/N CHESTNUT ST MUN:LANS NAT: GAS-ODOR/LEAK INSIDE NON-COMMERCIAL BUILDING [F1], PRE-PLAN:53-10, ADC:3144F1,I#F2629862,TIME: 15:00:07, NOTES: DIESEL LEAKING INTO BASEMENT TRUCKS: E14,SD14 - Haz-mat Team' });
  assert.equal(p.group, 'Haz-mat Team');
  assert.equal(p.callType, 'GAS-ODOR/LEAK INSIDE NON-COMMERCIAL BUILDING [F1]');
  assert.equal(p.prePlan, '53-10');
  assert.equal(p.units, 'E14,SD14');
});

test('place and apartment in the head', () => {
  const p = parseDispatch({ body: '0380013 1113 EASTON RD: @GARDEN SPRING CENTER,APT:314 XST: ANDREA DR/KNOCK N KNOLL CIR MUN:UMOR NAT: DIABETIC EMERGENCY [E2], MAP/BOX:35-44, ADC:3259A5,I#E2674960,TIME: 00:21:52, NOTES: HYPOGLYCEMIA - LOW BLOOD SUGAR - CHANGE IN MENTAL STATUS TRUCKS: 381-3 - 381 EMS' });
  assert.equal(p.address, '1113 EASTON RD');
  assert.equal(p.place, 'GARDEN SPRING CENTER');
  assert.equal(p.apt, '314');
  assert.equal(p.notes, 'HYPOGLYCEMIA - LOW BLOOD SUGAR - CHANGE IN MENTAL STATUS');
  assert.equal(p.group, '381 EMS');
});

test('a second "Note:" inside the notes does not truncate them', () => {
  const p = parseDispatch({ body: '0015141 3388 PENNSYLVANIA TPKE WB XST: RAMP RT309 TO I276 WB MUN:UDUB NAT: VEHICLE ACCIDENT RESCUE [F1], MAP/BOX:41-42, ADC:3257K9,I#F2624667,TIME: 22:34:02, NOTES: TT OFF THE ROAD -- page to 351 -- Note: DISREGARD TONES AND PAGERS CH88 - SO FAR NOTHING SHOWING - Station 20' });
  assert.equal(p.notes, 'TT OFF THE ROAD -- page to 351 -- Note: DISREGARD TONES AND PAGERS CH88 - SO FAR NOTHING SHOWING');
  assert.equal(p.group, 'Station 20');
});

test('"#06" before the street is not an incident ID; empty XST "/" is dropped', () => {
  const p = parseDispatch({ body: '1041005 #06 3 INDUSTRIAL DR XST: / MUN:DECO NAT: FIRE SPECIAL SERVICE [F4],I#F2622335,TIME: 11:47:22, NOTES: DARBY TWP X ST - HOOK RD STA41 ASSIST TRUCKS: SS41-1 - 41 General' });
  assert.equal(p.incidentId, 'F2622335');
  assert.equal(p.address, '#06 3 INDUSTRIAL DR');
  assert.equal(p.crossStreets, undefined);
  assert.equal(p.callType, 'FIRE SPECIAL SERVICE [F4]');
  assert.equal(p.notes, 'DARBY TWP X ST - HOOK RD STA41 ASSIST');
});

test('free-text announcement: no address/notes guessed, group kept', () => {
  const p = parseDispatch({ body: '0015021 It is with deep sadness that a fire company announces the passing of a former chief. - County All Call' });
  assert.equal(p.leadingCode, '0015021');
  assert.equal(p.address, undefined);
  assert.equal(p.notes, undefined);
  assert.equal(p.incidentId, undefined);
  assert.equal(p.group, 'County All Call');
});