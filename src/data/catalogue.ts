/**
 * Deterministic demonstration dataset for the "Meridian Process Industries"
 * demo tenant. All data is fictional and generated from a fixed seed so the
 * demo is reproducible across reloads.
 */
import type { StandardPart, Warehouse } from "@/types";

export const DEMO_TENANT = "Meridian Process Industries";
export const DEMO_TODAY = "2026-11-21T09:00:00.000Z";

export const WAREHOUSES: Warehouse[] = [
  { id: "WH-APP", code: "APP-01", name: "Apapa Central Stores", site: "Apapa Processing Plant", region: "Lagos" },
  { id: "WH-IKJ", code: "IKJ-02", name: "Ikeja Maintenance Depot", site: "Ikeja Packaging Line", region: "Lagos" },
  { id: "WH-OTA", code: "OTA-01", name: "Ota Fabrication Shop", site: "Ota Works", region: "Ogun" },
  { id: "WH-PHC", code: "PHC-01", name: "Onne Port Yard", site: "Port Harcourt Terminal", region: "Rivers" },
  { id: "WH-WRI", code: "WRI-03", name: "Warri Turnaround Cage", site: "Warri Utilities", region: "Delta" },
  { id: "WH-ABJ", code: "ABJ-01", name: "Abuja Regional Hub", site: "Abuja Distribution", region: "FCT" },
  { id: "WH-KAN", code: "KAN-02", name: "Kano Line Stores", site: "Kano Mill", region: "Kano" },
  { id: "WH-ACC", code: "ACC-01", name: "Tema Satellite Store", site: "Tema Bottling", region: "Greater Accra" },
];

export const warehouseById = (id: string) => WAREHOUSES.find((w) => w.id === id);

export interface PartTemplate extends StandardPart {
  mpns: [string, string][]; // [manufacturer, part number]
  variants: string[];
  equipment: string[];
  basePrice: number;
  suppliers: string[];
  qtyScale: number;
  uomVariants?: string[];
  longTail?: boolean;
}

const SUPPLIERS = {
  bearings: ["Bearing Hub Nigeria Ltd", "Transpower Engineering", "Allied Industrial Supply"],
  electrical: ["Elektro Distribution Co.", "Powerline Controls", "Allied Industrial Supply"],
  seals: ["Sealtech West Africa", "Allied Industrial Supply", "FlowServe Spares Ltd"],
  drives: ["Transpower Engineering", "Drivetrain Partners", "Allied Industrial Supply"],
  instruments: ["Process Instruments Ltd", "Flow & Measure Co.", "Allied Industrial Supply"],
  fasteners: ["Fastline Industrial", "Allied Industrial Supply", "Coastal Hardware"],
};

const EQUIP = {
  rotating: ["CV-201 Conveyor drive", "P-104 Process water pump", "FAN-12 ID fan", "MX-03 Mixer gearbox", "AG-07 Agitator", "P-221 Boiler feed pump"],
  hvac: ["CT-01 Cooling tower fan", "AHU-04 Air handler", "CMP-02 Air compressor", "CH-01 Chiller"],
  electrical: ["MCC-3 Motor control centre", "DB-12 Distribution board", "PLC-2 Filler control panel", "VSD-05 Drive panel"],
  hydraulic: ["HPU-01 Press hydraulic unit", "HPU-03 Baler hydraulics", "FL-02 Forklift fleet"],
  piping: ["HX-11 Heat exchanger", "BLR-01 Steam boiler", "TK-04 CIP tank", "PL-08 Steam header"],
  packaging: ["FIL-01 Filler", "CAP-02 Capper", "LAB-03 Labeller", "PAL-01 Palletiser"],
};

const pick = <T,>(xs: T[], i: number) => xs[i % xs.length];

const inches = (s: string) => {
  const [n, d] = s.split("/").map(Number);
  return d ? n / d : n;
};

function bearings(): PartTemplate[] {
  const sizes: [string, number, number, number][] = [
    ["6200", 10, 30, 9], ["6201", 12, 32, 10], ["6202", 15, 35, 11], ["6203", 17, 40, 12], ["6204", 20, 47, 14],
    ["6205", 25, 52, 15], ["6206", 30, 62, 16], ["6207", 35, 72, 17], ["6208", 40, 80, 18], ["6209", 45, 85, 19],
    ["6210", 50, 90, 20], ["6305", 25, 62, 17], ["6306", 30, 72, 19], ["6307", 35, 80, 21], ["6308", 40, 90, 23],
    ["6309", 45, 100, 25], ["6310", 50, 110, 27],
  ];
  const out: PartTemplate[] = [];
  sizes.forEach(([c, d, D, B], i) => {
    for (const seal of ["2RS", "ZZ"] as const) {
      const sealed = seal === "2RS";
      out.push({
        id: `SP-BRG-${c}-${seal}`,
        name: `BEARING, BALL, DEEP GROOVE, ${c}-${seal}, ${d}X${D}X${B}MM`,
        family: "Deep groove ball bearing",
        category: "Bearings",
        manufacturerPartNumbers: [],
        specs: {
          "Bearing designation": c,
          Dimensions: `${d}×${D}×${B} mm`,
          "Seal / shield": sealed ? "2RS (rubber sealed)" : "ZZ (metal shielded)",
        },
        uom: "EA",
        aliases: [],
        mpns: sealed
          ? [["SKF", `${c}-2RSH`], ["FAG (Schaeffler)", `${c}-2RSR`], ["NSK", `${c}DDU`], ["NTN", `${c}LLU`]]
          : [["SKF", `${c}-2Z`], ["FAG (Schaeffler)", `${c}-2Z`], ["NSK", `${c}ZZ`], ["NTN", `${c}ZZ`]],
        variants: [
          `Ball brg ${c} ${seal}`,
          `BRG DGBB ${c}-${seal} ${d}ID ${D}OD`,
          `Bearing ${c} ${sealed ? "sealed" : "shielded"} ${d}x${D}x${B}`,
          `BEARING ${c}${seal}`,
          `Deep groove bearing ${d}x${D}x${B}mm ${seal}`,
          `${c} ${seal} bearing`,
        ],
        equipment: [pick(EQUIP.rotating, i), pick(EQUIP.hvac, i + 1)],
        basePrice: 6 + (D - 30) * 0.55 + (sealed ? 1.5 : 0),
        suppliers: SUPPLIERS.bearings,
        qtyScale: 24,
      });
    }
  });
  return out;
}

function belts(): PartTemplate[] {
  const out: PartTemplate[] = [];
  const lengths = [1000, 1120, 1250, 1400, 1600, 1800, 2000, 2240, 2500];
  ["SPZ", "SPA", "SPB"].forEach((s, si) => {
    lengths.forEach((L, li) => {
      out.push({
        id: `SP-BLT-${s}${L}`,
        name: `BELT, V, WEDGE, ${s}${L}, LW ${L}MM`,
        family: "Wedge V-belt",
        category: "Power Transmission",
        manufacturerPartNumbers: [],
        specs: { "Belt section": s, "Belt length": `${L} mm` },
        uom: "EA",
        aliases: [],
        mpns: [["Gates", `${s}${L}`], ["Optibelt", `${s} ${L} LW`], ["Continental", `${s}${L}`], ["Fenner", `${s}${L}`]],
        variants: [`V-belt ${s} ${L}`, `Wedge belt ${s}-${L} Lw`, `BELT V ${s}${L}`, `Fan belt ${s}${L}`, `Vee belt ${s} ${L}mm`],
        equipment: [pick(EQUIP.hvac, li + si), pick(EQUIP.rotating, li)],
        basePrice: 9 + si * 4 + L / 400,
        suppliers: SUPPLIERS.drives,
        qtyScale: 14,
      });
    });
  });
  return out;
}

function orings(): PartTemplate[] {
  const out: PartTemplate[] = [];
  const sizes: [number, number][] = [[20, 2.5], [25, 3], [30, 3], [40, 3], [50, 3], [60, 4], [75, 4], [100, 5]];
  sizes.forEach(([id, cs], i) => {
    for (const mat of ["NBR", "FKM"]) {
      out.push({
        id: `SP-ORG-${id}X${cs}-${mat}`,
        name: `O-RING, ${mat}, ${id}X${cs}MM`,
        family: "O-ring",
        category: "Seals & Gaskets",
        manufacturerPartNumbers: [],
        specs: { Dimensions: `${id}×${cs} mm`, Material: mat },
        uom: "EA",
        aliases: [],
        mpns: [["Parker Hannifin", `${mat === "NBR" ? "N0674" : "V0747"}-${id}X${cs}`], ["Trelleborg", `OR${id}0${cs * 10}-${mat}70`]],
        variants: [
          `O ring ${id}x${cs} ${mat}`,
          `ORING ${mat === "FKM" ? "VITON" : "NBR"} ${id} X ${cs}`,
          `Seal o-ring ${id}mm ID ${cs} CS ${mat === "FKM" ? "viton" : "nitrile"}`,
          `O-RING ${id}X${cs} ${mat}70`,
        ],
        equipment: [pick(EQUIP.hydraulic, i), pick(EQUIP.piping, i)],
        basePrice: 0.6 + id / 60 + (mat === "FKM" ? 1.8 : 0),
        suppliers: SUPPLIERS.seals,
        qtyScale: 80,
        uomVariants: ["EA", "PCS", "BOX/10", "EA"],
      });
    }
  });
  return out;
}

function fuses(): PartTemplate[] {
  return [16, 25, 32, 40, 50, 63, 80, 100, 125, 160].map((a, i) => ({
    id: `SP-FUS-NH00-${a}A`,
    name: `FUSE, HRC, NH00, ${a}A, 500V, gG`,
    family: "HRC fuse link",
    category: "Electrical",
    manufacturerPartNumbers: [],
    specs: { "Fuse size": "NH00", "Current rating": `${a} A`, Voltage: "500 V" },
    uom: "EA",
    aliases: [],
    mpns: [["Siemens", `3NA3${String(a).padStart(3, "0")}`], ["ABB", `OFAF00H${a}`], ["Mersen", `NH00GG50V${a}`]],
    variants: [`Fuse NH00 ${a} amp gG`, `HRC FUSE ${a}A 500V`, `FUSE LINK NH-00 ${a}A`, `NH00 fuse ${a}A`],
    equipment: [pick(EQUIP.electrical, i)],
    basePrice: 4 + a / 25,
    suppliers: SUPPLIERS.electrical,
    qtyScale: 30,
  }));
}

function contactors(): PartTemplate[] {
  const out: PartTemplate[] = [];
  [9, 12, 18, 25, 32, 40, 50, 65].forEach((a, i) => {
    for (const coil of ["230VAC", "24VDC"]) {
      const ac = coil === "230VAC";
      out.push({
        id: `SP-CON-${a}A-${coil}`,
        name: `CONTACTOR, 3P, ${a}A AC3, COIL ${coil}`,
        family: "Contactor",
        category: "Electrical",
        manufacturerPartNumbers: [],
        specs: { "Current rating": `${a} A`, Voltage: ac ? "230 V AC" : "24 V DC", Poles: "3-pole" },
        uom: "EA",
        aliases: [],
        mpns: [
          ["Schneider Electric", `LC1D${String(a).padStart(2, "0")}${ac ? "P7" : "BD"}`],
          ["Siemens", `3RT20${20 + i}-1${ac ? "AP" : "BB"}40`],
          ["ABB", `AF${a}-30-00-${ac ? "13" : "11"}`],
        ],
        variants: [`Contactor ${a}A ${coil}`, `CONT 3P ${a}A coil ${coil}`, `Contactor 3 pole ${a} amp ${ac ? "230V AC" : "24V DC"} coil`, `CONTACTOR ${a}A AC3 ${coil}`],
        equipment: [pick(EQUIP.electrical, i + 1)],
        basePrice: 28 + a * 1.9,
        suppliers: SUPPLIERS.electrical,
        qtyScale: 6,
      });
    }
  });
  return out;
}

function motors(): PartTemplate[] {
  return [0.75, 1.5, 2.2, 4, 5.5, 7.5, 11, 15, 22, 30].map((kw, i) => ({
    id: `SP-MTR-${kw}KW-4P`,
    name: `MOTOR, ELECTRIC, 3PH, ${kw}KW, 4P, 415V, IE3, FOOT MOUNT`,
    family: "Electric motor",
    category: "Rotating Equipment",
    manufacturerPartNumbers: [],
    specs: { Power: `${kw} kW`, Poles: "4-pole", Voltage: "415 V" },
    uom: "EA",
    aliases: [],
    mpns: [["WEG", `W22-${kw}-4P-IE3`], ["Siemens", `1LE1003-${i}AB4`], ["ABB", `M3BP-${kw}-4`], ["TECO", `AEHH-${kw}-4`]],
    variants: [`Electric motor ${kw}kW 4 pole 415V`, `MTR ${kw}KW 1500RPM 415V`, `Motor ${kw} kw 4P B3`, `3PH MOTOR ${kw}KW 4P`],
    equipment: [pick(EQUIP.rotating, i), pick(EQUIP.hvac, i)],
    basePrice: 140 + kw * 62,
    suppliers: SUPPLIERS.drives,
    qtyScale: 2,
  }));
}

function solenoids(): PartTemplate[] {
  const out: PartTemplate[] = [];
  ["1/4", "1/2", "3/4", "1"].forEach((s, i) => {
    for (const coil of ["24VDC", "230VAC"]) {
      const dc = coil === "24VDC";
      out.push({
        id: `SP-SOL-${s.replace("/", "-")}-${coil}`,
        name: `VALVE, SOLENOID, 2-WAY NC, ${s}" BSP, ${coil}`,
        family: "Solenoid valve",
        category: "Valves",
        manufacturerPartNumbers: [],
        specs: { "Nominal size": `${s}"`, Voltage: dc ? "24 V DC" : "230 V AC" },
        uom: "EA",
        aliases: [],
        mpns: [["ASCO", `SCG238A0${30 + i}${dc ? "-24DC" : "-230AC"}`], ["Bürkert", `6213-${s.replace("/", "")}-${dc ? "24" : "230"}`], ["Parker Hannifin", `VE${dc ? "D" : "A"}${i + 1}21`]],
        variants: [`Sol valve ${s}" ${coil} NC`, `SOLENOID VLV ${s} INCH BSP ${coil}`, `Solenoid valve ${s}in normally closed ${dc ? "24V DC" : "230V AC"}`],
        equipment: [pick(EQUIP.piping, i), pick(EQUIP.packaging, i)],
        basePrice: 55 + i * 22,
        suppliers: SUPPLIERS.instruments,
        qtyScale: 5,
      });
    }
  });
  return out;
}

function sensors(): PartTemplate[] {
  const out: PartTemplate[] = [];
  ([["12", 4], ["18", 8], ["30", 15]] as const).forEach(([t, r], i) => {
    for (const o of ["PNP", "NPN"]) {
      out.push({
        id: `SP-PRX-M${t}-${o}`,
        name: `SENSOR, PROXIMITY, INDUCTIVE, M${t}, ${o}, NO, ${r}MM`,
        family: "Inductive proximity sensor",
        category: "Instrumentation",
        manufacturerPartNumbers: [],
        specs: { "Thread / size": `M${t}`, Output: o },
        uom: "EA",
        aliases: [],
        mpns: [["IFM", `IG${t === "12" ? "5" : t === "18" ? "6" : "7"}${o === "PNP" ? "53" : "54"}`], ["Sick", `IME${t}-${r}${o === "PNP" ? "BPS" : "BNS"}ZC0S`], ["Omron", `E2E-X${r}${o === "PNP" ? "E" : "C"}1`]],
        variants: [`Prox sensor M${t} ${o} ${r}mm`, `Inductive switch M${t} ${o} NO`, `PROX SW M${t} ${o}`],
        equipment: [pick(EQUIP.packaging, i), pick(EQUIP.rotating, i)],
        basePrice: 32 + i * 9,
        suppliers: SUPPLIERS.instruments,
        qtyScale: 8,
      });
    }
  });
  return out;
}

function gaskets(): PartTemplate[] {
  const out: PartTemplate[] = [];
  ["1", "2", "3", "4", "6", "8"].forEach((s, i) => {
    for (const cl of ["150", "300"]) {
      out.push({
        id: `SP-GSK-${s}IN-CL${cl}`,
        name: `GASKET, SPIRAL WOUND, ${s}" CL${cl}, SS316/GRAPHITE`,
        family: "Spiral wound gasket",
        category: "Seals & Gaskets",
        manufacturerPartNumbers: [],
        specs: { "Nominal size": `${s}"`, "Pressure class": `Class ${cl}`, Material: "SS316" },
        uom: "EA",
        aliases: [],
        mpns: [["Flexitallic", `CG-${s}-${cl}-316-FG`], ["Lamons", `SWG${s}${cl}SS316`], ["Garlock", `RW-${s}-${cl}`]],
        variants: [`SWG ${s}" ${cl}# 316 graphite`, `Gasket spiral wound ${s} inch ${cl}lb SS316`, `SPIRAL WOUND GASKET ${s}IN CL${cl}`],
        equipment: [pick(EQUIP.piping, i)],
        basePrice: 7 + Number(s) * 3.2 + (cl === "300" ? 4 : 0),
        suppliers: SUPPLIERS.seals,
        qtyScale: 20,
      });
    }
  });
  return out;
}

function filters(): PartTemplate[] {
  const out: PartTemplate[] = [];
  [3, 10, 25].forEach((m, mi) => {
    [160, 240, 330].forEach((len, li) => {
      out.push({
        id: `SP-FLT-${m}U-${len}`,
        name: `FILTER ELEMENT, HYDRAULIC, ${m} MICRON, ${len}MM`,
        family: "Hydraulic filter element",
        category: "Filtration",
        manufacturerPartNumbers: [],
        specs: { Filtration: `${m} µm` },
        uom: "EA",
        aliases: [],
        mpns: [["Hydac", `0${len}D0${String(m).padStart(2, "0")}BN4HC`], ["Pall", `HC9${li}00FKP${m}H`], ["Parker Hannifin", `937${li}${mi}${m}Q`]],
        variants: [`Hyd filter ${m}u element ${len}`, `FILTER ELEM ${m}MIC HYD`, `Hydraulic return filter ${m} micron`],
        equipment: [pick(EQUIP.hydraulic, li + mi)],
        basePrice: 24 + len / 10 + (m === 3 ? 12 : 0),
        suppliers: SUPPLIERS.seals,
        qtyScale: 10,
      });
    });
  });
  return out;
}

function gauges(): PartTemplate[] {
  return [6, 10, 16, 25].map((r, i) => ({
    id: `SP-GAU-0-${r}BAR`,
    name: `GAUGE, PRESSURE, 0-${r} BAR, 100MM DIAL, 1/2" BSP, GLYCERINE FILLED`,
    family: "Pressure gauge",
    category: "Instrumentation",
    manufacturerPartNumbers: [],
    specs: { Range: `0–${r} bar`, "Nominal size": `1/2"` },
    uom: "EA",
    aliases: [],
    mpns: [["WIKA", `213.53.100-${r}B`], ["Ashcroft", `1009-100-${r}BAR`]],
    variants: [`Pressure gauge 0-${r} bar 100mm`, `GAUGE PRESS 0-${r}BAR 1/2" BSP`, `Glycerine gauge 0 - ${r} bar`],
    equipment: [pick(EQUIP.piping, i), pick(EQUIP.hvac, i)],
    basePrice: 18 + r * 0.6,
    suppliers: SUPPLIERS.instruments,
    qtyScale: 6,
  }));
}

function couplings(): PartTemplate[] {
  return ["L070", "L075", "L090", "L095", "L100", "L110"].map((l, i) => ({
    id: `SP-CPL-${l}`,
    name: `COUPLING SPIDER, JAW, ${l}, NBR`,
    family: "Jaw coupling spider",
    category: "Power Transmission",
    manufacturerPartNumbers: [],
    specs: { "Coupling size": l, Material: "NBR" },
    uom: "EA",
    aliases: [],
    mpns: [["Lovejoy", `${l}-NBR`], ["Fenner", `JAW-${l}-SP`]],
    variants: [`Jaw coupling spider ${l}`, `CPLG SPIDER ${l} NBR`, `Spider insert ${l} rubber`],
    equipment: [pick(EQUIP.rotating, i)],
    basePrice: 6 + i * 2.5,
    suppliers: SUPPLIERS.drives,
    qtyScale: 10,
  }));
}

function fasteners(): PartTemplate[] {
  const out: PartTemplate[] = [];
  const sizes = [8, 10, 12, 16, 20, 24];
  const lengths = [30, 50, 80, 100];
  sizes.forEach((m) => {
    lengths.forEach((l) => {
      for (const g of ["8.8", "10.9"]) {
        out.push({
          id: `SP-BLT-M${m}X${l}-${g}`,
          name: `BOLT, HEX HEAD, M${m}X${l}, GR ${g}, ZINC PLATED`,
          family: "Hex bolt",
          category: "Fasteners",
          manufacturerPartNumbers: [],
          specs: { "Thread / size": `M${m}`, Dimensions: `${m}×${l} mm` },
          uom: "EA",
          aliases: [],
          mpns: [["Unbrako", `HHB-M${m}${l}-${g.replace(".", "")}`], ["Generic / Unbranded", `ISO4014-M${m}X${l}-${g}`]],
          variants: [`Hex bolt M${m}x${l} ${g}`, `BOLT M${m} X ${l} GR${g} ZP`],
          equipment: [""],
          basePrice: 0.2 + m * 0.05 + l * 0.004,
          suppliers: SUPPLIERS.fasteners,
          qtyScale: 150,
          uomVariants: ["EA", "BOX/100", "EA"],
          longTail: true,
        });
      }
    });
  });
  ["1/2", "3/4", "1", "2", "3", "4"].forEach((s, i) => {
    for (const mat of ["SS316", "CS"]) {
      for (const t of ["ELBOW 90", "TEE EQUAL"]) {
        out.push({
          id: `SP-FIT-${t.replace(" ", "")}-${s.replace("/", "-")}-${mat}`,
          name: `FITTING, ${t}, ${s}" BW, ${mat === "CS" ? "CARBON STEEL" : "SS316"}, SCH40`,
          family: "Pipe fitting",
          category: "Piping",
          manufacturerPartNumbers: [],
          specs: { "Nominal size": `${s}"` },
          uom: "EA",
          aliases: [],
          mpns: [["Generic / Unbranded", `${t.split(" ")[0].slice(0, 2)}${s.replace("/", "")}${mat}`]],
          variants: [`${t.toLowerCase()} ${s}" ${mat} butt weld`, `${t} ${s} INCH ${mat} SCH40`],
          equipment: [pick(EQUIP.piping, i)],
          basePrice: 3 + inches(s) * (mat === "SS316" ? 14 : 5),
          suppliers: SUPPLIERS.fasteners,
          qtyScale: 12,
          longTail: true,
        });
      }
    }
  });
  return out;
}

export const PART_TEMPLATES: PartTemplate[] = [
  ...bearings(),
  ...belts(),
  ...orings(),
  ...fuses(),
  ...contactors(),
  ...motors(),
  ...solenoids(),
  ...sensors(),
  ...gaskets(),
  ...filters(),
  ...gauges(),
  ...couplings(),
  ...fasteners(),
];
