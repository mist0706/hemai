// Area name → portal location mapping for Swedish cities

export interface AreaMapping {
  hemnetLocationId?: string;
  bovisionArea?: string;
  avgPricePerSqm?: number;
}

export const AREA_MAPPINGS: Record<string, Record<string, AreaMapping>> = {
  göteborg: {
    hisingen: { hemnetLocationId: '9403', bovisionArea: 'Hisingen', avgPricePerSqm: 42000 },
    centrum: { hemnetLocationId: '9401', bovisionArea: 'Centrum', avgPricePerSqm: 55000 },
    majorna: { hemnetLocationId: '9405', bovisionArea: 'Majorna', avgPricePerSqm: 48000 },
    linné: { hemnetLocationId: '9406', bovisionArea: 'Linné', avgPricePerSqm: 50000 },
    haga: { hemnetLocationId: '9407', bovisionArea: 'Haga', avgPricePerSqm: 51000 },
    andersberg: { hemnetLocationId: '9410', bovisionArea: 'Andersberg', avgPricePerSqm: 32000 },
    mölndal: { hemnetLocationId: '9420', bovisionArea: 'Mölndal', avgPricePerSqm: 38000 },
    kållered: { hemnetLocationId: '9421', bovisionArea: 'Kållered', avgPricePerSqm: 34000 },
    askim: { hemnetLocationId: '9425', bovisionArea: 'Askim', avgPricePerSqm: 45000 },
    billdal: { hemnetLocationId: '9426', bovisionArea: 'Billdal', avgPricePerSqm: 40000 },
    särö: { hemnetLocationId: '9427', bovisionArea: 'Särö', avgPricePerSqm: 43000 },
    järntorget: { hemnetLocationId: '9408', bovisionArea: 'Järntorget', avgPricePerSqm: 52000 },
  },
  stockholm: {
    södermalm: { hemnetLocationId: '8801', bovisionArea: 'Södermalm', avgPricePerSqm: 75000 },
    kungsholmen: { hemnetLocationId: '8802', bovisionArea: 'Kungsholmen', avgPricePerSqm: 72000 },
    vasastan: { hemnetLocationId: '8803', bovisionArea: 'Vasastan', avgPricePerSqm: 80000 },
    östermalm: { hemnetLocationId: '8804', bovisionArea: 'Östermalm', avgPricePerSqm: 95000 },
    gamla_stan: { hemnetLocationId: '8805', bovisionArea: 'Gamla Stan', avgPricePerSqm: 88000 },
    hornstull: { hemnetLocationId: '8806', bovisionArea: 'Hornstull', avgPricePerSqm: 68000 },
    fridhemsplan: { hemnetLocationId: '8807', bovisionArea: 'Fridhemsplan', avgPricePerSqm: 70000 },
  },
  malmö: {
    centrum: { hemnetLocationId: '9601', bovisionArea: 'Centrum', avgPricePerSqm: 38000 },
    värnhem: { hemnetLocationId: '9602', bovisionArea: 'Värnhem', avgPricePerSqm: 35000 },
    möllevången: { hemnetLocationId: '9603', bovisionArea: 'Möllevången', avgPricePerSqm: 32000 },
    limhamn: { hemnetLocationId: '9604', bovisionArea: 'Limhamn', avgPricePerSqm: 40000 },
    hyllie: { hemnetLocationId: '9605', bovisionArea: 'Hyllie', avgPricePerSqm: 36000 },
    rosengård: { hemnetLocationId: '9606', bovisionArea: 'Rosengård', avgPricePerSqm: 25000 },
  },
};

export function resolveArea(city: string, area: string): AreaMapping | null {
  const cityKey = city.toLowerCase().replace(/å/g, 'a').replace(/ä/g, 'a').replace(/ö/g, 'o');
  const areaKey = area.toLowerCase().replace(/å/g, 'a').replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ /g, '_');
  return AREA_MAPPINGS[cityKey]?.[areaKey] || null;
}

export function getAvgPricePerSqm(city: string, area?: string): number | null {
  if (area) {
    const mapping = resolveArea(city, area);
    if (mapping?.avgPricePerSqm) return mapping.avgPricePerSqm;
  }
  // City averages
  const cityAverages: Record<string, number> = {
    göteborg: 44000,
    stockholm: 72000,
    malmö: 34000,
    uppsala: 38000,
    linköping: 30000,
    västerås: 28000,
  };
  const cityKey = city.toLowerCase().replace(/å/g, 'a').replace(/ä/g, 'a').replace(/ö/g, 'o');
  return cityAverages[cityKey] || null;
}