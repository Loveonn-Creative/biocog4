import { describe, expect, test } from 'bun:test';
import { sectorFromCin } from '../src/lib/nicSectors';

describe('sectorFromCin', () => {
  test('NIC 2008 divisions for recent companies', () => {
    expect(sectorFromCin('U13100MH2015PTC123456')?.sector).toBe('textiles');
    expect(sectorFromCin('U24100GJ2012PLC012345')?.sector).toBe('steel_metals');
    expect(sectorFromCin('U62099KA2019PTC123456')?.sector).toBe('it_services');
  });
  test('NIC 2004 divisions for older companies', () => {
    expect(sectorFromCin('L17110MH1990PLC054321')?.sector).toBe('textiles');
    expect(sectorFromCin('L27100MH1907PLC000260')?.sector).toBe('steel_metals');
    expect(sectorFromCin('U72200KA2001PTC012345')?.sector).toBe('it_services');
  });
  test('unknown division gives null', () => {
    expect(sectorFromCin('U00000MH2015PTC123456')).toBeNull();
  });
});
