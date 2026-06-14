import type { Equipment, SensorSnapshot, MaintenanceLog, AlarmEvent, ChatMode, ChatDomain } from '@/types'

const EXPERT_IDENTITY = `You are ColdIQ, an expert refrigeration systems consultant specialising in supermarket and commercial refrigeration. You have deep practical knowledge equivalent to a senior refrigeration engineer with 25+ years of field experience across traditional HFC rack systems and modern CO₂ transcritical systems.

Your expertise covers:
- CO₂ (R-744) transcritical rack systems: Hussmann, Advansor, Carnot, Evapco LMP, Bitzer, TEWIS, Zero Zone, CO2one, Danfoss Booster — operation, commissioning, fault diagnosis
- Supermarket display cases and walk-in coolers/freezers (all major manufacturers: Hussmann RL/PL/IQ series, Tyler, Hill Phoenix, Kysor Warren, Anthony, Bohn, Heatcraft, Carrier)
- HFC refrigerants: R-404A, R-448A, R-449A, R-507A, R-134a, and CO₂ (R-744) systems
- Store controller systems: Emerson E2/E3, Danfoss AK-SM 800/850, Microthermo
- Defrost systems: electric, hot gas, CO₂ off-cycle — scheduling, termination, and common faults
- Compressor types: scroll, reciprocating, semi-hermetic — Copeland, Bitzer, Carlyle, Bristol; CO₂ booster and transcritical compressors
- Electronic expansion valves and TXVs — Danfoss ETS/CCMT/ICM, Sporlan, Alco
- Gas coolers, evaporative condensers, adiabatic systems, flash tanks, intermediate pressure vessels
- Oil management: oil separators, level controllers (Kriwan INT69, Emerson OMB/OMC, Traxoil), oil return strategies in CO₂ systems
- Regulatory standards: ASHRAE 15, ASHRAE 34, EPA 608, AIM Act refrigerant phase-down schedule

BEHAVIOURAL RULES:
1. Source priority: RETRIEVED DOCUMENTATION (from uploaded manuals) > equipment context data > built-in knowledge. When retrieved documentation directly addresses the question, lead your answer with it.
2. Only ask a clarifying question when you genuinely cannot give a useful answer without it AND no relevant documentation has been retrieved. Ask one focused question at a time.
3. Work systematically from symptoms to causes. Never jump to expensive component replacements before ruling out simple causes (dirty coil, closed valve, failed fan, sensor offset).
4. Be precise with numbers — superheat targets, pressure specs, temperature setpoints, and resistance values matter in refrigeration diagnosis.
5. Flag safety hazards only when there is a genuine, specific hazard relevant to the described task. Do not append generic disclaimers to every response.
6. TERMINOLOGY — NEVER use the term "Case Differential Sensor" for CDS. In supermarket refrigeration, **CDS is a Sporlan stepper-motor Evaporator Pressure Regulating valve** (EPR valve), not a sensor. "Case Differential Sensor" does not exist as a refrigeration component. If a technician mentions a CDS valve or a CDS reading on their controller, treat it as a Sporlan stepper EPR valve.`

// ── Deep refrigeration knowledge base ────────────────────────────────────────
// This is baked into every system prompt so the model has strong fundamentals
// even when no manual chunk is retrieved for a question.
export const REFRIGERATION_KNOWLEDGE = `
## Refrigeration Fundamentals — The Cycle, PT Relationships & Field Rules

![R-134a log P-h pressure-enthalpy diagram](https://upload.wikimedia.org/wikipedia/commons/7/79/Log_ph_Plot_-_R134a.svg "Pressure-enthalpy (log P-h) diagram — the core tool for analysing vapour compression refrigeration cycles")

Every refrigeration and air conditioning system — from a household fridge to a supermarket rack — runs the same basic cycle: a refrigerant absorbs heat at low pressure, gets compressed, rejects that heat at high pressure, and expands back down to start again. This lesson covers that cycle, how to read pressure as temperature using a PT chart, the two key measurements (superheat and subcooling) used to confirm a system is running correctly, refrigerant and oil basics, and the field rules of thumb you'll use on every service call.

### The 4 Stages of the Refrigeration Cycle

| Stage | Location | What Happens | Key Measurement |
|---|---|---|---|
| **1. Evaporation** | Evaporator coil | Liquid absorbs heat, boils to vapor | Superheat at coil outlet |
| **2. Suction** | Suction line → compressor | Low-pressure vapor travels to compressor | Suction pressure & temp |
| **3. Compression** | Compressor | Pressure and temperature rise | Discharge temp & pressure |
| **4. Condensation** | Condenser → receiver | Hot vapor rejects heat, condenses to liquid | Subcooling at condenser outlet |

### How to Read a PT Chart
1. Identify the refrigerant — use the correct chart
2. Read suction or discharge pressure on your gauge (psig)
3. Find that pressure in the left column of the chart
4. Read across to the saturation temperature column
5. For **zeotropic blends** (R-404A, R-448A): use the **dew point** column on the suction side, **bubble point** on the liquid side

**Example — R-404A:**
- Suction gauge reads 60 psig → PT chart dew point = 26°F (this is your SST)
- Suction line thermocouple reads 39°F
- Superheat = 39 − 26 = **13°F** ✓

### Superheat & Subcooling

**Superheat** = suction line temperature − SST (saturation suction temperature, from PT chart at measured suction pressure)
- Too high (>20°F): starved evaporator — undercharge, TXV stuck closed, restriction
- Too low (<5°F): flooded evaporator — TXV overfeeding, failed bulb, overcharge, liquid slugging risk

**Subcooling** = SCT (saturation condensing temperature, from PT chart at measured head pressure) − liquid line temperature
- Too low (<5°F): undercharge, condenser fan failure, high load
- Too high (>20°F): possible overcharge, cold ambient

### TXV vs EPR — Key Difference

| | TXV | EPR |
|---|---|---|
| **Controls** | Superheat (how much refrigerant enters evaporator) | Minimum evaporator pressure (minimum coil temperature) |
| **Location** | Evaporator inlet | Evaporator outlet (suction line) |
| **Senses** | Suction line temperature via remote bulb | Downstream suction pressure |
| **Effect of failure** | Open = flooding; Closed = starving | Open = case overcools; Closed = case warms |

Both are often used together: the TXV feeds the evaporator correctly, the EPR ensures the case doesn't drop below its minimum setpoint. The Refrigeration Components lesson covers what these and other components look like and where they sit in the system.

### Refrigerants & Oils

- **R-404A** — Zeotropic blend (R-125/R-143a/R-134a); dominant in older supermarket freezer systems; GWP 3,922; being phased down under AIM Act. Glide ≈ 0.5°F — near-azeotropic, negligible in practice.
- **R-448A / R-449A** — Lower-GWP HFO blends; drop-in replacements for R-404A; glide ≈ 11°F — always **liquid-charge** and use dew point for suction-side calculations.
- **R-410A** — Azeotropic blend (R-32/R-125 50/50); standard in commercial HVAC; GWP 2,088.
- **R-744 / CO₂** — Carbon dioxide; natural refrigerant, near-zero GWP; critical point 87.8°F / 1,070 psi; used in transcritical booster systems (its own course covers this in depth).

**Azeotropic vs Zeotropic:**
- **Azeotropic** (R-410A, R-507): single boiling/condensing temperature at any pressure; behaves like a pure refrigerant; can be vapor-charged
- **Zeotropic** (R-404A, R-448A): blend components have different boiling points; must be **liquid-charged** to maintain composition; vapor charging fractionates the blend

**Oils:**
- **POE** (Polyol Ester) — synthetic oil for HFC/HFO systems (R-410A, R-404A, R-448A); hygroscopic — keep containers sealed; incompatible with mineral oil
- **Mineral Oil** — for legacy R-12 and R-22 systems; NOT compatible with HFC refrigerants
- Viscosity grades (22, 32, 68, 100 cSt) must match the compressor manufacturer's spec — wrong viscosity causes bearing wear

### Undercharge vs Overcharge

| | Undercharge | Overcharge |
|---|---|---|
| **Suction pressure** | Low | Normal–High |
| **Superheat** | High | Low |
| **Subcooling** | Low | High |
| **Sight glass** | Bubbles / flash gas | Clear |
| **Discharge temp** | High | Normal–High |
| **Cause** | Leak | Technician error |

### Field Rules of Thumb

#### Temperature Difference (TD) and Humidity
| Application | Evaporator TD | Space RH |
|---|---|---|
| A/C | 35°F | ~50% |
| Reach-in coolers | 20°F | ~65% |
| Walk-in coolers | 10°F | ~85% |
| Walk-in (high humidity) | 8°F | ~90% |

#### Condenser Split (TD Over Ambient)
- A/C (10 SEER and below): 30°F
- Medium-temp refrigeration: 30°F
- Low-temp refrigeration: 25°F
- High-efficiency condensers: 20°F and below

#### Superheat at Evaporator (TXV system)
| Application | Target | Min | Max |
|---|---|---|---|
| A/C | 15°F | 5°F | 20°F |
| Medium-temp | 10°F | 5°F | 20°F |
| Low-temp | 5°F | 5°F | 20°F |
Take superheat readings within 5°F of design conditions.

#### Subcooling Targets
- A/C: 15°F average
- Standard refrigeration: 10°F average
- Minimum: 5°F | Maximum: 20°F
- Ambient below 70°F increases subcooling.

#### Critical Temperature Limits
- Compressor discharge: **225°F maximum**
- Oil sump: **180°F maximum**
- Standard condensing: 105–125°F max | High-efficiency: 85–100°F max

#### Crankcase Heater
Required when ambient drops below 50°F, on long off-cycles, or when using POE oil (R-410A, R-448A systems).

#### Receiver Charge Level
- Air-cooled systems: 70–80% of receiver volume
- Water-cooled systems: 60–70%
- Supermarket racks: half-full during normal operation
`

// ── Refrigeration components knowledge base ─────────────────────────────────
export const REFRIGERATION_COMPONENTS_KNOWLEDGE = `
## Basic Components of the Refrigeration Cycle

Every vapor-compression system — supermarket rack, reach-in, or rooftop unit — is built from the same five core components. This lesson introduces what each one does and where it sits in the cycle. The Rack System Components course goes deeper on the valves and controls that surround them.

### The Compressor
The "heart" of the system. Draws in low-pressure refrigerant vapor from the suction line and compresses it, raising both its pressure and temperature, then discharges it toward the condenser. Common types in supermarket refrigeration: scroll, reciprocating (semi-hermetic), and screw compressors — multiple compressors are usually piped together on a parallel rack to share the load and provide capacity staging.

### The Condenser (or Gas Cooler)
Rejects the heat absorbed in the evaporator (plus the heat of compression) to outdoor air or water. Hot, high-pressure refrigerant vapor enters, gives up heat, and leaves as a subcooled liquid (or, for CO₂ operating transcritically, as a cooled supercritical gas — covered in the CO₂ course). A dirty or fouled condenser coil is the single most common cause of high head pressure.

### The Metering Device (TXV / EEV)

![Thermostatic expansion valve (TXV) cross-section](https://upload.wikimedia.org/wikipedia/commons/9/96/Thermostatic_expansion_valve.svg "TXV cross-section — refrigerant enters at high pressure on the left and exits at low pressure on the right, metered by the diaphragm and pin assembly")

Located at the evaporator inlet, the metering device drops the high-pressure liquid refrigerant to a low pressure and meters the flow rate to match the evaporator load. A **thermostatic expansion valve (TXV)** uses a sensing bulb on the suction line to maintain target superheat mechanically; an **electronic expansion valve (EEV)** does the same job under controller command, using a stepper motor for finer, faster control.

### The Evaporator
Where the useful work happens — refrigerant boils (evaporates) as it absorbs heat from the air (or product) in the case, walk-in, or air handler. The refrigerant must fully boil off before leaving the coil (superheat confirms this) — any liquid carryover into the suction line risks compressor damage (liquid slugging).

### Receivers and Accumulators
- **Receiver** — a high-side vessel that stores excess liquid refrigerant between the condenser and the metering device, buffering charge as load conditions change.
- **Accumulator** — a low-side vessel between the evaporator and the compressor that catches any liquid refrigerant before it reaches the compressor, protecting against floodback and slugging.

### Putting It Together
Refrigerant flows in one direction around a closed loop: **compressor → condenser → receiver → metering device → evaporator → accumulator (if fitted) → back to the compressor.** Every fault you'll diagnose comes down to refrigerant, airflow, or electrical issues at one of these five stages — which is exactly the framework the System Fault Diagnosis lesson builds on.
`

// ── System operation knowledge base ──────────────────────────────────────────
export const SYSTEM_OPERATION_KNOWLEDGE = `
## System Operation — HFC Rack Fundamentals

Once you understand the cycle and its components, the next step is understanding how a multi-compressor HFC rack is actually operated day to day: target pressures, protecting the compressors from liquid and oil problems, capacity control, defrost, charging, and sizing rules. This lesson builds the operational foundation used across the Parallel Rack Systems and Sequence of Events topics.

### HFC Operating Pressures & Targets

**Typical rack suction pressure targets:**
- LT (−35 to −25°C): 19–29 psia / 1.3–2.0 bar
- MT (−10 to −5°C): 45–55 psia / 3.1–3.8 bar
- Condensing (design): 100–130 psia / 6.9–9.0 bar

**System pressures — R-404A / R-448A / R-449A:**

Medium-temp:
- Suction: 35–45 psig | SST: +15 to +25°F
- Head: 180–250 psig | SCT: 90–110°F

Low-temp:
- Suction: 15–25 psig | SST: −10 to −20°F
- Head: 180–250 psig | SCT: 90–110°F

**Superheat and subcooling at the rack:**
- Rack suction superheat (total): **10–20°F (5.5–11°C)** — below 8°F = flooding risk; above 25°F = undercharge or restriction
- Individual case superheat at EEV/TXV outlet: **6–12°F (3.3–6.7°C)**
- Liquid subcooling at rack condenser outlet: **10–20°F (5.5–11°C)**
- Compressor discharge superheat: **40–80°F (22–44°C)** — above 100°F = investigate

**Rack staging rules:**
- Minimum compressor runtime: 5 min (prevents short cycling)
- Target: 3–6 compressor starts per hour maximum
- Oil return issues begin when suction superheat exceeds 20°F

### Liquid Slugging — What It Is and Why It Destroys Compressors
Liquid refrigerant reaching the compressor instead of vapor. Liquids are incompressible — when the piston tries to compress liquid, the connecting rod bends or breaks, valve plates shatter, and bearings seize. Failure is immediate and complete (repair cost $5,000–$15,000+).

**Causes:** flooded evaporator (TXV overfeeding), refrigerant migration during off-cycle, failed accumulator
**Prevention:** accumulator on suction line, crankcase heater during off-cycle, proper superheat, pump-down system

### Pump-Down System
Before the compressor shuts off:
1. Controller closes the liquid line solenoid valve
2. Compressor continues running, pulling suction pressure down to 0–5 psig
3. Low-pressure switch trips → compressor stops
4. All low-side refrigerant is stored in the condenser/receiver — no migration overnight

At next startup: suction side is empty until the solenoid opens and refrigerant refills the circuit.

### Oil Return
Compressor oil circulates with refrigerant. Without good oil return:
- Oil accumulates in evaporators → insulates the coil → reduced efficiency
- Compressor loses oil → bearing failure, burnout

Key components: **oil separator** (discharge line, ~95% recovery), **oil return line** (accumulator to crankcase), **crankcase heater** (boils dissolved refrigerant out of oil during off-cycle)

### Compressor Capacity Control Methods
1. **Unloading** — cylinder heads lifted or ported; compressor runs but doesn't compress; maintains oil circulation; 4-step unloaders common (0%, 33%, 67%, 100%)
2. **VFD** — modulates RPM infinitely; most efficient; higher upfront cost
3. **Pump Down / Stage Cycling** — bring additional compressors on/off the common suction header based on demand

### Defrost Methods & Efficiency

**Method selection (MT walk-ins):**
- Box ≥ 37°F → off-cycle defrost (thermostat)
- Box ~35°F → time-clock planned defrost
- Box < 33°F → time-clock + heat defrost

**Efficiency ranking:**
1. Hot Gas Defrost (~90% efficient) — fastest, least case temperature rise
2. Reverse Cycle (~80%)
3. Electric Defrost (~40%) — most common, highest energy cost
4. Off-Cycle (~10%) — only viable in warmer walk-ins

Defrost on Demand (adaptive) saves 30–40% energy vs timer-only control by defrosting only when frost is actually present.

### Refrigerant Charging Rules
- **Zeotropic blends** (R-404A, R-448A): always charge as **liquid** through the high side; vapor charging fractionates the blend
- **Azeotropic blends** (R-410A, R-507): can vapor-charge the low side
- Charge by weight whenever possible; use manufacturer's nameplate charge
- After repairs: triple evacuate (nitrogen break between pulls) to 500 microns; decay test 30 min

### Sizing & Airflow Reference

#### Airflow (CFM per Ton)
- A/C: 400 CFM/ton
- Medium-temp: 250–350 CFM/ton
- Low-temp: 175–250 CFM/ton

#### Compressor Amperage (average draw)
- Single-phase: 6–7 A/hp
- Three-phase 208/230V: 2.5–3 A/hp
- Three-phase 575V: 1.0–1.2 A/hp (Canadian standard; US equivalent 460V ≈ 1.25–1.5 A/hp)

#### Compressor BTU Output (approximate)
- A/C: 1 hp ≈ 12,000 BTU/h
- Medium-temp: 1 hp ≈ 8,000 BTU/h
- Low-temp: 1 hp ≈ 4,000 BTU/h

#### Suction Line Velocity
- Low-temp: 1,500–2,500 ft/min
- Medium-temp: 1,000–2,000 ft/min
- Liquid line minimum: 300 ft/min
- Trap suction lines on vertical risers over 5 ft.

#### Refrigerant Line Sizing (maximum runs)
- ½" liquid line: up to 100 ft
- ⅝" liquid line: up to 150 ft
- ⅞" suction line: up to 75 ft
Increase pipe size for longer runs to limit pressure drop.
`

// ── CO₂ transcritical knowledge base ─────────────────────────────────────────
export const CO2_TRANSCRITICAL_KNOWLEDGE = `
## CO₂ (R-744) Transcritical Rack Systems

CO₂ (R-744) is a natural refrigerant with near-zero GWP, increasingly used in supermarket booster rack systems. Its behavior is different enough from HFC systems that it deserves its own course — this lesson covers the transcritical cycle, operating pressures, key components and controls unique to CO₂, oil management, defrost, and common fault patterns.

### The Transcritical Cycle
CO₂ has a critical point at 31.1°C / 87.8°F, 73.8 bar / 1070 psi. When ambient is below ~25°C the system can condense (subcritical). Above that the system operates transcritically — the high-side CO₂ never condenses; instead the gas cooler cools it as a gas. High-side pressure must be actively controlled (not determined by saturation) — this is the most critical operating parameter.

### Typical CO₂ Operating Pressures
| Point | Pressure | Temperature equiv. |
|---|---|---|
| LT suction (booster in) | 12–20 bar (174–290 psi) | −35 to −25°C sat |
| MT / flash tank suction | 26–34 bar (377–493 psi) | −10 to −2°C sat |
| Intermediate (flash tank) | 35–45 bar (508–653 psi) | 0 to +10°C sat |
| Gas cooler outlet (transcritical) | 80–120 bar (1160–1740 psi) | no saturation — supercritical |
| HPCO trip point | 130–140 bar (1885–2031 psi) | — |
| LPCO trip point | 5–8 bar (73–116 psi) | −50 to −42°C sat |

### High-Pressure Valve (HPV / Gas Cooler Pressure Valve)
Controls high-side pressure. Optimal setpoint ≈ 2.6 × T_gascooler_outlet(°C) + 7 bar — chasing this setpoint maximises COP. A stuck-closed HPV causes immediate HPCO trip. A stuck-open HPV causes loss of system capacity and liquid flood-back.

### Flash Tank / Intermediate Pressure Vessel (IPV)
The flash tank separates liquid from flash gas after the main expansion valve. Booster compressors take suction from the LT cases and discharge into the flash tank. Main compressors take suction from the flash tank vapour + MT suction header. Flash tank level control is critical — too high floods main compressors; too low starves them.

### Oil Management in CO₂ Systems
CO₂ has poor miscibility with polyol ester (POE) oil. Oil separators on each compressor discharge are essential. Oil level controllers (Kriwan INT69, Emerson OMB/OMC, Traxoil) cut compressors on low oil. After an HPCO trip, always check oil levels before restart — oil migration during off-cycle is common. Use the manufacturer's specified oil charge and viscosity.

### CO₂ Defrost
Most CO₂ LT cases use electric or hot-gas defrost. Hot-gas defrost in CO₂ systems uses discharge gas — ensure the hot-gas solenoid is rated for CO₂ pressures (> 40 bar). Termination sensor typically set at 10–15°C on the coil. Failed termination = case floods, superheat drops, possible compressor damage.

### Common CO₂ Fault Patterns
- **HPCO trip**: gas cooler fans failed or coil fouled; HPV fault; high ambient spike; refrigerant overcharge; non-condensables; liquid slugging on restart
- **Low flash tank pressure / low MT suction**: MT expansion valves not opening; defrost stuck on; low MT load; flash tank level too high restricting vapour
- **High suction superheat (booster)**: LT EEVs not feeding correctly; refrigerant shortage; liquid line restriction to LT cases
- **Oil alarm**: oil separator bypass; migration during long off-cycle; wrong oil viscosity; oil pump fault
- **System won't reach transcritical / poor capacity in summer**: gas cooler fouled, approach temperature > 5°C above ambient means cleaning needed

For symptom-based CO₂ diagnosis (GC pressure issues, flash tank level problems, MT/LT suction crossover), see the System Fault Diagnosis topic.
`

// ── HVACR glossary knowledge base ────────────────────────────────────────────
export const HVACR_GLOSSARY_KNOWLEDGE = `
## HVACR Acronyms & Abbreviations Reference

A quick-reference glossary for the abbreviations and acronyms used across this knowledge base — components, refrigerants, oils, measurements, controls, defrost methods, and system types.

### System Components

**Compressors & Drives**
- **VFD** — Variable Frequency Drive; modulates compressor or fan motor speed for capacity control; most efficient method
- **EFM** — Evaporator Fan Motor; circulates air across the evaporator coil
- **CFM** — Cubic Feet Per Minute; measures airflow rate

**Expansion & Metering Devices**
- **TXV** — Thermostatic Expansion Valve; meters refrigerant into evaporator by sensing superheat at the suction line; maintains 5–15°F superheat automatically
- **EEV** — Electronic Expansion Valve; stepper motor or pulse-width modulated valve replacing TXV; controller-driven, more precise
- **EPR** — Evaporator Pressure Regulator; holds back suction pressure to maintain a minimum evaporator temperature; prevents over-cooling; does NOT control superheat
- **CPR** — Crankcase Pressure Regulator; limits compressor inlet pressure at startup to prevent motor overloading
- **MOP** — Maximum Operating Pressure; TXV setting that limits suction pressure in low-temperature applications to protect the compressor
- **SV / SOL** — Solenoid Valve; electromagnetically controlled on/off valve for liquid lines and hot gas lines
- **HGV** — Hot Gas Valve; directs hot compressor discharge gas to the evaporator during defrost cycles
- **CV** — Check Valve; one-way flow valve preventing reverse refrigerant flow
- **BPV** — Back Pressure Valve; maintains minimum downstream pressure to prevent vacuum conditions

**Heat Exchangers & Vessels**
- **RD** — Receiver-Drier; high-side vessel storing liquid refrigerant, removing moisture, and filtering contaminants (sits between condenser and expansion device)
- **ACC** — Accumulator; low-side vessel separating liquid from suction vapor before the compressor; prevents liquid slugging
- **FD / LLFFD** — (Liquid Line) Filter-Drier; removes moisture and particulates from liquid refrigerant before the expansion valve
- **IHX** — Internal Heat Exchanger; transfers heat between high-pressure liquid line and low-pressure suction gas; standard in CO₂ systems
- **AHU** — Air Handling Unit; equipment that conditions and circulates air (used in indirect/secondary loop systems)
- **FCU** — Fan Coil Unit; circulates cooled secondary fluid (chilled water or glycol) over a coil with a fan
- **DX** — Direct Expansion; refrigerant circulates directly through display case evaporators rather than via a secondary loop

**Compressor & System Protection**
- **HPS** — High Pressure Switch; shuts compressor down if discharge pressure exceeds safe limit (typically 400–450 psig for HFC systems)
- **LPS** — Low Pressure Switch; shuts compressor down if suction pressure drops too low; indicates refrigerant loss or evaporator blockage
- **ODS** — Oil Differential Switch; monitors pressure differential across compressor oil pump; trips on low oil pressure
- **OLP** — Overload Protector; thermal or electronic device protecting the compressor motor from excessive current

---

### Refrigerants

- **R-744 / CO₂** — Carbon dioxide; natural refrigerant, near-zero GWP; critical point 87.8°F / 1,070 psi; used in transcritical booster systems
- **R-404A** — Zeotropic blend (R-125/R-143a/R-134a); dominant in older supermarket freezer systems; GWP 3,922; being phased down under AIM Act
- **R-448A / R-449A** — Lower-GWP HFO blends; drop-in replacements for R-404A; require liquid charging
- **R-507** — Azeotropic blend (R-125/R-143a 50/50); used in low-temperature applications; zero ODP
- **R-410A** — Azeotropic blend (R-32/R-125 50/50); standard in commercial HVAC; GWP 2,088; being phased down
- **R-22** — HCFC (legacy); being phased out globally; common in older systems still in the field
- **R-290** — Propane; natural refrigerant; very efficient; flammable (A3 safety class); emerging in commercial reach-ins
- **ODP** — Ozone Depletion Potential; R-744 and HFCs = 0 ODP; HCFCs (R-22) > 0
- **GWP** — Global Warming Potential; CO₂ baseline = 1; lower is better; R-404A = 3,922, R-448A = 1,387
- **Temperature Glide** — For zeotropic blends: difference between bubble point (liquid starts boiling) and dew point (last vapor condenses) at a given pressure; R-404A glide ≈ 0.5°F (near-azeotropic — negligible in practice); R-448A ≈ 11°F (significant glide — always liquid-charge and use dew point for suction side calculations)

**Azeotropic vs Zeotropic:**
- **Azeotropic** (R-410A, R-507): single boiling/condensing temperature at any pressure; behaves like a pure refrigerant; can be vapor-charged
- **Zeotropic** (R-404A, R-448A): blend components have different boiling points; must be **liquid-charged** to maintain composition; vapor charging fractionates the blend

---

### Refrigerant Oils

- **POE** — Polyol Ester; synthetic oil for HFC/HFO systems (R-410A, R-404A, R-448A); hygroscopic — keep containers sealed; incompatible with mineral oil
- **PAG** — Polyalkylene Glycol; used in automotive R-134a systems; highly hygroscopic; incompatible with POE and mineral
- **Mineral Oil** — For legacy R-12 and R-22 systems; NOT compatible with HFC refrigerants
- **Viscosity** — POE viscosity grades: 22, 32, 68, 100 cSt — match to compressor manufacturer spec; wrong viscosity causes bearing wear

---

### Measurements & Calculations

- **psig** — Pounds per Square Inch Gauge; pressure relative to atmosphere (what your gauge reads)
- **psia** — Pounds per Square Inch Absolute; includes atmospheric pressure (psig + 14.7)
- **inHg** — Inches of Mercury; vacuum measurement (deeper vacuum = lower number)
- **Microns** — Unit of deep vacuum measurement; 500 microns = EPA-acceptable evacuation standard; decay test: isolate system for 30 min — should not rise above 500 microns
- **SST** — Saturation Suction Temperature; refrigerant boiling temperature corresponding to measured suction pressure (read from PT chart); used to calculate superheat
- **SCT** — Saturation Condensing Temperature; refrigerant condensing temperature corresponding to measured head pressure; used to calculate subcooling
- **SH** — Superheat; actual suction line temperature MINUS SST; indicates if evaporator is feeding correctly
- **SC** — Subcooling; SCT MINUS actual liquid line temperature; confirms adequate condenser cooling and liquid supply
- **BTU** — British Thermal Unit; heat energy required to raise 1 lb of water 1°F
- **TR** — Ton of Refrigeration; 12,000 BTU/hour; standard commercial sizing unit (a 50-TR rack = 600,000 BTU/h)
- **PT Chart** — Pressure-Temperature chart; shows saturation temperature for a refrigerant at any given pressure; fundamental tool for every service call

---

### Electrical & Controls

- **RTD** — Resistance Temperature Detector (Pt100, Pt1000); resistance increases predictably with temperature; used in precise electronic controllers
- **NTC** — Negative Temperature Coefficient thermistor; resistance DECREASES as temperature rises; most common sensor type in supermarket case controls
- **PTC** — Positive Temperature Coefficient thermistor; resistance INCREASES with temperature; used in motor protection and defrost heaters
- **Contactor** — Heavy-duty electromagnetic switch; 24 VAC coil controls high-voltage/high-amperage compressor and motor loads; check contacts for pitting
- **Starter** — Like a contactor but includes thermal overload heaters sized to the motor's full-load amperage
- **EMS** — Energy Management System; central controller monitoring pressures, temperatures, and modulating rack operation
- **PLC** — Programmable Logic Controller; industrial computer controlling rack sequencing, defrost schedules, and alarms
- **DDC** — Direct Digital Control; building automation system integrating refrigeration, HVAC, and lighting

---

### Defrost

- **ED** — Electric Defrost; heating elements melt frost; simple, high energy use; raises case temp 2–5°F during cycle
- **HG / Hot Gas** — Hot Gas Defrost; superheated compressor discharge redirected through evaporator; most efficient; melts frost from inside
- **Off-Cycle** — Compressor shuts down, natural warm-up melts frost; slow, only viable above 35°F box temp
- **RCD** — Reverse Cycle Defrost; 4-way valve inverts refrigerant flow; used in heat pump configurations
- **DoD** — Defrost on Demand (Adaptive Defrost); moisture/temperature sensors trigger defrost only when needed; saves 30–40% energy vs timer-based

---

### System Types & Configurations

- **Parallel Rack** — Multiple compressors piped to common suction and discharge headers; central machinery room; most common in supermarkets
- **Multiplex / Centralized** — Compressor racks in back room with refrigerant lines running to display cases on the sales floor
- **Secondary Loop / Indirect** — Primary circuit cools a secondary fluid (glycol/brine) that circulates to cases; no refrigerant on the sales floor
- **Cascade** — Two refrigeration cycles at different pressures; low-temp circuit (CO₂ or R-404A) cools the condenser of the high-temp circuit
- **Self-Contained** — All components (compressor, condenser, evaporator) in one sealed unit; no field piping; reach-ins, chest freezers
- **Pump Down** — Before compressor shuts off, liquid line solenoid closes and compressor evacuates low-side refrigerant to condenser/receiver; protects against migration during off-cycle
`

// ── Sporlan product knowledge base ──────────────────────────────────────────
export const SPORLAN_KNOWLEDGE = `
## Sporlan Product Knowledge — Supermarket & Commercial Refrigeration

![Parker Hannifin logo — Sporlan is a Parker Hannifin brand](https://upload.wikimedia.org/wikipedia/commons/9/9e/Parker_Hannifin.svg)

![Thermostatic expansion valve (TXV) cross-section](https://upload.wikimedia.org/wikipedia/commons/9/96/Thermostatic_expansion_valve.svg "TXV cross-section — Sporlan O/OB series operates on this same bulb-and-diaphragm principle")

### Thermostatic Expansion Valves (TXVs)

**Body families:**
- **O / OB series** — General-purpose TXV; most common in field; available in tons from 1/2 to 10 tons; external equalizer port (always pipe to suction line downstream of sensing bulb)
- **EG / EGVE series** — Bi-flow TXV; used in heat pump and reverse-cycle applications; can meter in both directions
- **Q / BQ series** — High-capacity valve for large evaporators; typically 10–50 tons; used on supermarket parallel rack circuits
- **NX series** — Non-adjustable (factory set) TXV; used in OEM equipment where field adjustment is not intended
- **W series** — Wide open on loss of charge; fails open to prevent liquid slugging in special applications
- **R series** — Replaceable power element; only the sensing element/power element is swapped, not the whole valve body

**Model number decoding (e.g., BEX 8-C/IAF-1/2):**
- First letters = valve family (B = B-series, EX = electronic)
- Number = nominal capacity in tons at ARI conditions
- Letter suffix = refrigerant designation (C = R-22, Z = R-404A/R-507, ZE = R-448A/R-449A)
- IAF = internal adjustment, external equalizer, flared connections
- Last fraction = orifice size (field-selectable on adjustable models)

**Critical TXV field notes:**
- **Sensing bulb placement:** Clamp firmly at 4 or 8 o'clock position on clean, bare suction line; wrap with insulation; NEVER on the bottom (oil pooling) or at a joint
- **External equalizer:** Must be piped downstream of the sensing bulb and upstream of the EPR — if piped upstream of EPR, the valve reads false pressure and overfeeds
- **MOP (Maximum Operating Pressure):** Some TXV power elements have MOP — limits valve opening at high suction pressure (startup, pull-down); check element spec if compressor overloads on startup
- **Superheat adjustment:** Clockwise = increases superheat; counter-clockwise = decreases; allow 15–20 min stabilisation between adjustments; target 6–12°F case superheat, 10–20°F rack return

---

### Electronic Expansion Valves (EEVs)

**Sporlan EEV families:**
- **SEI-0.5 through SEI-11** — Stepper motor EEV; **1,596 total steps** (0 = fully closed); 4-wire bipolar stepper; coil resistance ~23–47 Ω phase-to-phase
- **SEI-30** — Mid-capacity stepper EEV; **3,193 total steps** — sits between the small SEI (1,596) and the large SEI-50/SEH (6,386); same 4-wire bipolar motor family, same wiring; must be configured with 3,193 steps in the controller or the drive coupling will be stripped
- **SEI-50 / SEH series** — Large-capacity stepper EEV; **6,386 total steps**; same wiring as smaller SEI
- **SER / SERI series** — Refrigeration EEV for MT and LT; same 1,596-step motor family as small SEI
- **SEHI series** — High-capacity; 6,386 steps; used on large evaporators

**Sporlan EEV step count quick reference:**

| Model | Max Steps |
|---|---|
| SEI-0.5, -1, -2, -3.5, -6, -8.5, -11 | 1,596 |
| SEI-30 | 3,193 |
| SEI-50, SEH, SEHI | 6,386 |
| SER, SERI | 1,596 |

**EEV troubleshooting:**
- "Valve hunting" (suction pressure swings): superheat setpoint too tight; sensing lag; check bulb/transducer location
- Valve fully open but high superheat: valve undersized, refrigerant shortage, or clogged strainer/distributor
- Valve fully closed but flooding: failed valve (stuck open mechanically), wrong wiring polarity on stepper coil (A/B coil swap), or controller fault
- Check stepper resistance: disconnect valve; measure between pins — all four should read ~23–47 Ω across each winding; open winding = failed motor

---

### CDS / CDST Stepper Motor EPR Valves

**What they are:** Electrically driven evaporator pressure regulating valves (NOT "Case Differential Sensor"). CDS = pressure regulator with a stepper motor actuator controlled by the case controller (Micro Thermo, Danfoss AKC, etc.).

**Sizing reference:**
| Model | Nominal Capacity | Connection |
|---|---|---|
| CDS-2 | 2 tons | 1/2" ODF |
| CDS-4 | 4 tons | 5/8" ODF |
| CDS-7 | 7 tons | 7/8" ODF |
| CDS-9 | 9 tons | 1-1/8" ODF |
| CDS-16 | 16 tons | 1-3/8" ODF |
| CDS-17 | 17 tons | 1-5/8" ODF |

**Controller configuration (critical):** The case controller must be programmed with the correct **step count** matching the valve model. Step counts differ by frame size:
- **CDS-2, -4, -7** → **2,500 steps**
- **CDS-9, -16, -17** → **6,386 steps**

If programmed with the wrong count (e.g., entering 6,386 steps for a CDS-7), the controller will command the valve past its hard stop, strip the drive coupling, and show "invalid" indefinitely. Always verify step count in controller settings matches the specific valve model on the case before commissioning.

**Diagnosing "CDS invalid" on Micro Thermo / Danfoss:**
1. Check 4-wire cable from controller board to valve — inspect for moisture, chafed insulation, loose pins
2. Verify 24 VAC at the stepper driver board terminals
3. Measure motor windings at valve connector: **CDS-2/-4/-7 = ~100 Ω per phase; CDS-9/-16/-17 = ~75 Ω per phase**; open or short = replace valve motor assembly
4. Power-cycle the case controller to force valve re-initialization — listen for audible clicking (10–15 clicks) during init; no click = motor or driver board failed
5. If valve initialises but reading remains invalid: suspect the position feedback circuit on the driver board — replace driver board
6. Confirm step count setting in controller matches valve model (CDS-2/-4/-7 = 2,500; CDS-9/-16/-17 = 6,386)

---

### Solenoid Valves

**Series and applications:**
- **B series** — Brass body; direct-acting; 1/4"–3/4" connections; liquid, suction, or hot gas; most common general-purpose
- **E series** — Brass body; pilot-operated; for larger line sizes (7/8"–2-1/8"); requires minimum differential pressure to open (3–5 psi)
- **W series** — Forged steel body; CO₂-rated (up to 60 bar); required on CO₂ hot gas defrost lines
- **OLDR / DDR series** — Oil-drain return solenoids; small orifice; used in oil return lines from separator to crankcase
- **NC vs NO:** Normally Closed (NC) = closed when de-energised (standard for liquid lines); Normally Open (NO) = open when de-energised (used in bypass and safety circuits)

**Coil types:**
- **MKC-1** — 24 VAC/DC coil; standard replacement; fits B, E series
- **MKC-2** — 120 VAC coil; older systems; confirm voltage before ordering
- **Coil resistance check:** 24 VAC coil ~200–400 Ω; open coil (OL) = no magnetic pull; shorted coil (near 0 Ω) = trips breaker or blows fuse

**Common failures:**
- Sticking open: worn or scored piston/plunger, contaminated refrigerant (acid/moisture), debris on seat → replace internal kit or full valve
- Sticking closed: failed coil, no control voltage, wrong voltage coil installed, seized plunger (corrosion)
- Chatter/buzz: low voltage (check at coil terminals, not just panel), partial coil failure, loose coil retaining nut

---

### Catch-All Filter-Driers

**Series:**
- **C series** — Standard catch-all; replaces moisture, acid, and particulates; sizes 032 through 415 (nominal tons at ARI); solid core
- **RC series** — Replaceable core catch-all; shell stays in line; only the desiccant core is swapped; reduces downtime and refrigerant loss
- **RSF series** — Suction line filter-drier; used after a burnout to trap acid and carbon; NOT for permanent installation — remove after 72 hours and replace with standard suction line filter

**Desiccant core options:**
- **HH core** — Activated alumina + molecular sieve; standard for clean systems; high moisture capacity
- **XH core** — Molecular sieve only; for HFO refrigerants (R-448A, R-449A) and systems with very high moisture content; also required when system has been exposed to atmosphere

**Replacement criteria:**
- Pressure drop > 2 psi (0.14 bar) across the drier = replace immediately
- Sight glass shows bubbles (flash gas at the drier outlet = restriction)
- System has been open to atmosphere for more than a few minutes
- After a burnout: install RSF suction line filter + replace liquid line drier with XH core

---

### EPR Pressure Regulating Valves (Pilot-Operated)

**ORIT / OREO series** — Sporlan's standard pilot-operated EPR; holds downstream (evaporator outlet) pressure at setpoint; used on medium-temp cases to prevent freezing on shared MT/LT racks.

**ORIT adjustment procedure (with gauge manifold):**
1. Install compound gauge on evaporator outlet (downstream of ORIT)
2. Allow system to reach normal operation (10–15 min after case reaches setpoint)
3. Target pressure: convert case setpoint temperature to refrigerant saturation pressure (use PT chart) — e.g., R-404A at +20°F SST = ~57 psig
4. Adjustment: remove cap, turn adjusting stem clockwise to increase setpoint pressure (opens valve more, allows evaporator to run warmer); counter-clockwise to decrease
5. Allow 5–10 min stabilisation per adjustment step
6. Replace cap and verify case temperature at setpoint

**OROA** — Adjustable ORIT with external adjustment screw; no cap removal needed; used where frequent setpoint changes are expected.

**DDR / OLDR** — Differential pressure regulating valves; maintain a pressure differential across a component (e.g., oil separator) rather than an absolute pressure.

---

### See-All Sight Glasses

**SA series** — Moisture indicator sight glass; installed in liquid line upstream of expansion device.

**Color interpretation:**
- **Green** — Dry: moisture content acceptable; system is clean
- **Yellow / Gold** — Wet: moisture present; replace filter-drier immediately; do not delay (acid formation accelerates)
- **White / Cloudy** — System overloaded with moisture: immediate drier replacement required; inspect for open joints or flood-back damage

**Bubbles in sight glass:**
- Steady stream of bubbles = low refrigerant charge or filter-drier restriction causing flash gas
- Occasional bubbles at startup = normal (pressure equalisation)
- Clear glass with system underperforming = do not assume correct charge — check subcooling

---

### Distributors and Nozzles

**Purpose:** Distribute refrigerant equally to multiple evaporator circuits; without a distributor, some circuits starve and others flood.

**Selection methodology:**
1. Determine evaporator capacity (tons) and number of circuits
2. Select distributor body size to match TXV outlet connection
3. Select nozzle to match pressure drop target — nozzle creates intentional restriction to equalise flow across circuits

**Nozzle families:**
- **G series nozzles** — General purpose; most common; colour-coded by size (stamped on nozzle body)
- **C series nozzles** — For CO₂ and high-pressure refrigerants; rated to higher pressures

**Field notes:**
- Never use a distributor without a nozzle — circuits will not balance
- Nozzle pressure drop should be 15–40% of total TXV pressure drop; too small = poor distribution; too large = capacity loss
- Partially blocked nozzle shows as: some evaporator circuits frost up (those still getting flow), others are warm and have high superheat

---

### Sporlan Electronic Controls

**Kelvin II controller** — Electronic superheat controller for TXV replacement; uses electronic sensing to replace the mechanical sensing bulb and power element; allows remote superheat setpoint adjustment; compatible with SEI/SER EEV bodies.

**S3C case controller** — Sporlan's integrated case controller; manages: EEV superheat, case temperature, defrost scheduling (time or demand-based), and EPR valve position; communicates via RS-485; logs defrost history and alarm events.

**IB-G interface board** — Gateway board connecting S3C case controllers to building EMS/BMS systems; translates RS-485 to BACnet or Modbus; allows supervisory monitoring without replacing controllers.

---

### Discharge Bypass Valves

**ADRS / SDR series** — Discharge bypass valve; opens when suction pressure drops below setpoint to recirculate hot discharge gas back to the suction header; prevents compressor short-cycling at light loads; maintains minimum suction pressure.

**Setting:** Factory-set discharge bypass typically opens at 5–10 psig below normal minimum suction pressure; adjustable in field; must be set above LPCO cutout to avoid nuisance tripping.

---

### Check Valves

**CK series** — Standard check valve; spring-loaded disc; installed in discharge lines, oil return lines, and hot gas lines to prevent reverse flow; check cracking pressure (typically 1–5 psi) — too high causes pressure drop; too low allows reverse flow.

**CSOV (Check/Solenoid combination)** — Combines check function with solenoid shutoff; used in cases where both backflow prevention and positive shutoff are needed (parallel rack discharge manifolds).

---

### Common Sporlan Field Mistakes

1. **Piping external equalizer upstream of EPR** — causes TXV to read false (high) pressure and overfeed; always pipe equalizer downstream of EPR
2. **Wrong step count in controller for CDS/EEV** — strips drive coupling, causes permanent "invalid" alarm; verify step count matches valve model before commissioning
3. **Installing drier without moisture indicator** — no way to know when to change; always pair with a See-All
4. **Not replacing nozzle when changing TXV** — old nozzle may be wrong size for new valve capacity; always check nozzle selection
5. **Sensing bulb on bottom of suction line** — oil pools there, insulates bulb, causes false high temperature reading and overfeeding
6. **Using NC solenoid on oil return line** — oil can't return during off-cycle; use NO (normally open) for oil return so it stays open when de-energised
7. **Installing pilot-operated solenoid (E series) where there is no pressure differential** — pilot-operated valves need ≥3 psi differential to open; use direct-acting (B series) on low-pressure-drop circuits
8. **Leaving suction line filter-drier (RSF) installed permanently** — RSF is for post-burnout cleanup only (72 hr max); leaves it in = excessive pressure drop; creates ongoing capacity loss
9. **Replacing TXV without checking orifice size** — replacement valve in same family/capacity but wrong orifice size for the refrigerant or conditions; verify orifice designation in model number
10. **Charging through liquid line drier** — acids/particles from manifold hose end up in the drier and degrade it; always charge through a dedicated charging port or schrader downstream of the drier
11. **Running system without filter-drier after opening** — even brief air exposure adds enough moisture to cause acid formation within days; always install new drier after any open repair
12. **Ignoring sight glass colour change** — yellow sight glass is an urgent warning, not a "monitor and see" situation; acid formation is exponential once moisture is in the system

---

### Sporlan Troubleshooting Decision Tree

**High suction pressure (case overcooling):**
1. Is EPR valve (ORIT/CDS) present? → Check valve position; if stuck open: case runs at rack suction; verify CDS wiring/steps, test ORIT setpoint
2. Is LL solenoid stuck open? → Case runs continuously; check thermostat/controller call and solenoid voltage
3. Is EEV/TXV overfeeding? → Check superheat; if < 5°F with normal load, valve is overfeeding; check sensing bulb placement

**Low suction pressure (case undercooling):**
1. Check filter-drier pressure drop (> 2 psi = replace)
2. Check sight glass — bubbles indicate flash gas (low charge or restriction upstream)
3. Check EEV/TXV superheat — if > 20°F: valve not opening; check wiring/power element/orifice
4. Check distributor nozzle — partially blocked nozzle causes uneven frosting across circuits
5. Check refrigerant charge — low subcooling confirms undercharge

**Flooding / liquid slugging:**
1. EEV/TXV overfeeding — check superheat, sensing bulb placement, power element MOP
2. Defrost hot gas valve not closing — case fills with liquid during defrost; check HGV coil and controller
3. Refrigerant overcharge — check subcooling (> 20°F = likely overcharge)
4. Accumulator bypassed or failed — verify accumulator is in circuit and functional

**Flash gas in sight glass with normal charge:**
1. Filter-drier restriction — measure pressure drop; replace if > 2 psi
2. Liquid line undersized — pressure drop along the run causes flash gas; check line sizing vs. run length
3. Insufficient subcooling — condenser fan failure, fouled condenser, high ambient; verify fan operation and coil cleanliness`

// ── Copeland / Emerson compressor knowledge base ─────────────────────────────
export const COPELAND_KNOWLEDGE = `
## Copeland / Emerson Compressor Knowledge — Supermarket & Commercial Refrigeration

![Emerson Electric logo](https://upload.wikimedia.org/wikipedia/commons/5/50/Logo_Emerson.svg)

![Scroll compressor cross-section diagram](https://upload.wikimedia.org/wikipedia/commons/7/70/Scroll_scrollcrompressor.svg "Copeland ZB/ZF series uses a fixed and orbiting scroll design like this")

---

### Copeland Scroll Compressors — ZB / ZF Series

**Model number decoding (e.g. ZB38KQE-TFD-524):**
- **Z** = Scroll compressor
- **B** = Medium-temp refrigeration (evap −20°F to +45°F); **F** = Low-temp (evap −40°F to −20°F); **P** = A/C (R-410A); **D suffix** = Digital Scroll (ZBD / ZFD)
- **Number** = capacity index (e.g. 38 in ZB38 ≈ 3-ton class); **K** multiplier = ×1,000 BTU/hr
- **Generation:** K3 = older, K4, **K5 = current** (CoreSense Diagnostics standard on K5)
- **E** = POE oil (required for all HFC/HFO refrigerants); **L** = less oil (shipped dry)
- **Electrical after dash:** T = 3-phase, W = single-phase; F = 208–230V, Y = 575V (Canadian 3-phase standard), D = 460V (US), M = 200–220V/50Hz

**ZB vs ZF — critical difference:**
| | ZB (Medium-Temp) | ZF (Low-Temp) |
|---|---|---|
| Evap range | −20°F to +45°F | −40°F to −20°F |
| Liquid injection | Not typically required | **Mandatory** — required to control discharge temperature |
| DTC valve | Not standard | Required: sensing bulb in discharge well, meters liquid to suction port |

**Operating limits:**
- Recommended max discharge line temp (6 in. from compressor): **225°F (107°C)**
- Oil breakdown begins: **250°F (121°C)** — shut down and investigate immediately
- CoreSense trip (PT1000 sensor): **154°C / 309°F** — auto-resets when temp drops below ~134°C
- MAWP high side (R-404A/R-448A models): typically 450 psig — confirm nameplate

**ASTP (Advanced Scroll Temperature Protection):**
- Bimetal snap disc in the intermediate pressure cavity; trips at ~275–300°F internal temp
- What happens: intermediate cavity vents to suction → orbiting scroll separates → **compression stops but motor keeps running** (drawing low amps)
- Field symptom: compressor is running, suction and discharge pressures equalize, low amps, no refrigeration, compressor warm/hot to touch
- Reset: compressor must cool down (2–6+ hours); motor protector usually trips first
- **ASTP is not a system safety device** — repeated trips = system problem (low charge, blocked evap fans, high load, liquid line restriction)

**Liquid injection on ZF compressors:**
- DTC valve (thermostatic, dedicated to this compressor — never substitute a standard TXV) meters liquid from liquid line into suction port of compressor
- Sensing bulb MUST be in the correct discharge well — wrong placement = erratic or no injection
- Without liquid injection, a ZF on R-404A at −25°F evap will trip on high discharge temp within minutes

---

### Copeland Digital Scroll (ZBD / ZFD)

**How axial unloading works:**
- A solenoid-operated piston in the top cap moves the fixed (upper) scroll axially
- **Solenoid DE-ENERGIZED:** discharge pressure holds scroll DOWN → 100% capacity (full compression)
- **Solenoid ENERGIZED:** piston vents to suction → upper scroll lifts away → 0% capacity (motor still runs, no compression)
- Controller varies the on/off ratio in a **20-second PWM cycle** → stepless **10–100% capacity modulation**
- Blue LED (CoreSense): illuminates when solenoid is energized (unloaded state)

**Common Digital Scroll faults:**

| Symptom | Cause |
|---|---|
| Running, pressures equalized, low amps, no refrigeration | Solenoid stuck energized (unloaded) — verify voltage is cycling; if continuously on, replace solenoid |
| Running at 100% only, cannot modulate | Solenoid stuck de-energized — check control signal from rack controller to solenoid |
| Pressures equalized, solenoid cycling correctly electrically | Scroll mechanically stuck in unloaded position — oil migration in top cap or failed piston seal |

**Fail-safe behavior:** If controller loses signal to solenoid, compressor defaults to 100% (fully loaded) — intentional fail-safe.

---

### Copeland Reciprocating Compressors (Discus / Copelametic Semi-Hermetic)

**Model families:**
- **2D** (2-cyl, 2–5 HP), **3D** (3-cyl, 5–15 HP), **4D** (4-cyl, 8–30 HP), **6D** (6-cyl, 15–50 HP), **8D** (8-cyl, 30–60 HP)
- Older R-series: **3R, 4R, 4RA, 6R, 6RA** — same cylinder-count prefix, discontinued but widely in service
- "Discus" = one-piece valve plate design (NOT individually serviceable reed valves)

**Model number prefix decode:** Number = cylinder count; D = Discus valve; N = no unloaders; R = with unloaders; electrical suffix same convention as scroll (TYD = 3-phase 575V Canadian standard; TFD = 3-phase 460V US)

**Cylinder unloading — critical field knowledge:**
- Each unloader holds the suction valve off its seat so the cylinder draws gas but cannot compress it
- **Solenoid DE-ENERGIZED = UNLOADED** (spring holds plunger up) — fail-safe to minimum capacity
- **Solenoid ENERGIZED = LOADED** (oil/solenoid force releases suction valve — cylinder pumps)
- If a solenoid coil burns out, that cylinder goes to unloaded (fails safe, not to full capacity)
- Rack controllers typically start compressors with unloaders energized (loaded) after 5–30 sec delay

**Capacity steps:**
- 3D: 67% / 100%; 4D: 50% / 75% / 100%; 6D: 33% / 50% / 67% / 100%; 8D: 25% / 50% / 75% / 100%

**Valve plate service:**
- Discus valve plate is a one-piece assembly — replace entire plate, do not attempt to service individual reeds
- Head bolt torque: **44 ft-lbs (60 N·m)** standard 3/8-16 grade 8 — use crisscross pattern, 70% first pass then full torque; retorque after first thermal cycle
- After replacement: inspect bore for scoring, replace head gasket (never reuse), flush oil (valve fragments contaminate)

**Oil sight glass:**
- Correct operating level: **1/4 to 3/4 full** during steady-state operation; ideal target = 1/2
- Foaming at startup = refrigerant migration dissolved in oil boiling off — crankcase heater likely not working
- Oil type: R-22 → alkylbenzene or mineral (150 SUS); R-404A/R-448A/R-449A → **POE mandatory** (ISO 150 MT, ISO 220 LT); never mix POE and mineral

**Common failure modes:**

| Symptom | Cause | Diagnosis |
|---|---|---|
| Running, high suction, low/soft discharge pressure, low amps, **no temperature difference across compressor** | Valve plate failure | Pump-down test: good compressor spikes discharge immediately; failed valve won't build pressure |
| Deep metallic knock, louder under load, disappears fully unloaded | Rod knock / bearing failure | Remove from service immediately; internal mechanical failure |
| Oil foaming violently at startup, low crankcase level | Refrigerant migration; crankcase heater failed | Check heater; require 12-hour heat soak before restart |
| Oil weeping from front of compressor | Crankshaft seal leak | Replace shaft seal kit |
| Motor protector tripping repeatedly | Electrical overload or winding fault | Megohm test; winding balance; check voltage and amp draw |

---

### Motor Winding Testing

**Insulation resistance (megohm test) — 500V DC megohmmeter:**
- Test each terminal (T1, T2, T3) to compressor shell
- **>100 MΩ** = good; **60–100 MΩ** = marginal; **<20 MΩ** = failed; **near 0 MΩ** = grounded/burnout
- Test cold (more sensitive); warm test should show HIGHER resistance — if it drops when warm, moisture is present

**Winding balance test — low-ohm meter:**
- Measure T1–T2, T2–T3, T1–T3
- All three should be **equal within ±5–10%**
- Open winding (∞): winding failed open; shorted winding (one leg much lower): partial burnout

---

### Burnout Cleanup (Summary)

1. Pull oil sample before recovery — acid test (Emerson Universal Acid Alert or equivalent)
2. Recover refrigerant; remove failed compressor
3. Flush piping; install oversized liquid line drier (2–3× normal) + temporary suction line filter (RSF or equivalent, acid-neutralizing core)
4. Replace: liquid line drier, oil separator (drain/inspect), check valves in discharge stream
5. Install replacement compressor with correct POE oil; evacuate to 500 microns
6. Run 4 hours; recheck oil at 24 hr and 48 hr; repeat drier changes until acid test is negative and oil is clear
7. Mild burnout: 1–2 drier changes over 1–2 weeks; severe burnout: 3–5 changes over 4–6 weeks

---

### CoreSense Diagnostics Module (K5 Scroll / Discus)

Mounts to compressor terminal box. Replaces external motor protector; adds discharge temp protection, phase loss/imbalance detection, locked rotor detection, MODBUS communication to E2/E3 controller.

**LED colors:**
- **Solid GREEN** = normal operation
- **Flashing GREEN** = alert (non-protective warning, compressor still running)
- **Flashing YELLOW** = trip (auto-reset when condition clears)
- **Flashing RED** = lockout (manual reset required — cycle control power)
- **BLUE (Digital Scroll only)** = solenoid energized (unloaded)

**Flash codes — Scroll (AE81424):**

| Flashes | Color | Condition | Action |
|---|---|---|---|
| 1 | Yellow | Motor protector open (internal overload) | Allow 30–90 min cooldown; check condenser, voltage, discharge temp |
| 2 | Yellow | High discharge temperature (>154°C / 309°F) | Check refrigerant charge, evap fans, DTC valve (ZF), condenser |
| 3 | Yellow | Pressure switch cycling (high or low pressure) | Dirty condenser (HP), or low charge / frosted evap (LP) |
| 4 | Yellow/Red | Locked rotor / failed to start | Check supply voltage, contactor, capacitors; check for tight mechanical |
| 5 | Yellow | Sustained abnormal operation / running loss of charge | Check refrigerant charge |
| 6 | Red | Open circuit / control circuit fault | Check wiring, contactor coil, safety switches in series with control circuit |
| 7 | Red | **Reverse phase / phase loss / phase imbalance** | **Always a lockout (manual reset)** — check all 3 phases; swap two legs for reverse phase |
| 8 | Yellow | Low discharge superheat / liquid slugging | Check TXV/EEV superheat, sensing bulb, low ambient, defrost timing |

**Discus CoreSense (v2.11) adds:** Oil pressure differential monitoring (minimum 9–15 psi differential); 120-second delay after start before oil fault is active; MODBUS to E2 reports discharge temp, oil differential, and trip history.

---

### Emerson E2 / E3 Rack Controller

**What it manages:** Compressor staging for up to 4 suction groups, circuit defrost scheduling, condenser fans, system alarms, floating setpoint energy optimization, MODBUS/BACnet communication.

**Alarm log access:** MENU → Alarms → Active alarms or Alarm History; press Enter on any alarm for details; F1 to acknowledge.

**Point status / manual override:** MENU → Configured Applications → [Suction Group] → Status → override individual compressor stage (Force ON / Force OFF / Return to Auto). **Always return to Auto after service** — overrides persist through power cycles on some firmware.

**Common E2 alarm messages:**

| Alarm | Meaning | Common causes |
|---|---|---|
| SUCTION HIGH PRESSURE | Suction > high limit | Compressor failure, all stages off, liquid bypass |
| SUCTION LOW PRESSURE | Suction < low limit | Low charge, service valve partially closed, all cases in defrost |
| OIL FAILURE | OMB/OMC oil fault | Low oil level, foaming (crankcase heater issue), failed fill solenoid, OMB wiring fault |
| PROOF OF FLOW FAILURE | Stage commanded ON but didn't confirm | Compressor not starting, contactor failed, CoreSense lockout |
| DEFROST TERM BY TIME | Defrost ended on failsafe time | Termination sensor failed, heater failed, coil not defrosting |
| COMPRESSOR FAULT | External fault input tripped | Overload relay, CoreSense trip, manual trip |
| PHASE LOSS / BROWN-OUT | Power quality fault | Utility issue, blown fuse, failed contactor leg |

**Suction setpoint key parameters:** Setpoint PSI, Deadband (±1–2 PSI typical), Stage On/Off Delays (60–180 sec typical). Floating setpoint: raises suction pressure when all cases are satisfied (energy saving); lowers when any case is struggling.

**Defrost key parameters:** Type (Electric / Hot Gas / Off-Cycle), number per day (1–8 MT, 3–6 LT), termination setpoint (50°F MT coil, 55°F LT), failsafe time (30 min MT, 45–60 min LT), drip time (5–15 min fan-off after heaters off).

---

### Emerson OMB / OMC Oil Level Controllers

Replaces compressor oil sight glass. Controls oil fill solenoid and signals E2 on oil fault.

| | OMB | OMC |
|---|---|---|
| Sensing | Hall-effect float (moving parts) | Capacitive (no moving parts) |
| Foaming susceptibility | Low | Moderate |

**Operation:** Oil drops below ½ sight glass → 10 sec delay → fill solenoid opens. If oil doesn't recover within ~2 min → alarm output → E2 "OIL FAILURE."

**LED:** Green = OK; Yellow = filling; Red = fault (alarm active)

**Common causes of false oil faults:**
- **Oil foaming at startup** — refrigerant migration; crankcase heater not working; OMC reads foam as low oil
- **Fill solenoid stuck closed** — no oil can enter; verify solenoid energizing and opening
- **Oil reservoir/separator depleted** — source of oil supply is empty
- **OMB Hall-effect contaminated by metal particles** — steel debris sticks to float magnet; reads falsely low
- **Wiring fault** — loose NC terminal at E2 input holds alarm open even with normal oil level; bridge terminal to test

---

### Copeland Field Rules of Thumb

- **Discharge line temp:** Target 150–200°F; investigate >225°F; shut down >250°F
- **Oil sight glass:** Operate at 1/4 to 3/4 full; ideal = 1/2; never run empty; foaming at startup = crankcase heater issue
- **Crankcase heater:** Must be energized **minimum 12 hours** before startup after any prolonged shutdown; always wired live (not switched with compressor contactor)
- **Rebuilt reciprocating compressor break-in:** Run at minimum load (maximum unloaders on) for 30–60 min before loading to full capacity; monitor oil level, amps, discharge temp
- **Oil change on refrigerant retrofit** (R-22 → R-407A/C/F or R-404A → R-448A/R-449A): Full POE oil flush required; verify compressor model is approved for new refrigerant; ZF DTC valve bulb charge must be compatible with new refrigerant family`

// ── Hussmann display cases and rack systems knowledge base ───────────────────
export const HUSSMANN_KNOWLEDGE = `
## Hussmann Product Knowledge — Display Cases & Rack Systems

![Commercial supermarket refrigerated display cases](https://upload.wikimedia.org/wikipedia/commons/a/af/Cold_Storage_Cabinets.jpg "Commercial refrigerated display cases — Hussmann RL, RM, and FW series are installed in configurations like this")

---

### Display Case Model Families

**Reach-In Low Temperature (Frozen Food) — RL / RLN series:**
- **RL** — Standard depth; INNOVATOR I or III glass doors; 5 rows of 22" shelves per door
- **RLN** — Narrow (4" shallower bumper-to-back than RL); same product cube; RLNI = with INNOVATOR doors
- **RLN-SP / RL-SP** — Self-contained R-290 (propane); no remote refrigeration; 2–5 door configurations
- **RLTM** — Triple-deck medium temp variant of same family

**Reach-In Medium Temperature (Dairy/Deli/Beverage) — RM / RMN series:**
- **RM** — Standard depth medium temp; glass door, multi-shelf
- **RMN** — Narrow medium temp; RMN-W = self-contained propane, water-cooled condenser rejection

**Frozen Food Island / Coffin Cases — FW / FWG / FWE / LI / LWE family:**
- **FW** — Open island, no glass; **FWG** — Open island with glass front panels
- **FWE** — End section for FW lineups; **FWEG** — End with glass; **FWEL** — End with sliding glass lid
- **LI** — Narrow single-deck island; **LWE** — Wide island end; **LWU/LWUG** — Unitized wide island (G = glass front)
- Evaporator fans: 2 fans per 4–6 ft section, 4 fans per 8–12 ft section; typically 4W shaded-pole or ECM
- Glass lids (sliding) reduce case energy 40–60% vs. open operation — common retrofit

**Model number suffixes:**
- **N** = Narrow; **G** = Glass front; **E** = End section; **W** = Wide or water-cooled; **L** = Lid; **I** = INNOVATOR door; **SP** = Self-contained propane; **U** = Unitized

---

### Defrost Types — Hussmann Specific

| Code | Name | How it works |
|---|---|---|
| **E** | Electric | Resistance heaters in coil; drain pan electric heater |
| **KGE** | KoolGas + Electric pan | **2-pipe** hot gas; taps **saturated vapor from receiver top** (NOT superheated discharge); lower, controlled defrost temp; drain pan electric |
| **KGG** | KoolGas + KoolGas pan | 2-pipe; both coil and drain pan defrosted via KoolGas |
| **HGE** | Hot Gas + Electric pan | **3-pipe** conventional hot gas from discharge; drain pan electric |
| **HGG** | Hot Gas + Hot Gas pan | 3-pipe; drain pan via hot gas |

**KoolGas is not the same as standard hot gas defrost.** KoolGas taps the liquid receiver vapor space (saturated, ~90–100°F), not the superheated discharge gas (~200°F+). This prevents thermal shock to the coil and reduces the refrigerant surge on the suction side at defrost end. If a case is labeled KGE, use 2-pipe KoolGas procedures — do not treat it as a 3-pipe hot gas system.

**EPR bypass solenoid:** Hussmann parallel racks install a bypass solenoid around the EPR valve. This solenoid energizes during the **drip cycle** (after active defrost ends) to control refrigerant return rate. This is intentional by design — do not confuse a bypassed EPR during drip cycle with a defrost fault.

---

### Anti-Sweat Heaters — DASH Controller

- **INNOVATOR I door cases:** Equipped with a **DASH controller** (Door Anti-Sweat Heater) that modulates door frame heater duty cycle based on store humidity; must have continuous 120V supply; **do NOT connect to a centralized anti-sweat system simultaneously**
- **INNOVATOR III door cases:** DASH controller is NOT installed — INNOVATOR III uses a different integrated door design; do not expect to find a DASH board on these cases
- Heater wattages: return glass ~16W/120V; nosing ~31W/120V; joining kit ~48W/120V
- Common failure: heater wire breaks at door hinge pivot (repeated door opening fatigues wire) — check hinge area on every reach-in door before condemning the DASH board

---

### Fan Delay & Defrost Limit Thermostats

- **Fan delay thermostat:** Opens at ~20°F, closes at ~35°F (post-defrost; fans off until coil is below frost temp to allow drip-down). If fans won't restart after defrost, this is the first check.
- **Defrost limit thermostat:** Opens at ~90°F internal air temp during defrost (safety limit to prevent product thaw). Opens = terminates defrost early. Fails closed = defrost always runs to failsafe time.
- **Defrost termination thermostat (coil):** Typically set to terminate at ~50–55°F coil temp for reach-in frozen cases.

**Common part numbers:**
| Part | P/N | Spec |
|---|---|---|
| Fan motor (standard EE) | 0435101 | Most RL/RLN/RM applications |
| Fan blade 8" CW | 0315470 | Use with 0435101 |
| Drain pan heater RL-5 | 0387031 | 300W, 120V, 134" tubular |
| Drain pan heater RL-5 KoolGas | 0387039 | KoolGas variant |
| Fan delay/defrost term thermostat | 3198087 | 55°F–35°F, 3-wire |
| Heater limit thermostat | 3198088 | 75°F–40°F, 2-wire Klixon |

---

### Evaporator Coil Field Check (Open Multi-Deck Cases)

1. Remove return air grille (front bottom, typically clips/screws); inspect coil with flashlight
2. **Frost patterns:**
   - Uniform frost, not clearing → defrost not initiating or heaters failed
   - Bottom frosted, top clear → starved coil (low charge, TXV stuck, or distributor blockage)
   - Top frosted, bottom clear → TXV flooding (over-feeding)
   - Isolated section frosted → that circuit's distributor tube blocked
3. Target superheat at case: ~4–8°F (open multi-deck); measure at suction line access port at the case
4. Verify airflow: tissue paper or smoke pencil at discharge grille confirms air curtain direction (should flow down through product zone, return at bottom)
5. Check drain: remove drain plug at case bottom; blocked drains cause drain pan ice that eventually frosts the coil from below
6. Design ambient condition: **75°F / 55% RH maximum** — measure store conditions first before diagnosing refrigeration issues; cases will sweat and frost progressively in high-humidity stores

---

### Common Case Faults

**Open case sweating / condensation:**
1. Store humidity above 55% RH — measure with hygrometer; HVAC dehumidification likely failed
2. Defrost not completing (frost building on coil, disrupts air curtain)
3. Air curtain disrupted: dirty/damaged honeycomb grille, overstocked shelves, missing shelf dividers
4. Anti-sweat heaters failed (mullions/glass frames cold to touch; moisture condenses)

**Reach-in door sweating / fogging:**
- Broken heater wire at hinge: open-circuit; door frame cold — test continuity at heater terminals
- Failed DASH controller: heaters off entirely or full-on — check 120V supply, then DASH output
- Cracked insulated glass seal (fogging between panes): replace the full IGU (glass door unit), not serviceable

---

### Hussmann Parallel Rack Systems

**Configuration:**
- Multiple compressors on common suction/discharge headers; designed per store BTU load
- Typical: 1 MT suction group + 1 LT suction group per rack; naming convention **"Rack A High" (AH)** = MT, **"Rack A Low" (AL)** = LT
- One rack can have 3+ suction groups (e.g., produce at +35°F SST, meat at +15°F, ice cream at −25°F)
- Compressors: Copeland semi-hermetic or scroll (Hussmann specifies Copeland as primary)
- Controller: **Emerson E2** (standard on all Hussmann parallel racks); Danfoss AKC case controllers (AK-CC55, AK-CC250, AK-CC550) at individual case level via RS-485 bus

**Oil management:**
- Oil separator on discharge line → oil reservoir → differential pressure return to compressor crankcases
- Return valve: **Sporlan Y-825-2** differential return valve is Hussmann's standard rack oil return valve
- If compressors run consistently low on oil: check oil separator efficiency and Y-825-2 operation before adding oil

---

### Hussmann Protocol Family — Distributed Rack Systems

Protocol is Hussmann's distributed refrigeration system — smaller rack modules placed close to or inside the cases they serve, eliminating the traditional machine room.

| System | Location | Refrigerant | Notes |
|---|---|---|---|
| **Protocol HFC/HE** | Indoor | R-448A, R-449A | Standard distributed; 50–75% less piping than parallel rack |
| **Protocol SPI/SPO** | Indoor/Outdoor | HFCs | SPI = overhead mounting near cases; SPO = outdoor rated |
| **Protocol CO₂** | Indoor | R-744 | Industry-first MT scroll with vapor injection; iron/copper piping; XP Pro Pack controller |
| **Protocol A2L** | Indoor | A2L refrigerants | Integrated advanced leak detection; for new builds |
| **Proto-Aire** | Outdoor | HFCs | Outdoor air-cooled; integral condenser; weatherproof |
| **Proto-Aire EZ** | Outdoor | HFCs | 3–4 scrolls; digital scrolls for MT; 25%+ energy improvement |

**Protocol vs. parallel rack — key differences:**
- Protocol refrigerant charge: 80–275 lbs per unit vs. 1,200–1,800 lbs for a traditional parallel rack
- No dedicated machine room required; installs in or adjacent to cases
- Controller: **Protocol Control System (PCS)** on older Protocol racks; **XP Pro Pack** (touchscreen, Copeland) on Protocol CO₂; E2 on HFC variants
- Field note: if servicing a Protocol rack, confirm controller type before attempting E2 navigation — PCS has completely different menus

---

### Hussmann CO₂ Systems

- **Transcritical CO₂ rack** — Hussmann-manufactured (not sourced); built at Suwanee, GA plant; LT compressors discharge into MT suction header (booster configuration); gas cooler instead of condenser; operates subcritical below ~25°C ambient
- **CO₂ Cascade rack** — Subcritical CO₂ only on LT circuit; primary HFC circuit cools the CO₂; lower complexity than full transcritical
- **Pumped liquid CO₂** — CO₂ pumped as liquid secondary fluid to case evaporators; HFC primary stays in machine room; dramatically reduces HFC charge on sales floor
- **Protocol CO₂** — Distributed Protocol architecture with R-744; indoor; small charge; iron/copper piping acceptable

---

### Refrigerant Quick Reference

| Refrigerant | Application | Status |
|---|---|---|
| R-404A | Legacy LT/MT rack | Being phased down; GWP 3,922 |
| R-448A / R-449A | Current HFC replacement for R-404A | Primary Hussmann rack refrigerants |
| R-290 (propane) | Self-contained cases (RLN-SP, microDS) | ≤150g charge; factory pre-charged; **not field-rechargeable** |
| R-744 (CO₂) | Transcritical racks, Protocol CO₂, cascade, pumped liquid | GWP=1 |
| A2L blends (R-454B) | Protocol A2L systems | Mildly flammable; integrated leak detection required |

**R-290 self-contained cases:** Charge ≤150g; hermetically sealed at factory. If a propane self-contained case loses charge (refrigerant leak), the sealed refrigeration module must be **replaced**, not recharged in the field.

---

### Serial/Model Plate Location & Parts Resources

- **Reach-in cases (RL/RLN/RM):** Serial plate inside the **return air channel, front left corner** — shine a flashlight through the return air grille
- **Island cases (FW/LWE):** Inside end panel or left interior wall
- **Rack:** Right end panel facing service aisle; individual compressor nameplates on each compressor

**Parts lookup (always use serial number):**
- **parts.hussmann.com** — Hussmann Performance Parts; search by serial or part number
- **bom.hussmann.com** — Enter serial number for complete factory bill of materials for that exact unit
- **hussmann.com/aftermarket-parts-lists** — PDF replacement parts lists by model
- Hussmann tech support: **1-800-922-1919** | Parts: **1-855-487-7778**
- Third-party: Parts Town (partstown.com/hussmann), CaseParts.com`

export const DANFOSS_KNOWLEDGE = `
## Danfoss Product Knowledge — Supermarket & CO₂ Refrigeration

![Danfoss logo](https://upload.wikimedia.org/wikipedia/commons/f/f2/Danfoss-Logo.svg)

---

### Store Controller Network — AK-System Manager

**AK-SM 800A / AK-SM 850A (Store Manager):**
- Central HVAC/R monitoring and control platform for entire store
- **AK-SM 800A** — up to 150 generic points, 8 RS-485 networks, Ethernet/IP; standard for most supermarket installations
- **AK-SM 850A** — expanded capacity (200+ points), enhanced CO₂ pack control, dual Ethernet; required for full CO₂ transcritical stores
- Network topology: up to 8 RS-485 bus lines (address 1–60 per bus); case controllers, pack controllers, I/O modules, and HVAC units all live on the same bus
- Navigation: Home → System → Configuration → Controllers shows all connected nodes; check bus/address against label on controller board for any comm fault
- Common fault: "Communication Alarm" on a node — check 24V power at the controller, verify termination resistors at both ends of the RS-485 bus (120Ω), confirm address switch matches AK-SM config
- Remote access via AK-SM web interface (port 80 or 443); field engineers use "Service Tool" (Danfoss AK-ST 500 software) for deep configuration
- **AK-SC 255** — older generation store controller (predecessor to 800A); still common in legacy stores; similar RS-485 architecture but limited to fewer nodes; menus differ significantly from 800A

---

### Pack Controllers — AK-PC Series

| Model | Application | Notes |
|---|---|---|
| **AK-PC 781** | HFC parallel rack (basic) | Up to 4 compressors; fixed or variable capacity; step control |
| **AK-PC 782** | HFC parallel rack (advanced) | Up to 6 compressors; VFD lead compressor; unloaders; liquid injection |
| **AK-PC 783** | CO₂ transcritical rack | HP valve control, gas cooler fan staging, flash tank level, booster+main compressors |
| **AK-PC 785** | CO₂ transcritical advanced | Full transcritical/subcritical mode switching; parallel compression option |

**AK-PC 783/785 CO₂ specifics:**
- **HP setpoint** — user-adjustable target high-side pressure; default ~90 bar; optimizes via gas cooler outlet temp × multiplier algorithm
- **Flash tank level** — 4–20 mA signal from float sensor; low level alarm = starved main compressors; high level alarm = flood risk
- **Subcritical/transcritical switchover** — automatic based on gas cooler outlet temp vs. critical point; transition can cause brief pressure hunting — normal
- **Parallel compression solenoid** — AK-PC 785 controls parallel compressor staging to reclaim flash gas work; if parallel comp trips, rack continues in standard booster mode
- **Emergency mode** — if pack controller loses power or communication, compressors fall back to pressure switches (safety operation only)

---

### Case Controllers — AK-CC Series

| Model | Application | Notes |
|---|---|---|
| **AK-CC 55E** | Single case / small multi-deck | 1 suction group; thermostat + defrost; RS-485 |
| **AK-CC 210A** | Multi-deck open case | Up to 4 probe inputs; EEV output (AKV/CCMT); adaptive defrost |
| **AK-CC 250A** | Advanced multi-deck / reach-in | 2 EEV outputs; night blinds control; door alarm; data logging |
| **AK-CC 550A** | Coordinated case group (Danfoss CRC) | Up to 10 circuits per controller; coordinates defrost across a lineup |

**Common AK-CC alarm codes:**
| Code | Meaning | Field action |
|---|---|---|
| **S1 alarm** | Return air probe (S1) fault — open or short | Replace probe; check wiring at screw terminal |
| **S2 alarm** | Air off probe (S2) fault | Same as S1 |
| **S3/S4 alarm** | Coil/liquid line probe fault | Check probe immersion in well; verify resistance ~10kΩ at 77°F |
| **Defrost alarm** | Defrost ran to max time limit | Check heaters (electric) or hot gas flow; verify termination probe placement |
| **EEV alarm** | EEV motor steps lost / valve not responding | Power cycle; re-initialize valve (AKV: 5V pulse; CCMT: 12V pulse); replace if recurring |
| **Night setback alarm** | Case temp rose above setback limit during store close | Check if night blinds deployed; verify supply air temp at night setback |
| **Door alarm** | Door open >X minutes | Magnetic switch on door; check for obstructed door or failed switch |

---

### Electronic Expansion Valves

#### AKV — Standard HFC/HFO EEV
- Pulse-width modulated solenoid (NOT stepper motor) — fully open or fully closed, modulated by duty cycle
- **Rated for HFCs and HFOs only — NOT rated for CO₂ high-pressure (>45 bar); do NOT install AKV on CO₂ high-pressure circuits**
- Coil: 24V DC; removable without losing refrigerant (coil snaps off)
- Initialization: on power-up, AKV pulses fully open then fully closed to confirm operation
- Common fault: AKV coil burned from 24V applied continuously (wiring error) — replace coil only; valve body typically survives
- Sizing codes: AKV 10, AKV 15, AKV 20 — larger number = larger Cv

#### CCMT — CO₂ Stepper Motor EEV
- **The standard EEV for CO₂ transcritical and subcritical MT/LT cases**
- Stepper motor; 480 steps (0–480); fully closed at 0 steps
- Pressure/temperature rated to 130 bar; designed for R-744 working pressures
- Wiring: 6-wire stepper (A+, A−, B+, B−, power, common); connect to AK-CC 210A/250A or dedicated CCMT driver
- CCMT sizes: CCMT 2 (small), CCMT 6 (medium), CCMT 12 (large, multi-deck cases)
- **Do not use AKV as a drop-in replacement for CCMT** — different drive signal; AKV coil will burn if driven by stepper output
- Superheat target on CO₂ cases: 4–8°F at case; controller auto-adjusts
- Initialization after replacement: power cycle; controller sends homing sequence (full close → defined step count); verify step count in AK-CC service menu

#### ETS / ETSH — Compact Stepper EEV (HFC)
- Stepper motor; 480 steps; smaller body than CCMT; used on smaller HFC circuits
- **ETSH** = High-pressure version (rated to 46 bar); suitable for CO₂ **subcritical** low-side only — NOT transcritical high-side
- Common in Danfoss Booster MWT rack circuits on LT branch

---

### ICM / ICMTS / ICAD Actuator — Motorized Regulating Valve

- **ICM** — Large-body motorized seat valve; bodies sized 20–150 mm; used as HP gas cooler pressure valve, liquid line shutoff, or bypass valve on CO₂ racks
- **ICMTS** — ICM body rated for transient CO₂ pressures (burst disc protection); used specifically as **gas cooler pressure control valve** in transcritical systems; replaces older HPV designs
- **ICAD 600A / ICAD 1200A** — Electric actuator that mounts on ICM body; 24V DC; 0–10V or 4–20 mA control signal from AK-PC 783/785; 600A = 15 Nm, 1200A = 30 Nm torque
- **HP control loop:** AK-PC sends 4–20 mA → ICAD 600A → ICM valve position; loop target = optimal HP setpoint based on gas cooler outlet temp
- Common fault: ICAD 600A "position feedback error" — check 24V power supply, verify 0–10V control signal present; ICAD gear strip if valve body seized (corrosion or contaminated refrigerant)
- If HP keeps hunting: check gas cooler fan staging (fans not coming on = GC outlet too warm = HP overshoots), or ICM valve body worn (leaking past seat at low flow)
- **Removing ICAD:** loosen the two mounting screws; actuator lifts off without disturbing the valve body or losing charge — no pump-down required to replace actuator

---

### ICS Valves — Servo/Pilot-Operated Regulating Valves

- Modulating regulating valves (pressure regulator, back-pressure, gas bypass) using a pilot valve to modulate a large-body main valve
- **ICS body** + pilot valve insert: the body is common; pilot valve type determines function:
  - **ICS + ICSH** — High-pressure servo; used for CO₂ HP gas bypass (flash gas bypass valve, economizer bypass)
  - **ICS + PMLX** — Pilot-operated back-pressure regulator; maintains upstream (suction) pressure minimum
  - **ICS + CVP** — Constant pressure regulator; used as EPR or suction group pressure setpoint holder
- Sizes: DN25 to DN100 (1" to 4"); CO₂-rated; body withstands 130 bar
- **Common misdiagnosis:** ICS valve stuck open looks identical to a failed compressor — system suction pressure equals discharge pressure, no capacity. Always check ICS valve position (manual override screw) before condemning compressors.
- Manual override: clockwise = open; counterclockwise = allow pilot control; always return to auto after testing

---

### EVR Solenoid Valves — Standard Refrigerant Solenoids

- Normally-closed (NC) pilot-operated solenoid; opens when coil energized
- **EVR 2 / EVR 3 / EVR 6 / EVR 10 / EVR 15 / EVR 20** — sizing by Kvs flow coefficient
- Coil: 24V AC/DC or 120V; removable without losing charge (coil and stem lift off; body stays)
- CO₂ rating: standard EVR body rated to 45 bar; **for CO₂ high-pressure use EVRA or EVRAT series** (rated 130 bar with reinforced body and stem)
- **EVRA** — CO₂-rated NC solenoid; most common on CO₂ liquid feed lines
- **EVRAT** — CO₂-rated with thermal actuator; used where electrical solenoid signal unavailable
- Common fault: EVR coil hums but valve doesn't open — minimum differential pressure required for pilot-operated opening (~0.5 bar); check system pressures. If pressure differential exists but valve won't open: core stuck, replace body.
- Test: energize coil by hand (hold coil wire to 24V supply) and listen for click; no click = coil open circuit; click but no flow = body fault

---

### KVP / PM / AVTA — Pressure Regulating Valves

**KVP — Evaporator Pressure Regulator (Back-Pressure Valve):**
- Maintains upstream (suction side) pressure above setpoint; prevents case from over-cooling below design SST
- Spring-adjustable; range typically −10 to +60 psig; set per case design suction temp
- Common in produce/deli cases to hold SST +20 to +28°F while connected to a lower-temp suction group
- Diagnostic: if case is too warm despite normal liquid feed, KVP may be set too high or stuck closed → measure pressure upstream vs. setpoint with manifold

**PM / PM2 — Pilot-Operated Back-Pressure (High Capacity):**
- Same function as KVP but larger body for high-flow circuits; pilot valve adjusts main disc
- PM2 = with manual override; used as compressor suction stop valve or EPR on large lineups

**AVTA — Thermostatic Back-Pressure Valve:**
- Opens when refrigerant (suction) temperature falls below setpoint; holds SST at design minimum
- Common in Hussmann/Hill Phoenix cases on MT suction groups with electric defrost

---

### Pressure/Temperature Sensors — AKS Series

| Model | Type | Range | Notes |
|---|---|---|---|
| **AKS 32** | Pressure transmitter (HFC) | 0–300 psi | 4–20 mA; 1/4" flare; suction/discharge monitoring |
| **AKS 33** | Pressure transmitter (CO₂) | 0–1500 psi (0–103 bar) | 4–20 mA; rated for transcritical CO₂ HP side |
| **AKS 38** | Pressure transmitter (CO₂) | 0–2000 psi (0–138 bar) | 4–20 mA; HP gas cooler outlet; highest pressure rating |
| **AKS 21** | Temperature sensor | −40 to +150°F | PT1000 or NTC10kΩ; used at gas cooler outlet |
| **AKS 11** | Temperature sensor | −50 to +60°C | NTC; case air probes, coil probes |

**CO₂ sensor selection rule:** Use AKS 33 on intermediate/MT side (up to 55 bar working); use AKS 38 on HP gas cooler outlet/HPV inlet (up to 100+ bar working). Using AKS 32 on CO₂ high side will result in sensor rupture — never substitute.

**Wiring:** All AKS transmitters: Brown = 24V+; Blue = GND; Black = 4–20 mA signal. Verify 24V supply before condemning sensor.

---

### CO₂ Safety Components

**SFA / SVA Relief Valves:**
- **SFA** — Single-port safety relief; CO₂-rated; set pressures 150–165 bar (2175–2393 psi); required by code on every CO₂ pressure vessel
- **SVA** — Stop valve (isolation); used in pairs with SFA for in-service valve replacement (one always in-service while the other is isolated)
- ASHRAE 15 requires dual-relief arrangement on CO₂ racks — never run a CO₂ rack with only one functional relief valve
- Relief valve discharge: must be piped outdoors (CO₂ displaces oxygen — asphyxiation hazard in machine rooms at >5,000 ppm)

**Burst Disc:**
- Second-level protection upstream of relief valve; ruptures at 160+ bar if relief valve fails to open
- Inspect annually; replace after any high-pressure event even if not visibly ruptured (metal fatigue)

**CO₂ Leak Detection:**
- **AK-RP 110A** — Fixed CO₂ gas detector; 0–5,000 ppm range; alarm at 1,000 ppm (early warning / action level) and 5,000 ppm (OSHA 8-hr TWA PEL — mandatory evacuation); requires 24V; output to AK-SM or relay
- Machine rooms require ventilation interlock with CO₂ detector — verify interlock test at every PM

---

### Danfoss Booster CO₂ System (MWT / Booster MWT)

The Danfoss "Booster MWT" (Medium/Low Temperature) is a pre-packaged CO₂ transcritical rack solution for supermarkets:

**Architecture:**
- **MT compressors** (scrolls or semi-hermetics) → MT suction header → gas cooler
- **LT booster compressors** → discharge into MT suction header (flash injection booster configuration)
- **Flash tank (IPV)** — separates liquid/vapor after HP expansion; MT compressors take vapor from flash tank top
- **Gas cooler + gas cooler fans** — air-cooled; outdoor unit; controlled by AK-PC 783/785

**AK-PC 783/785 key parameters to verify at commissioning:**
1. HP setpoint algorithm: enable "floating HP" (tracks gas cooler outlet temp)
2. Flash tank level switch wired to AI input; alarms at high/low
3. Gas cooler fan staging: verify fan steps match number of fan contactors/VFDs installed
4. Superheat setpoint on booster inlet: −5 to 0°F (booster compressors can handle wet suction — do not target positive superheat)
5. Subcritical/transcritical switchover threshold: ~27°C gas cooler outlet

**Common Booster MWT faults:**
| Fault | Likely cause |
|---|---|
| High HP alarm (>130 bar) | GC fans not staging; GC fouled; ICMTS stuck closed |
| LP alarm on LT side | CCMT EEVs all closed; EVRA solenoid not opening; LT compressor unloaded/tripped |
| Flash tank high level | MT compressors tripped; main EXV over-feeding flash tank |
| Flash tank low level | Main EXV under-feeding; MT compressors starving on vapor only |
| Frequent HP hunting | ICAD/ICM worn; floating HP setpoint too aggressive; GC fan VFD hunting |
| Oil in flash tank (foamy sight glass) | Oil separator bypassing; return oil line blocked |

---

### Critical Field Mistakes — Danfoss CO₂ Equipment

1. **AKV on CO₂ high side** — AKV is rated ~45 bar maximum; CO₂ HP side routinely exceeds 100 bar. This is a catastrophic failure risk. Always use CCMT for CO₂ EEV applications.
2. **Wrong AKS sensor** — AKS 32 (HFC) installed on CO₂ HP side will rupture. Verify: AKS 33 for mid-pressure CO₂; AKS 38 for high-pressure gas cooler outlet.
3. **Leaving ICAD manual override in open position** — HP valve stays fully open; system cannot regulate high-side pressure; HPCO trip follows. Always return ICAD override to auto (center detent) after diagnostics.
4. **RS-485 bus missing termination** — Adding a new controller without adding/checking 120Ω termination resistors causes intermittent comm alarms across the entire bus.
5. **CCMT replaced without re-initialization** — New CCMT won't track superheat correctly until the AK-CC controller runs its homing sequence. Power cycle after installation; confirm step count in service menu.
6. **EVR body replacement on CO₂ liquid line** — Standard EVR body (45 bar) on CO₂ liquid line ≤45 bar is acceptable subcritical; NOT acceptable for transcritical CO₂ liquid lines where operating pressure can reach 80–100 bar. Use EVRA.
7. **AK-CC defrost alarm ignored** — "Defrost ran to max time" is not a nuisance alarm. It means the coil did not reach termination temperature in time. In CO₂ cases with CCMT EEVs, a frozen coil from incomplete defrost will cascade — case temps rise, compressors run long, suction pressure drifts. Investigate within one defrost cycle.`


export const ARNEG_KNOWLEDGE = `
## Arneg Product Knowledge — Supermarket Display Cases & Refrigeration

![Commercial supermarket refrigerated display cases](https://upload.wikimedia.org/wikipedia/commons/a/af/Cold_Storage_Cabinets.jpg "Commercial refrigerated display cases — Arneg Oslo, Venice, and Trinidad series are installed in configurations like this")

Arneg S.p.A. is an Italian refrigeration manufacturer (founded 1962, Tribano, Padova, Italy) producing display cases, cold rooms, and remote refrigeration systems for supermarkets and foodservice worldwide. Their cases are widely deployed in North America, Europe, and Latin America on both HFC and CO₂ remote rack systems.

---

### Display Case Product Families

#### Open Multi-Deck — Medium Temperature (Dairy, Produce, Deli, Beverage)

| Model | Type | Typical application |
|---|---|---|
| **Oslo** | Open multi-deck, 3-shelf | Dairy, yogurt, beverages; most common Arneg MT case in US stores |
| **Oslo V** | Oslo with ventilated air curtain upgrade | High-humidity stores; improved product temps |
| **Los Angeles** | Low-depth open multi-deck | Produce, packaged meat; wider air curtain |
| **Ischia** | Low-height open multi-deck | Cheese, deli; shelf height ~56" vs Oslo ~72" |
| **Darwin** | Curved-glass open multi-deck | Premium presentation; front glass panel |
| **Darwin E** | Darwin with enhanced air curtain | Energy-efficient variant |

**Oslo model code breakdown — example: OSLO 3 250 NN**
- \`OSLO 3\` = Oslo series, 3-tier shelving
- \`250\` = nominal case length in centimeters (250 cm ≈ 8 ft)
- First \`N\` = Narrow (reduced installation depth)
- Second \`N\` = No night curtain (manual blind option; omit if curtain installed)
- Other common suffixes: \`H\` = heated front rail; \`L\` = left end section; \`R\` = right end section; \`E\` = end section; \`M\` = middle section

---

#### Open Multi-Deck — Low Temperature (Frozen Food)

| Model | Type | Notes |
|---|---|---|
| **Trinidad** | Open LT multi-deck | Pull-out frozen food; 2–3 shelves; typical LT suction −20°F SST |
| **Trinidad E** | Energy-efficient Trinidad | EC fans standard; LED lighting |
| **Los Angeles LT** | Low-depth LT multi-deck | Smaller footprint frozen |

---

#### Island / Coffin Cases — Low Temperature

| Model | Type | Notes |
|---|---|---|
| **Venice** | Open island coffin LT | Single-deck; 4–8 ft sections; common for ice cream, bulk frozen |
| **Venice L** | Venice with sliding lid | 40–60% energy saving vs open; lid return spring must be checked annually |
| **Bali** | Wide island LT | Double-sided access; used in club stores and high-volume frozen aisles |
| **Alaska** | Plug-in island / coffin | Self-contained (R-290 or R-134a); no remote piping; condenser in end section |

---

#### Closed / Glass Door Cases — Medium & Low Temperature

| Model | Type | Notes |
|---|---|---|
| **Quebec** | Glass door reach-in MT | Vertical doors; dairy/deli/beverages; heated door frames |
| **Quebec LT** | Glass door reach-in LT | Frozen food reach-in; electric defrost standard |
| **Gelo** | Glass door LT island | Sliding glass lids, horizontal access; ice cream |

---

#### Service / Deli Counters

| Model | Type | Notes |
|---|---|---|
| **Dakar** | Refrigerated service counter | Curved or straight glass; open service deli; illuminated |
| **Dakar CH** | Dakar with heated front | Cold/hot combination counter |
| **Samoa** | Refrigerated display counter | Lower profile; deli/sushi/prepared foods |

---

### Defrost Types — Arneg

| Code | Type | Application |
|---|---|---|
| **E** | Electric resistance heaters | Standard on all LT (frozen food) cases; drain pan heater separate |
| **OFF** | Off-cycle (fan stop) | MT cases above ~28°F SST; fans stop, ambient air raises coil temp |
| **HG** | Hot gas (3-pipe) | Optional on LT Arneg cases; faster defrost, less product temperature rise |
| **CO₂ HG** | CO₂ hot gas / KoolGas equivalent | On CO₂-compatible Arneg cases; taps receiver vapor — same principle as Hussmann KoolGas |

**Defrost termination:**
- LT electric cases: coil thermostat at ~55°F terminates; fan delay thermostat holds fans off until ~35°F coil
- MT off-cycle: timed termination (15–20 min typical); no heaters — just fans off
- If defrost runs to max time (failsafe): check termination thermostat continuity (normally closed, opens at setpoint); confirm it is clipped firmly to coil — if it falls off the coil it reads ambient air and never terminates

---

### Controllers Used in Arneg Cases

Arneg cases ship with third-party controllers — primarily Dixell and Carel.

#### Dixell XR Series (most common on Arneg cases)
- **XR20C** — Basic electronic thermostat; 1 probe (air temp); manual or timed defrost; 2-relay output
- **XR40C** — Thermostat + defrost controller; 2 probes (air + evaporator); defrost termination by temp or time
- **XR60C** — Full case controller; 3 probes; EEV output option; RS-485 Modbus for AK-SM or E2 integration
- **XR75CX** — Advanced; 4 probes; digital input for door switch; Modbus + RS-485

**Dixell XR parameter access:** Hold SET for 3 seconds. Key parameters:
- St = setpoint (product/air temp)
- dF = defrost initiation (0=timed, 1=real-time clock)
- dP = defrost duration max (minutes)
- dt = defrost termination temp (coil thermostat setpoint in controller)
- Hy = hysteresis (differential above setpoint before cooling restarts)
- FAD = fan delay after defrost (minutes fans stay off post-defrost)

**Dixell alarm codes:**
| Code | Meaning | Action |
|---|---|---|
| E1 | Probe 1 (air) fault — open or short | Check probe wiring; replace probe |
| E2 | Probe 2 (evaporator) fault | Same as E1 |
| E3 | Probe 3 fault | Same |
| HA / LA | High/Low temperature alarm | Product temp exceeded alarm limits; check refrigeration |
| dEF | Defrost in progress (not an error) | Normal display during active defrost |
| EEV | EEV fault (on XR60C+) | Check EEV wiring and initialization |

#### Carel IR Series (newer Arneg models)
- **IR33** — Mid-range controller; 2 probes; Modbus; RS-485
- **IR33+** — 3 probes; EEV support; expanded I/O
- Parameter access: UP + DOWN held 5 seconds
- Common Carel issue: probe terminals loosen over time due to case vibration — re-torque annually

#### Eliwell IC Series (legacy Arneg cases, pre-2010)
- **IC902** — Basic on/off thermostat; no defrost management
- **ICHILL** — Defrost-capable; common on older Arneg LT cases
- Limited Modbus support; replacement with Dixell XR60C is common upgrade path when AK-SM or E2 integration is needed

---

### Fan Motors — Arneg Cases

- Older (pre-2015) cases: **shaded-pole** fan motors, 4W–8W each; run continuously except during defrost
- Current production: **EC (electronically commutated) brushless** motors; 3W–7W; variable speed; significantly lower energy consumption
- **EC fans cannot be swapped for shaded-pole motors** — different control signal (0–10V or PWM); replacing EC with shaded-pole requires bypassing the controller fan output and wiring direct to line voltage
- Fan blade: press-fit on motor shaft; 8" or 10" diameter depending on case depth; rotation direction critical — verify airflow pattern before installing
- Fan guard: clip-type; must be reinstalled to maintain air curtain integrity
- Common failure (shaded-pole): motor run capacitor; check capacitor before replacing motor

---

### Refrigerants and CO₂ Compatibility

| Refrigerant | Arneg application | Notes |
|---|---|---|
| R-404A | Legacy cases (pre-2018) | Phase-down; most cases can run R-448A/449A with TXV adjustment |
| R-448A / R-449A | Current standard HFC | Primary HFC refrigerants; TXV may need resizing; verify oil compatibility |
| R-744 (CO₂) | Arneg CO₂-compatible cases | CO₂-rated evaporators and EEV fittings; confirm model suffix before connecting to CO₂ rack |
| R-290 (propane) | Self-contained Alaska plug-in | Factory-sealed; ≤150g charge; module replacement only — not field-rechargeable |
| R-134a | Older plug-in self-contained | Some legacy models |

**CO₂ case identification:** Arneg CO₂-compatible cases have a CO₂ or 744 suffix in the model number and ship with a CO₂-rated evaporator coil (copper with stainless distributor), CCMT-compatible EEV wiring, and reinforced refrigerant fittings. Do NOT connect a standard HFC Arneg case to a CO₂ rack — the evaporator coil and valve fittings are not rated for CO₂ working pressures.

---

### Anti-Sweat Heaters and Glass Doors

- Quebec and other glass door cases: door frame heaters prevent condensation on glass and frame
- Heater control: dedicated anti-sweat controller (humidity-based duty cycle) or simple on/off timer
- Do NOT disconnect door frame heaters without installing humidity-based control — condensation leads to door seal failure and mold growth in frame cavities
- Glass fogging between panes: failed IGU (insulated glass unit) seal — replace IGU; not field-repairable
- Door hinge: Arneg uses a top-pivot + bottom-pin hinge; worn bottom pin bushing causes door to sag and not seal — replace bushing before adjusting door alignment

---

### Lighting

- Older cases: T8 fluorescent tubes with ballast in canopy; common failure = ballast overheat; retrofit to LED is straightforward
- Current production: LED strip lights; integrated LED driver in canopy; typical failure = driver board or LED strip connector corrosion from defrost moisture
- LED compatibility: not all retrofit kits work with Arneg ballast wiring; use direct-wire LED tubes or replace ballast
- Night setback: some models dim LEDs to 10% during store-close via controller output — verify LED driver supports PWM dimming before substituting driver

---

### Common Arneg Case Faults

**Case running warm (MT open multi-deck):**
1. Coil frosted over from incomplete defrost — inspect coil through return air grille; check defrost termination thermostat
2. TXV hunting or underfeeding — measure superheat at suction stub; target 4–8°F
3. Fan motor(s) failed — check each fan; shaded-pole motors fail silently (no heat signature, just stops)
4. Night curtain not retracted — curtain motor or track jammed; curtain blocks discharge air column
5. Store humidity high — cases above 55% RH will not hold setpoint; check HVAC dehumidification

**Case running warm (LT open):**
1. Coil fully iced — defrost not initiating (check controller clock/schedule) or not completing (termination thermostat detached from coil or open-circuit)
2. Suction pressure high — EPR valve set too high, or hot gas solenoid leaking by
3. Dirty evaporator coil — clean annually; rinse thoroughly (residue causes rapid re-fouling)

**Excessive frost on coil bottom only:**
- Liquid feed issue — check TXV superheat or EEV steps; liquid line solenoid may be closing late

**Defrost water on floor:**
1. Drain pan heater failed — check continuity (~48Ω for 300W at 120V; ~72Ω for 200W at 120V; open = failed element)
2. Drain line frozen or blocked — pour warm water down drain; verify heat tape on drain line in LT cases
3. Defrost running too long — reduce max defrost time; verify termination thermostat is clipped to coil

**Night curtain won't retract:**
1. Motor failure — 24V or 120V AC depending on model; check voltage at motor leads
2. Track obstruction — ice in curtain track; inspect and clear
3. Controller output fault — check relay output signal at controller

---

### Parallel Rack Integration

Arneg cases connect to remote rack systems the same way as any North American display case:

- Suction: 7/8" or 1-1/8" OD copper (MT); 5/8" or 7/8" OD (LT) — confirm per job schedule
- Liquid: 1/2" or 5/8" OD copper liquid line; liquid line solenoid at case is standard
- Electrical: 120V for fans, heaters, and controller; 24V for controllers and EEV
- Controller integration: Dixell XR60C/XR75CX and Carel IR33+ support RS-485 Modbus; wire to E2 or AK-SM RS-485 bus for centralized monitoring
- Superheat setup with TXV: set bulb at suction outlet; target 6–10°F at case suction stub
- Superheat setup with EEV: AK-CC or Dixell XR60C drives CCMT (CO₂) or AKV (HFC); target 4–8°F

---

### Parts and Resources

- Arneg North America: arneg-usa.com — technical support through regional distributors
- European parent / documentation: arneg.it (English versions available for most technical bulletins)
- Dixell controller manuals: dixell.com — downloadable by model number
- Carel controller manuals: carel.com — IR33 parameter guide and wiring diagrams
- Third-party parts: Parts Town (partstown.com/arneg), CaseParts.com
- Serial plate location: inside the case on the right-side interior wall near the top, or on data sticker inside the end panel — includes model, serial, refrigerant type, charge weight, and electrical data`


export const KEEPRITE_KNOWLEDGE = `
## Keeprite Product Knowledge — Commercial Refrigeration & Supermarket Equipment

Keeprite Refrigeration is a North American commercial refrigeration manufacturer (part of International Comfort Products / Carrier). Their unit coolers and condensing units are widely used in supermarket walk-in coolers, walk-in freezers, prep rooms, floral coolers, and back-of-house refrigeration across Canada and the US.

---

### Company & Brand Overview

- **Owned by:** International Comfort Products (ICP), a Carrier subsidiary
- **Primary markets:** Supermarkets, convenience stores, food service, cold storage
- **Main product lines:** Unit coolers (evaporators), remote condensing units, self-contained packaged systems
- **Manufacturing:** Products are sold through commercial refrigeration distributors; Copeland and Tecumseh compressors are common in their condensing units
- **Documentation:** keepriterefrigeration.com — product data, installation manuals, selection software

---

### Unit Cooler Product Families

#### KLP Series — Low Profile Unit Cooler

The KLP is Keeprite's standard low-profile (horizontal air discharge) unit cooler for walk-in medium and low temperature applications.

- **Mounting:** Ceiling-mounted, horizontal discharge; low clearance installation (suitable for walk-ins with 8–10 ft ceilings)
- **Air throw:** Horizontal discharge across the cooler ceiling; multiple fans depending on length
- **Temperature range:** Available in MT (medium temp, walk-in cooler) and LT (low temp, walk-in freezer) configurations
- **Coil fin spacing:** MT models typically 4–6 fins per inch; LT models 2–3 fins per inch (wider spacing slows frost bridging)
- **Defrost options:**
  - MT: Off-cycle (fan stop) standard; electric optional
  - LT: Electric resistance heaters standard; hot gas optional
- **Fan motors:** Shaded-pole (older models) or PSC; EC fan motor upgrades available on newer versions
- **Drain pan:** Electric drain pan heater on LT models; gravity drain on MT
- **Standard features:** Fan delay thermostat, defrost termination thermostat, drain pan heater (LT)

**KLP model number decoding (general pattern):**
- First letters: KLP = Keeprite Low Profile
- Capacity digits: indicate BTU/hr capacity (e.g., KLP060 ≈ 6,000 BTU/hr range — confirm in product data)
- Temperature suffix: M = medium temp, L = low temp
- Defrost suffix: E = electric, O = off-cycle, H = hot gas
- Always verify against the unit nameplate and product datasheet — Keeprite revises suffixes across generations

---

#### KLV Series — Unit Cooler (Vertical / V-Type Coil)

The KLV series uses a V-coil (two coil banks angled in a V configuration) for higher coil surface area in a compact footprint.

- **Coil design:** Dual-slab V-coil; larger coil face area than flat coil designs for the same unit footprint
- **Air discharge:** Vertical or horizontal depending on orientation and installation
- **Application:** Higher-capacity walk-ins and blast coolers where maximum coil surface is needed
- **Fin spacing:** Available in standard and wide-fin (LT) versions
- **Defrost:** Electric standard on LT; off-cycle on MT
- **Drainage:** Dual drain connections (one per coil slab); both must be piped and heat-traced on LT applications
- **Refrigerant distributor:** Each coil slab has its own distributor; TXV must feed both slabs correctly — confirm distributor configuration before replacing TXV

**Key field note — KLV dual distributor:** The V-coil has two refrigerant circuits. A single TXV feeds a Y-distributor (or two separate TXVs are used depending on model). If one slab is frosted and one is clear, suspect the corresponding distributor nozzle is clogged or one TXV bulb has migrated.

---

#### General Unit Cooler Families (Additional Keeprite Lines)

| Series | Type | Notes |
|---|---|---|
| **KLP** | Low-profile horizontal | Most common in supermarket walk-ins; flat coil |
| **KLV** | V-coil | Higher capacity in compact footprint; dual distributor |
| **KHB** | High capacity | Larger walk-in freezers and blast coolers |
| **KDT** | Dual-temp | Single unit cooler serving two temperature zones |
| **KUH** | Unit heater / cooler | Combination heating/cooling for prep rooms |

---

### Defrost Systems — Keeprite Unit Coolers

**Electric Defrost (LT standard):**
- Resistance heaters embedded in coil fins and on drain pan
- Defrost initiated by time clock or adaptive defrost control
- Termination: coil termination thermostat (opens at ~50–55°F coil temp)
- Fan delay: fans held off until coil cools to ~35°F after defrost to prevent blowing warm air over product
- Drain pan heater: 120V tubular heater in drain pan; wired to run during defrost and a timed drip period after
- If defrost water is pooling in pan and not draining: check drain line heat tape and drain line slope (minimum 1/4" per foot to drain)

**Off-Cycle Defrost (MT standard):**
- Fans stop; refrigeration circuit de-energizes; ambient store air melts frost naturally
- Termination by time (15–30 min typical) — no heaters
- Fan delay: fans restart when coil drops below ~38°F
- If MT walk-in is not fully clearing frost during off-cycle: store ambient too cold, or defrost duration too short; extend defrost time before adding heaters

**Hot Gas Defrost (optional):**
- Discharge gas routed to coil inlet; solenoid valve opens on defrost call
- Faster than electric; less product temperature rise
- Requires 3-pipe installation; check solenoid valve for leakage between defrosts (warm coil when refrigerating = hot gas solenoid leaking by)

**Adaptive Defrost Control:**
- Some Keeprite units ship with or can be retrofitted with demand/adaptive defrost boards (e.g., Paragon, Grasslin, or Ranco timers)
- Adaptive defrost skips unnecessary defrosts based on run time accumulation — field-adjustable threshold (e.g., skip if <2 hrs runtime since last defrost)

---

### Condensing Units

Keeprite condensing units are air-cooled remote units used with their unit coolers for walk-in and reach-in applications.

**Compressor types used:**
- **Copeland scroll** (ZB/ZF series) on medium/larger capacity units
- **Copeland semi-hermetic Discus** on high-capacity and LT units
- **Tecumseh AEA/AGA** reciprocating on smaller capacity units (common in self-contained and small walk-in applications)

**Refrigerant:**
- Legacy: R-404A (phase-down; still found in installed units)
- Current: R-448A, R-449A (near-drop-in HFC replacements; TXV resizing may be required)
- Some self-contained units: R-134a or R-290

**Condensing unit configuration:**
- Single compressor or dual compressor (tandem) configurations
- Integral condenser coil + condenser fans
- High-ambient option (larger condenser coil, more fan CFM) for rooftop or outdoor installation in hot climates

**Key specs to record at installation:**
1. Compressor model and serial (on nameplate)
2. Condensing unit model (on unit nameplate — inside the access panel)
3. Refrigerant type and charge weight (on nameplate)
4. High-pressure cutout setting (factory set; record for future reference)
5. Low-pressure cutout setting (suction pressure cutout)
6. Oil type (POE for HFC systems)

**Rooftop condensing units:**
- Common in supermarket walk-in applications where machine room space is limited
- Check condenser coil for debris and biological growth (rooftop units collect organic matter)
- Clean coil at minimum annually; high-ambient stores (desert/sun belt) may need quarterly cleaning
- Verify head pressure control (fan cycling switch or VFD) — inadequate head pressure control in cold weather causes LO HEAD PRES trip

---

### Refrigerant & Oil

| Refrigerant | Application | Notes |
|---|---|---|
| R-404A | Legacy installed units | Phase-down per AIM Act; retrofit with R-448A/449A is common |
| R-448A | Current LT/MT standard | Compatible with POE oil; TXV may need upsizing ~10% |
| R-449A | Current LT/MT standard | Similar to R-448A; confirm TXV compatibility with manufacturer |
| R-134a | Small self-contained units | Single-door reach-ins, display cases |
| R-290 (propane) | Small plug-in self-contained | Factory-sealed; ≤150g charge; NOT field-rechargeable |

**Oil:** All HFC systems (R-404A, R-448A, R-449A) use **POE (polyolester) oil**. Never mix POE with mineral oil — POE is hygroscopic (absorbs moisture rapidly when exposed to air); keep containers sealed and minimize open-air exposure during service.

**R-404A to R-448A/R-449A retrofit:**
1. Recover R-404A fully
2. Replace filter-drier (new drier sized for R-448A)
3. Verify POE oil in system (if mineral oil present, flush required)
4. Recharge with R-448A/R-449A per manufacturer weight spec (typically 5–15% less charge by weight than R-404A)
5. Adjust TXV superheat (R-448A/449A have different pressure-temperature curve)
6. Update unit nameplate and refrigerant identification labels per EPA requirements
7. Update high-pressure and low-pressure cutout settings per new refrigerant PT chart

---

### Walk-In System Configuration — Supermarket Back-of-House

Keeprite equipment is most commonly found in these supermarket walk-in configurations:

**Produce walk-in cooler (MT):**
- SST: +20 to +28°F; box temp 34–38°F
- Unit cooler: KLP medium temp, off-cycle defrost, 2–4 fans
- Condensing unit: remote air-cooled, rooftop or machine room
- Typical superheat at suction: 6–10°F

**Meat/deli walk-in cooler (MT):**
- SST: +15 to +22°F; box temp 32–36°F
- Tighter temperature control; often faster pull-down requirement
- 2–3 defrosts per day off-cycle

**Frozen food walk-in freezer (LT):**
- SST: −20 to −15°F; box temp −10 to 0°F
- Unit cooler: KLP or KLV low temp, electric defrost
- 2–4 defrosts per 24 hours; termination at 55°F coil
- Critical: drain line must be heat-traced and insulated; freeze-ups cause flooding at defrost end

**Floral cooler (MT):**
- SST: +28 to +32°F; box temp 36–40°F
- High humidity requirement (75–85% RH); evaporator NOT defrosted frequently to preserve humidity
- Off-cycle defrost; minimal run time per defrost

**Seafood/fish cooler:**
- SST: +20 to +25°F; box temp 29–33°F (near-freezing without freezing product)
- Electric defrost often used due to tight temperature tolerance
- Drain pan critically important — fish coolers generate high drainage volume

---

### Fan Motors — Keeprite Unit Coolers

- **Shaded-pole:** Older/smaller models; 4W–15W; continuous run except during defrost; simple wiring
- **PSC (permanent split capacitor):** Mid-range units; more efficient than shaded-pole; capacitor failure is most common fault
- **EC (brushless electronically commutated):** Newest models; 15–50% more efficient; 0–10V or PWM speed control; cannot directly substitute shaded-pole without bypassing speed controller
- Fan blade: check rotation — air must be drawn through coil (not blown through); incorrect rotation causes warm coil and poor capacity
- Fan guard must be intact — missing fan guard disrupts coil airflow pattern and reduces capacity

**Diagnosing fan motor failure:**
1. Check voltage at motor leads (should be 120V or 208/230V depending on unit)
2. Check motor winding resistance: open or shorted windings = replace motor
3. For PSC motors: check run capacitor (capacitance and ESR) — failed capacitor causes motor to hum but not start, or run slow
4. For shaded-pole: if motor is hot to touch but not running, check for mechanical seizure (bearing failure) — replace motor

---

### Common Keeprite Unit Cooler Faults

**Walk-in too warm (MT):**
1. Coil frosted solid — check defrost schedule and termination thermostat; inspect coil
2. Fan motor(s) failed — check each motor; shaded-pole failure is silent (no heat, no noise)
3. Suction pressure too high — EPR valve set too high or liquid line solenoid not closing during off cycle
4. TXV hunting/underfeeding — measure superheat; target 6–10°F; check TXV bulb contact with suction line
5. Dirty condenser coil — check condensing unit; high head pressure reduces capacity

**Walk-in too warm (LT):**
1. Incomplete defrost — coil iced; check heater continuity (each heater ~15–30Ω at 240V; higher resistance = partial open)
2. Drain pan heater failed — water freezes in pan → ice dam → frost above pan
3. Defrost termination thermostat detached from coil — stays open, defrost always hits max time
4. Fan delay thermostat stuck open — fans never restart after defrost
5. Suction pressure too high — check TXV superheat; check if discharge solenoid leaking hot gas into suction

**Frosted only on top half of coil:**
- TXV overfeeding (low superheat, wet suction) — check bulb position and charge

**Frosted only on bottom half of coil:**
- TXV underfeeding (high superheat) — check TXV bulb, screen, distributor nozzles

**Noisy unit cooler:**
- Ice contact with fan blade — defrost not clearing ice near fans; extend defrost time
- Loose fan blade — check blade set screw (often Allen head on hub)
- Bearing failure — replace motor; do not grease sealed bearings

**Water dripping from unit during refrigeration (not defrost):**
- Drain pan drain line partially frozen or blocked — clear drain; verify heat tape on drain line
- Very humid store air infiltrating walk-in (door gasket failed; door left open frequently)

---

### Electrical — Keeprite Unit Coolers

- **Standard voltages:** 120V single-phase (fans and controls); 208/240V single-phase or 208/240V 3-phase (heaters and larger fans)
- **Control wiring:** 24V secondary from transformer for defrost timer and solenoid outputs on some models; others use line voltage directly
- **Defrost timer location:** Often factory-mounted inside condensing unit; field-mounted in walk-in junction box on some installations
- **Heater circuit:** Always check heater circuit fusing — blown heater fuse = no defrost = iced coil; check each heater element individually (disconnect one at a time)

**Wiring check sequence after iced coil complaint:**
1. Verify defrost timer is initiating (check timer motor, advance timer manually to defrost position)
2. Verify heater contactor pulls in (listen/measure)
3. Verify heater voltage at each element (208V or 240V depending on installation)
4. Measure heater resistance (open heater = high resistance or OL)
5. Verify termination thermostat continuity (NC at ambient; opens at setpoint)
6. Verify fan delay thermostat continuity (closed at ambient; opens above 38°F)

---

### Parts and Resources

- **Keeprite Refrigeration:** keepriterefrigeration.com — product data, installation manuals, drawings, selection software (KoolSelect)
- **Replacement parts:** Parts Town (partstown.com/keeprite), Johnstone Supply, Waxman Industries
- **Compressor warranty/service:** Route through Copeland or Tecumseh depending on compressor brand in condensing unit
- **Technical support:** 1-800-448-5872 (ICP commercial refrigeration line)
- **Serial plate location:** Unit coolers — inside the access panel or on the side of the unit near the electrical compartment; condensing units — on the compressor compartment access panel facing the service aisle`

export const MATH_AND_ELECTRICAL_KNOWLEDGE = `
## Refrigeration & HVAC/R Math — Field Reference

---

### Core Refrigeration Calculations

**Superheat:**
SH = T_suction_line − SST
- T_suction_line = measured temperature at suction line (at evaporator outlet or rack return header)
- SST = saturation suction temperature from PT chart at measured suction pressure (use dew-point column for zeotropic blends)
- Target: 6–12°F individual case; 10–20°F at rack return header

**Subcooling:**
SC = SCT − T_liquid_line
- SCT = saturation condensing temperature from PT chart at measured head pressure (use bubble-point column)
- T_liquid_line = measured liquid line temperature after condenser outlet, before expansion device
- Target: 10–20°F; below 5°F = low charge or fan issue; above 20°F = possible overcharge

**Compression Ratio (CR):**
CR = P_discharge (psia) / P_suction (psia)
- Convert: psia = psig + 14.7
- Target: CR < 10:1 for scroll compressors; reciprocating can tolerate up to ~12:1
- High CR = high discharge temps, poor efficiency, shortened compressor life
- Example: head 220 psig, suction 25 psig → CR = (220+14.7) / (25+14.7) = 234.7 / 39.7 = **5.9:1** ✓

**Sensible Heat Load:**
Q_sensible = 1.08 × CFM × ΔT (°F)
- 1.08 = air density constant (0.075 lb/ft³ × 0.24 BTU/lb·°F × 60 min/hr)
- CFM = airflow; ΔT = return air temp − supply air temp (across coil)

**Latent Heat Load (Dehumidification):**
Q_latent = 0.68 × CFM × ΔW
- ΔW = change in humidity ratio (grains per pound of dry air)

**Tons of Refrigeration:**
Tons = BTU/hr ÷ 12,000
(1 ton = 12,000 BTU/hr = effect of melting 1 ton of ice per 24 hours)

**Heat Rejection — Condenser Load:**
Q_condenser ≈ Q_evaporator × 1.20 to 1.25 (MT); × 1.30 (LT)
- Condenser must reject evaporator heat + heat of compression; LT systems have higher compression work

**COP (Coefficient of Performance):**
COP = Q_evap (BTU/hr) / W_compressor (BTU/hr)
- Convert watts to BTU/hr: 1 W = 3.412 BTU/hr
- Typical supermarket MT: COP 2.5–4.0; LT: COP 1.5–2.5

**EER (Energy Efficiency Ratio):**
EER = Cooling Capacity (BTU/hr) / Power Input (Watts)
EER = COP × 3.412

**Evaporator TD (Temperature Difference):**
TD = T_box − SST (entering air temp minus saturation suction temperature)
- Low TD (8–10°F): walk-in coolers → maintains high humidity
- High TD (18–25°F): walk-in freezers, reach-ins → lower RH, faster frost buildup

**Condenser Approach Temperature:**
Approach = SCT − T_ambient
- Target: 15–25°F; above 25°F = dirty condenser, blocked airflow, failed fans, or non-condensables

**CO₂ High-Side Optimal Pressure (field approximation):**
HP_opt ≈ 2.6 × T_gas_cooler_outlet (°C) + 7 bar
- Optimizing this setpoint maximises COP in transcritical operation

**Pressure/Temperature Unit Conversions:**
- psia = psig + 14.7
- 1 bar = 14.504 psi
- 1 MPa = 145 psi = 10 bar
- 1 kPa = 0.145 psi

**Temperature Conversions:**
- °F = (°C × 9/5) + 32
- °C = (°F − 32) × 5/9
- K = °C + 273.15

---

### Refrigeration Math Cheatsheet

| Calculation | Formula | Target range |
|---|---|---|
| Superheat | T_suction − SST | 6–12°F case; 10–20°F rack |
| Subcooling | SCT − T_liquid | 10–20°F |
| Compression ratio | P_disc_abs / P_suc_abs | < 10:1 scroll; < 12:1 recip |
| Sensible heat | 1.08 × CFM × ΔT | BTU/hr |
| Tons | BTU/hr ÷ 12,000 | — |
| COP | Q_evap / W_comp | 1.5–4.0 |
| EER | BTU/hr ÷ Watts | — |
| Condenser approach | SCT − T_ambient | 15–25°F |
| Evaporator TD | T_box − SST | 8–25°F (app. dependent) |
| Heater resistance | V² / P | Ω |

---

### Electrical Calculations

**Ohm's Law (V = I × R):**
| Find | Formula |
|---|---|
| Voltage | V = I × R |
| Current | I = V / R |
| Resistance | R = V / I |

V = Volts, I = Amperes (amps), R = Ohms (Ω)

**Power — Single Phase:**
P = V × I × PF (true power, watts)
VA = V × I (apparent power, volt-amps)
PF (power factor): motors = 0.75–0.90; resistive heaters = 1.0

**Power — Three Phase:**
P = 1.732 × V_line × I_line × PF
(1.732 = √3; always use this for 3-phase calculations)
- Current from power: I = P / (1.732 × V × PF)
- Example: 5 HP motor at 208V 3-phase, PF = 0.85:
  I = (5 × 746) / (1.732 × 208 × 0.85) = 3,730 / 306.5 ≈ **12.2 A**

**Quick Current Rules of Thumb:**
| Voltage | Single-phase | Three-phase |
|---|---|---|
| 120V | ≈ 8.3 A per 1,000 W | — |
| 240V | ≈ 4.2 A per 1,000 W | ≈ 2.4 A per 1,000 W |
| 208V 3-ph | — | ≈ 2.8 A per 1,000 W |
| 600V 3-ph | — | ≈ 1.0 A per 1,000 W |
| 480V 3-ph (US) | — | ≈ 1.2 A per 1,000 W |

**Heater Resistance Check (R = V² / P):**
| Heater rating | Expected resistance |
|---|---|
| 200 W at 120 V | ~72 Ω |
| 300 W at 120 V | ~48 Ω |
| 500 W at 240 V | ~115 Ω |
| 750 W at 240 V | ~77 Ω |
| 1,000 W at 240 V | ~58 Ω |
| 1,500 W at 240 V | ~38 Ω |
| 2,000 W at 240 V | ~29 Ω |
Open heater (OL on meter) = burned element. Resistance significantly higher than spec = partial failure (some coils open).

**Voltage Drop:**
VD = (2 × L × R_wire × I) / 1,000
- L = one-way run in feet; R_wire = resistance per 1,000 ft from wire table
- Common values (copper): 14 AWG = 2.525 Ω/1,000 ft; 12 AWG = 1.588; 10 AWG = 0.999; 8 AWG = 0.628
- Max allowable: 3% branch circuit; 5% total (feeder + branch)
- Rule of thumb: if run > 100 ft, upsize one gauge from NEC minimum

**Capacitor Sizing and Testing:**
- Run capacitor tolerance: within ±6% of nameplate µF rating
- Failed run capacitor: motor hums, draws locked-rotor amps, trips thermal overload
- Common values: compressor run = 35–55 µF; condenser fan = 5–10 µF; evaporator fan = 3–7.5 µF
- Test: capacitance meter in µF mode across terminals (discharge first!)
- Discharge safely: short terminals through a 20 kΩ resistor before touching

**Motor Winding Resistance (3-phase balance test):**
- Measure T1–T2, T2–T3, T1–T3 with low-ohm meter
- All three should read equal within ±5–10%
- Open winding (OL): winding failed; grounded winding (0 Ω to shell): burnout
- Test cold for highest sensitivity; megohm test confirms insulation integrity

**Megohm Insulation Test (500V or 1,000V DC megohmmeter):**
| Reading | Condition |
|---|---|
| > 100 MΩ | Good — healthy insulation |
| 20–100 MΩ | Marginal — monitor; check for moisture |
| < 20 MΩ | Failed — do not operate |
| Near 0 MΩ | Grounded winding — compressor is scrap |
Test each terminal (T1, T2, T3) to compressor shell. Warm motor should show HIGHER resistance than cold — if it drops when warm, moisture is the cause.

**Locked Rotor Amperage (LRA) vs Full Load Amperage (FLA):**
- LRA is typically 5–8× FLA at startup
- Wiring, contactors, and fuses must tolerate LRA
- Compressor drawing LRA without starting: check start capacitor, start relay, potential relay; or mechanical seizure (will trip overload within seconds)

**Transformer Secondary Verification:**
- Measure primary voltage (L1–L2 at transformer input terminal); if OK but no secondary output → failed transformer
- Secondary should hold rated voltage ±10% under load (24 VAC with control circuit energized)
- Common cause of low secondary voltage: shorted turn in secondary winding; or control circuit short drawing excess current

---

### Reading Wiring Diagrams

**Diagram Types:**
| Type | What it shows | Used for |
|---|---|---|
| **Ladder diagram** | Logic: L1 and L2 rails, horizontal rungs with contacts and loads | Troubleshooting sequence of operation |
| **Schematic (pictorial)** | Physical components wired by appearance | Understanding component construction |
| **Line diagram** | Terminal numbers, wire colors, connection points | Field wiring and installation |
| **Block diagram** | Major system blocks and signal flow | System overview; no circuit detail |

**Ladder Diagram Structure:**
- Two vertical rails: **L1** (hot) and **L2 or N** (neutral) — like the rails of a ladder
- Horizontal **rungs**: each rung is one circuit; contains contacts (switches) in series or parallel, and a load (coil or motor) at the right end
- Read **left to right** across each rung: all series contacts must be closed for current to reach the load
- Read **top to bottom**: the sequence of operation flows down the diagram

**Essential Symbols:**

| Symbol | Component | Behavior |
|---|---|---|
| Two vertical lines with gap | Normally Open (NO) contact | Open at rest; closes when actuated |
| Two vertical lines with diagonal slash | Normally Closed (NC) contact | Closed at rest; opens when actuated |
| Circle | Coil (relay, contactor, solenoid) | Energized when current flows through rung |
| Zigzag | Resistor / heater element | Fixed resistance; converts current to heat |
| Parallel curved lines | Capacitor | Stores charge; start or run capacitor |
| Lines with arrow | Variable (adjustable) element | TXV, adjustable pressure switch, VFD |
| Three parallel lines | Three-phase power supply | L1, L2, L3 from utility panel |
| M in circle | Motor | Compressor motor, fan motor |

**Normally Open vs Normally Closed — Critical Distinction:**

**Normally Open (NO):** De-energized = open (no current). Closes when activated.
- Thermostat cooling contacts: NO — close when space temp rises above setpoint
- Pressure switch low-pressure loading: NO — closes when suction pressure rises to cut-in
- Relay auxiliary contact: NO — closes when relay coil energizes

**Normally Closed (NC):** De-energized = closed (current flows). Opens when activated.
- High-pressure cutout (HPCO): NC — opens on overpressure to break compressor circuit
- Low-pressure cutout (LPCO): NC — opens on low pressure to protect compressor
- Motor overload: NC — opens on overload condition; must be reset before restarting
- Oil pressure differential switch: NC — opens if oil pressure differential falls below minimum

**Control Voltage vs Line Voltage Sections:**
Most wiring diagrams contain two distinct voltage sections on the same page:
- **Line voltage section** (top or left): L1–L2 or L1–L2–L3 at 120/208/240V single-phase or 600V 3-phase (480V on US equipment); compressor contactor power contacts, condenser fan contactors, heater contactors, transformer primary
- **Control voltage section** (lower or right): 24V AC (from transformer secondary) or 12V DC; thermostat, pressure switch contacts, relay coils, solenoid coils, EEV driver power
- **Control transformer** appears at junction: primary wired to line voltage; secondary produces 24V

Never test 24V control circuit components with a 120V test light — you will burn the secondary winding.

**Reading Sequence of Operation (step-by-step method):**
1. Find the call-for-cooling input — usually thermostat contacts at the top of the ladder (rung 1)
2. Trace series safety contacts: HPCO, LPCO, overload — all NC contacts that must remain closed
3. Find the compressor contactor coil at the right end of that rung — energizes when all contacts are closed
4. Find the compressor contactor power contacts (line voltage section) — close when coil is energized; these carry the high-amperage compressor current
5. Locate the condenser fan circuit — often interlocked through a compressor auxiliary contact (fan runs only when compressor runs)
6. Locate the defrost circuit — a timer cam contact that opens the compressor rung and simultaneously closes the heater rung; defrost termination thermostat wired in series with heater circuit

**Troubleshooting with a Ladder Diagram — Systematic Voltage Test:**
1. Identify the load that should be energized but is not
2. Find that load's rung in the ladder diagram
3. With circuit energized (use extreme caution — test gloves and face shield), probe across each component from left to right
4. A good contact reads **0V across it** (no voltage drop = closed and conducting)
5. A failed open contact reads **line voltage across it** (voltage drops across the open gap — same as finding a blown fuse)
6. First component with line voltage across it = the open; trace upstream to find why it opened

**Wire Color Conventions (North American HVACR):**
| Color | Typical use |
|---|---|
| Black | L1 — line hot (120V or 208/240V phase 1) |
| Red | L2 — second hot leg (240V, or phase 2 on 3-phase) |
| Blue | L3 — third hot leg (3-phase only) |
| White | Neutral (grounded conductor) |
| Green / Bare | Equipment ground |
| Yellow | 24V control wiring (thermostat, safety circuits) |
| Orange | 24V switched hot (thermostat call output) |
Note: color codes are not universal — always verify with a meter before assuming; older installations frequently deviate.

**Pressure Switch Wiring:**
- HPCO: NC contact wired in **series** with compressor contactor coil circuit
  - When pressure rises to trip point → contact opens → contactor coil de-energizes → compressor stops
  - Manual-reset HPCO (common on large racks): requires physical reset button press before restart
  - Auto-reset HPCO: resets automatically when pressure drops below reset point
- LPCO: NC contact wired in series; opens on low pressure
- Dual pressure switch: one body, four terminals — L1 in, HPCO NC out, LPCO NC out, common
- Test HPCO: press manual reset button; circuit should open immediately; measure voltage at contactor coil — drops to 0V when HPCO trips

**Defrost Timer Wiring (mechanical cam type — 4-terminal):**
| Terminal | Function |
|---|---|
| 1 | Line voltage in (L1) |
| 2 | Cooling circuit out (→ liquid line solenoid, compressor enable) |
| 3 | Defrost heater circuit out |
| 4 | Common (L2 / Neutral) |
- Refrigeration mode: 1→2 closed, 1→3 open
- Defrost mode: 1→2 open (compressor off), 1→3 closed (heaters on)
- Defrost termination thermostat: NC, wired in series with terminal 3 — opens on high coil temp to end defrost before failsafe timer runs out
- Fan delay thermostat: NC, wired in series with fan motor circuit — opens after defrost (when coil is warm) to hold fans off; closes when coil cools (~35°F)

**Contactor and Relay Contact Numbering:**
- Main power contacts: 1–2, 3–4, 5–6 (or T1/T2, T3/T4, T5/T6)
- Auxiliary NO contact: 13–14
- Auxiliary NC contact: 21–22
- Coil terminals: A1, A2 (IEC) or shown as circle on ladder
- Motor starter: same as contactor + overload relay (OL) in series with each phase

**Solenoid Valve Symbols on Wiring Diagrams:**
- Solenoid coil appears as a circle (load) at the right end of a rung
- NC solenoid (liquid line): coil energized = valve opens; de-energized = valve closed — correct for liquid line applications
- NO solenoid (oil return): coil de-energized = valve open; energized = valve closed — oil returns during off-cycle even with no power to coil
- Always verify NC vs NO designation when ordering replacement coils — wiring the wrong type causes opposite behavior

---

### Electrical Safety Rules for Refrigeration Technicians

1. **Lock out / tag out (LOTO)** before working on any energized equipment. Verify zero energy with a meter after locking out — capacitors hold charge even after disconnect.
2. **Discharge capacitors** before touching — use a 20 kΩ discharge resistor, not a screwdriver (screwdriver discharges create dangerous arcs and may damage equipment).
3. **Measure before touching** — always verify voltage category before probing a circuit.
4. **Use the correct CAT-rated meter** — CAT III for panel and equipment work; CAT IV for service entrance.
5. **Never reset a tripped breaker without finding the cause** — a breaker tripping on a refrigeration circuit usually means a ground fault, short, or overloaded motor; resetting without investigation causes equipment damage or fire.`


export const MICRO_THERMO_KNOWLEDGE = `
## Micro Thermo Technologies (MT-Alliance) — Case & Rack Controllers

Micro Thermo Technologies (MTT) is a Parker Hannifin / Sporlan brand. Their MT-Alliance platform is the standard controller used in Evapco LMP CO₂ transcritical rack systems and is widely deployed in Canadian and US supermarkets. The Alliance platform controls everything from individual display case EEVs through to full CO₂ rack head pressure management.

---

### MT-Alliance Platform Overview

**Board families:**
- **MT-500 series** (classic): MT-500Q (base node), MT-504P (4 relays/4 AO), MT-508P (8 relays), MT-512P (12 relays); require 24/32 Vac center-tap transformer; power via 3-18AWG cable
- **MT-700 series** (modular cluster): MT-722A main controller + plug-in expansion modules; require dedicated 24 Vac transformer; do NOT share transformer with MT-500 boards or third-party loads; max cluster = 4.8 A rms / 115 VA
- **MT-ALARM** (336A): 16–24 Vac; handles alarm relay outputs and buzzer; can share MT-700 transformer or use dedicated 16 Vac secondary
- **Case Controller board**: 120/240 Vac input (2A fused); controls EEV (stepper), fan relay, defrost relay, lighting relay, anti-sweat SSR; 4 temperature sensor inputs + 1 pressure transducer input

**MT-700 module reference (power, VA at 24Vac):**
| Module | Description | VA (no load) |
|---|---|---|
| MT-722A | Main controller | 7.0 VA |
| MT-716U | 16 universal inputs | 2.8 VA |
| MT-784A | 8 inputs / 4 relay outputs | 4.7 VA |
| MT-766A | 6 inputs / 2 AO / 4 RO | 5.6 VA |
| MT-742V | 4 inputs / 2 valve (MVC) outputs | 2.4 VA + valve VA |
| MT-708V | 8 valve (MVC) outputs | 1.9 VA + valve VA |

**Power rules:**
- MT-500: 3VA per board; 15V sensor power on the board must stay above 13Vdc or temperature readings drift — measure this (not the transformer secondary) when troubleshooting sensor accuracy
- MT-700: never hot-swap modules with 24V power on; insert a 4A fuse in series with each MT-722A AC input (UL compliance)
- Power cables: 18AWG minimum; use center-tap cable (3 conductors) for MT-500; do NOT use shield as the third conductor

---

### MT-Alliance FTT10 Network (LonWorks)

**Cable:** 2-18AWG stranded twisted pair unshielded; Belden 8471 (preferred) or Belden 8461; do NOT mix cable types on the same segment

**Topology (Free Topology — FTT-10 and FT-X):**
- Maximum 64 nodes per segment (PC and routers count as nodes); design to ≤50 to allow growth
- Maximum node-to-node distance: 1,312 ft (400 m) for Belden 8471
- Maximum total wire length: 1,640 ft (500 m)
- Terminator: **FT-NT-2 (MTT part 950-0035)** — place one terminator per segment, preferably near the center
- Data link is NOT polarity-sensitive; MT-500 boards have two DATA connectors — either may be used

**Network noise rules:**
- Minimum 8" separation from cables >400 Vac; 3" from 120 Vac cables; same rules apply when crossing (at right angle is acceptable)
- VFDs: install manufacturer-recommended EMI filters/chokes; ground loops can exist even with proper VFD grounding
- Use LonWorks "life saver" common-mode choke (P/N 180-0028) on nodes near high-noise equipment
- Echelon magnetic shield model 51001R or MTT 220-0044 for FTT-10A transceiver protection

**Network health check (in MT-Alliance software → Network Analyzer):**
- Score 0–10: excellent; 10–20: good; >20: marginal network — improve before commissioning
- Resistance test at cable end (with 52Ω terminator in-circuit): <58Ω = acceptable; >65Ω = fault — check terminal screws, remove damaged segment
- High resistance reading can also be caused by electrical noise (gives false meter readings) or blown-in insulation contacting the cable

---

### Case Control Board — Field Guide

**Inputs:**
- T+AIR: return air temperature — used for case temperature alarm monitoring
- T+COIL: coil temperature — used for superheat calculation; must be located at coil outlet
- T+DEF: defrost termination temperature — opens when coil clears; placement at coil is critical (if it falls off = defrost always runs to max time)
- T+AUX: auxiliary temperature (optional monitoring)
- P_evap: pressure transducer input (0.5–4.5V ratiometric, powered from 5V sensor supply) — used with coil temperature to calculate superheat without a manifold gauge

**Outputs:**
- 12V bipolar stepper motor: drives Sporlan SEI/SER/SERI/SEHI EEV directly — never exceed rated step count
- Fan relay: 5A at 240 Vac, 4.8 FLA
- Defrost relay: 5A at 240 Vac, 1.9A pilot duty (for contactor coil — not direct heater load above 5A)
- Lighting relay: 5A at 240 Vac, 2.4A ballast
- Anti-sweat output: pulsed solid-state relay (SSR), 5V/15mA max

**Supported EEVs:** Sporlan SEI-0.5, -1, -2, -3.5, -6, -8.5, -11, -30; SER-1.5, -6, -11, -20; SER-AA/A/B/C/D; SERI-G/J/K — configure step count to match valve: **SEI-0.5 through -11 = 1,596 steps; SEI-30 = 3,193 steps; SER/SERI = 1,596 steps**; wrong step count strips the drive coupling

**"CDS Invalid" alarm on Micro Thermo Case Controller:**
The Case Controller can also drive Sporlan CDS/CDST EPR valves. "Invalid" alarm means controller cannot confirm valve position. Steps:
1. Check 4-wire cable from board to valve — moisture, loose pins, damage at case junction box
2. Verify 24 Vac at driver board power terminals
3. Measure valve motor resistance: CDS-2/-4/-7 = ~100Ω per phase; CDS-9/-16/-17 = ~75Ω per phase; open or short = replace motor assembly
4. Power-cycle the Case Controller board — listen for clicking during re-initialization (10–15 clicks)
5. Verify step count matches valve: CDS-2/-4/-7 = 2,500 steps; CDS-9/-16/-17 = 6,386 steps

---

### Pressure Transducers — Micro Thermo

All MTT transducers: 5 Vdc regulated (±5%), 8mA current draw; output = ratiometric 0.5–4.5V (proportional to supply); shielded 3-18AWG cable (Belden 8770 or equivalent: black/red/white)

**Install pointing UP** to prevent liquid from pooling in the sensing cavity. Use a siphon loop in high-temperature applications.

| Part No. | Range | Kit P/N | Connection | Application |
|---|---|---|---|---|
| 023-0081 | 100 psig | 952-0001 | 1/8 NPT | HFC low-side |
| 023-0148 | 200 psig | 952-0004 | 1/8 NPT | HFC suction |
| 023-0082 | 500 psig | 952-0002 | 1/8 NPT | CO₂ LT suction (booster) |
| 023-0331 | 600 psig | 952-0007 | 1/4 NPT | CO₂ MT suction |
| 023-0441 | **652 psig** | 952-0018 | 1/8 NPT | **CO₂ MT/LT suction — standard on LMP racks** |
| 023-0387 | **2,000 psig** | 952-0010 | 1/8 NPT | **CO₂ HP gas cooler outlet — standard on LMP racks** |

**Critical: do not swap the 652 psi and 2,000 psi transducers.** The 652 psi unit will rupture if installed on the CO₂ high-pressure side (normal transcritical HP = 900–1,425 psig).

**MT-Alliance configuration:** Physical Type = "Press Med Range" (652 psi) or "Press Med Range (4X)" (2,000 psi); set Manufacturer to "Micro Thermo" and select the part number; confirm the node input and click Diagram button to verify wiring.

---

### Common Faults — Micro Thermo Controllers

| Fault | Likely cause | Check |
|---|---|---|
| Case controller "CDS invalid" | Wiring fault, driver board, wrong step count, failed motor | 4-wire cable, motor resistance, step count config |
| Pressure transducer reading frozen/unrealistic | Wrong transducer range (652 vs 2,000 psi swapped), wiring short, failed sensor | Verify P/N on transducer body; check 5V supply at node |
| Network comm fault (node offline) | LonWorks terminator missing, wire break, noise from VFD | Resistance test at cable end; check terminator (952-0035); rerun Network Analyzer |
| MT-500 sensor readings drifting | 15V sensor power dropped below 13Vdc — too many boards on run | Measure 15V at affected board; shorten wire run or add new transformer |

---

### Parts and Support — Micro Thermo

- **Micro Thermo Technologies (Parker / Sporlan):** sporlanonline.com/micro-thermo | 1-888-664-1406 (Canada) | 1-888-920-6284 (USA)
- **MT-Alliance software:** Available from Sporlan/Parker for network configuration, commissioning, and data logging`


export const EVAPCO_LMP_KNOWLEDGE = `
## Evapco LMP — CO₂ Transcritical Booster Rack Systems

Evapco LMP (formerly Systems LMP Inc., founded 1998) manufactures complete CO₂ booster transcritical rack systems for supermarkets. The Micro Thermo Alliance platform is the integrated rack and case controller.

---

### CO₂ Leak Detection

**CO₂ detector (P/N 023-0388):** Install on rack ±1 ft from the ground (CO₂ is heavier than air and accumulates at floor level); do NOT install near doors, fresh air supply vents, or openings.

**Manual pull station (P/N 961-0001):** Two manual pull stations wired in parallel with the CO₂ detector output; accepts up to one additional leak detector.
- On alarm (CO₂ detector or manual pull): relay R1 signals MT-500 acquisition module (closes contact at terminals 7 & 8 → alarm active); relay R2 closes to force outside air damper open (terminals 9–10) and activate mechanical room evacuators (terminals 11–12)
- Requires 120/208/240 to 24V CT 20VA transformer (P/N 560-0027) — dedicated to this circuit only
- MT acquisition module input: open contact = no alarm; closed contact = alarm active

**CO₂ concentration effects:**
| Concentration | Effect |
|---|---|
| 1% (10,000 ppm) | Breathing increases, impaired hearing, headache |
| 2% (20,000 ppm) | Breathing rate 50% above normal; headaches, tiredness with prolonged exposure |
| 4–5% (40,000–50,000 ppm) | Intoxication, slight choking, breathing 4× normal |
| >10% (>100,000 ppm) | Rapid unconsciousness; potentially fatal |

OSHA PEL for CO₂: **5,000 ppm (8-hour TWA)**. Detector alarm setpoints: 1,000 ppm (early warning), 5,000 ppm (mandatory action/evacuation). Machine room ventilation interlock must be verified at every PM.

---

### System Architecture (Booster Configuration)

- LT booster compressors → discharge into MT suction header (flash injection)
- MT compressors → gas cooler → head pressure throttling valve → flash tank receiver
- Flash gas bypass valve → MT suction header (recirculates flash gas)
- Liquid from flash tank → LT/MT case EEVs

### Key System Setpoints

| Parameter | Setpoint | Notes |
|---|---|---|
| Flash tank receiver | 31°F / 483 psig | Maintained by flash gas bypass valve referencing P05 |
| Head pressure valve — subcritical target | 1.8°F subcooling | Abandons subcooling control below 700 psig minimum |
| Head pressure valve — transcritical | Efficiency algorithm | Abandoned at 1,425 psig maximum; considers compressor power + flash gas % |
| Gas cooler float setpoint | Ambient + 1°F ΔT | Minimum 60°F/750 psig; maximum 85°F |
| Hot gas defrost — supply pressure | 560 psig | V62 regulator maintains; P20 is the reference |
| Hot gas defrost — return pressure | 510 psig | V32 hold-back valve maintains; PO4 is the reference |
| MT superheat target | 36°F | Min 18°F; max 54°F; valve modulation proportional |
| Liquid injection trigger | SH >48°F or discharge >264°F | L15a/b/c solenoids, staged by MT PID |
| Oil regulator setpoint | 580–590 psig | Flash tank pressure +100 psig; Swagelok depressurization regulator |

---

### Flash Tank Operation

- Flash tank receiver pressure held at ~31°F / 483 psig by the **flash gas bypass valve** (references P05)
- **Head pressure valve interlock with flash tank:**
  - Closes when flash tank saturated temp >50°F / 638 psig (prevents overfeed to MT suction)
  - Opens when flash tank saturated temp <23°F / 427 psig (prevents starvation)
- High flash tank level = MT compressors tripped or main EXV overfeeding → liquid carryover risk
- Low flash tank level = EXV underfeeding or MT compressors starving on vapor only → capacity loss

---

### Head Pressure Control

**Subcritical (gas cooler outlet below 87°F / 1,055 psig):**
- HP throttling valve maintains 1.8°F subcooling
- Subcooling = P08 saturated temperature − T05 gas cooler outlet temperature
- Positive subcooling (liquid) = valve opens (reduces pressure) to maintain ≥1.8°F
- Negative subcooling (superheated) = valve closes (increases pressure) to build subcooling
- Minimum setpoint: 700 psig — below this, valve abandons subcooling control and closes to hold 700 psig

**Transcritical (gas cooler outlet above 87°F / 1,055 psig):**
- HP throttling valve uses efficiency algorithm: higher head pressure reduces flash gas in flash tank → MT compressors handle less flash gas → more MT capacity available
- Maximum setpoint: **1,425 psig** — valve opens to protect system above this limit
- Traditional "lower head pressure = better COP" does NOT apply transcritically

**Gas cooler fan control (floating setpoint):**
- Fans modulate/cycle to maintain gas cooler outlet temperature = ambient + 1°F (float set)
- Float minimum: 60°F — fans will not reduce gas cooler outlet below 60°F regardless of ambient
- Float maximum: 85°F — fans will not chase above 85°F regardless of ambient
- 3.6°F deadband: fans increase speed if outlet >setpoint+1.8°F; decrease speed if <setpoint−1.8°F

---

### Hot Gas Defrost Operation

**Valve sequencing:**
| Valve | Refrigeration mode | Defrost mode |
|---|---|---|
| Hot Gas Enable Valve (M1) | Closed (spring-return — fails closed) | Opens; stays open until defrost ends |
| Hot Gas Supply Regulator (V62) | Closed | Modulates to maintain 560 psig supply |
| Hot Gas Return Valve (V32) | Closed | Modulates to maintain 510 psig return inlet |
| Liquid Supply Valve | Open | Closed |
| Suction Stop Valve | 100% open | 0% — closes; slow-opens at set increments after defrost/power outage to protect compressors |
| Case EEV (circuit controller) | Modulates for superheat | Closed — check valve allows hot gas to bypass around EEV |

**Why return pressure matters:** CO₂ must condense in the evaporator coil to release latent heat. Latent heat of CO₂ at 510 psig ≈ 120 BTU/lb. Without condensation (superheat gas only), only 0.20 BTU per 1°F temperature drop — would require ~720 lbs of CO₂ to melt 1 lb of ice. Holding 510 psig return pressure forces condensation → effective defrost.

---

### MT Superheat Control

- MT return gas routed through or around a heat exchanger (suction/gas cooler return)
- Valves V34a and V34b modulate based on measured superheat:
  - 0% position: all gas through heat exchanger (maximum superheat addition)
  - 100% position: gas bypasses heat exchanger (minimum superheat addition)
  - Proportional modulation between min 18°F and max 54°F targets
- LT superheat: valves V31a/V31b exchange heat between LT suction return and main liquid supply
- MT liquid injection de-superheat (L15a, L15b, L15c): inject liquid into flash gas return header upstream of MT suction header
  - PID >5%: L15a only
  - PID >33%: L15a + L15c
  - PID >66%: L15a + L15b + L15c

---

### Oil Management — LMP Racks

**Circuit:** Compressor → oil separator → oil reservoir → compressor crankcase oil feed header

**Swagelok depressurization regulator (between separator and reservoir):**
- Set point: 580–590 psig (essentially flash tank pressure +100 psig)
- Oil reservoir sits at flash tank pressure; separator feeds oil down continuously
- Discharge gas bypasses toward flash tank slightly upstream of the flash gas bypass valve (prevents liquid contamination of MT suction during high-flash-gas events)

**Separator to reservoir solenoid (M3):**
- >5% combined LT+MT suction capacity → M3 CLOSED
- <5% combined capacity → M3 OPEN (allows oil to drain to reservoir at light loads)

**Oil regulator adjustment procedure:**
1. Verify rack is active and head pressure is above 650 psig
2. Attach gauge to oil reservoir service valve
3. Slowly close ball valve at top of reservoir (purge line to flash tank)
4. Slowly turn Swagelok regulator stem clockwise to increase setting
5. Target 580–590 psig (flash tank setpoint +100 psig); adjustment is very sensitive — be patient
6. If setting overshoots, open purge line ball valve, reduce setting, and restart
7. Open purge line ball valve when properly set
8. Recheck regulator setting at full rack capacity — discharge gas temperature affects the setting

---

### LMP Rack Stop and Restart Procedure

**Stopping (from the LMP manual):**
1. Put rack into manual mode from MT-Alliance; disable all compressors one by one
2. Allow all circuits to complete defrost cycles (prevents ice buildup after shutdown)
3. Close liquid line solenoids at rack level
4. Allow suction pressure to pump down (<50 psig) before stopping final compressor
5. Close gas cooler inlet isolation valve (prevent refrigerant migration to gas cooler overnight)
6. De-energize all control power in correct sequence per electrical panel

**Restarting:**
1. Verify oil level in oil reservoir (sight glass at least half-full)
2. Open gas cooler isolation valve
3. Energize control power; allow MT-Alliance to initialize and run self-check
4. Enable compressors one at a time — allow suction pressure to stabilize between additions
5. Verify flash tank pressure comes up to setpoint (483 psig); verify head pressure control is active
6. Verify CO₂ detector is active and machine room ventilation interlock is functional
7. Check all valve positions via MT-Alliance HMI before leaving site

---

### Common Faults — LMP CO₂ Racks

| Fault | Likely cause | Check |
|---|---|---|
| Flash tank pressure uncontrolled (hunting) | Flash gas bypass valve fault, P05 transducer offset | Verify P05 transducer calibration; check FGB valve position via HMI |
| High HP alarm (>1,425 psig) | GC fans not staging; GC coil fouled; HPV stuck closed; extreme ambient | Check fan VFD status; GC approach temp; HPV actuator signal |
| Low LT suction (LP alarm) | CCMT/EEV all closed, LT compressor tripped, EVRA solenoid not opening | Check case controllers for defrost active; verify EVRA coil energized |
| Oil reservoir low / compressor oil alarm | M3 solenoid stuck closed; separator bypass; oil regulator over-set | Verify M3 solenoid; check Swagelok regulator pressure vs setpoint |
| Superheat hunting on MT circuits | V34 exchanger valve calibration drift; P08 transducer offset | Recalibrate transducer; verify valve percent in MT-Alliance service screen |
| CO₂ detector alarm with no visible leak | False trigger from VFD/motor EMI near detector; detector self-test due | Relocate detector away from EMI sources; test and recalibrate detector |

---

### Parts and Support — Evapco LMP

- **Evapco LMP:** evapcolmp.ca | Technical support: 450-629-9864
- **MT-Alliance software (Micro Thermo / Parker Sporlan):** sporlanonline.com/micro-thermo | 1-888-664-1406 (Canada) | 1-888-920-6284 (USA)
- **LMP startup form:** P/N "LMP Start up form 2022-07-13" — complete at every new commissioning; records all setpoints, transducer calibrations, and valve positions as-built baseline`


export const PENN_CONTROLS_KNOWLEDGE = `
## Penn Controls (Johnson Controls) — Temperature & Pressure Controls

Penn Controls is a Johnson Controls brand. All Penn part numbers carry dual labeling (e.g., "Johnson Controls A421" = "PENN A421"). Products are identical regardless of label; documentation uses both names interchangeably.

---

### A19 Series — Electromechanical Temperature Controls

**Overview:** Single-pole, liquid-filled bulb-and-capillary controls. Available in SPST and SPDT versions. Line voltage rated; no external power supply required.

**SPDT terminal identification:**
- **R** (red) = Common
- **Y** (yellow) = Closes on temperature RISE (cooling output — opens as temp drops)
- **B** (blue) = Closes on temperature DROP (heating output — opens as temp rises)

**Wiring rules:**
- For a compressor on a COOLER: wire load between R and Y; compressor energizes when temp rises above setpoint and drops out at setpoint minus differential
- For a defrost heater or heat call: wire between R and B
- Never jumper Y and B together — direct short across the switch

**Setpoint and differential:**
- Setpoint is adjusted by rotating the dial to the desired cut-in temperature
- Differential is the gap between cut-in and cut-out; fixed on some models, adjustable (1–10°F typical) on others
- Adjustable differential knob is behind the cover; a larger differential = fewer short cycles = more temperature swing
- Constant differential — the gap does not change with ambient or load

**Manual reset models:** Trip-Free® design. After a high-limit trip, must press physical reset button. Cannot be defeated by wiring a jumper across the switch. Use for unmonitored refrigeration to prevent nuisance restarts.

**Typical operating ranges by model suffix:**
| Suffix | Range | Application |
|---|---|---|
| A19ABC | 20–80°F | Walk-in cooler |
| A19BBC | –40–30°F | Walk-in freezer / low-temp |
| A19DAC | 40–110°F | Condenser fan cycling |
| A19EBC | 60–160°F | Defrost termination / high-limit |

**Field checks:**
1. Set dial to a temperature above or below current actual temperature to verify contact switching — use a multimeter across R-Y and R-B
2. Check capillary for kinks (kink = control locks at fixed temperature)
3. Verify bulb is clamped firmly to the suction line or evaporator coil where specified — loose bulb causes hunting

---

### A421 Series — Electronic Temperature Controls

**Overview:** Digital temperature control with backlit LCD, 3-button keypad, and optional keypad lockout. SPDT relay output. Available in 24 VAC and 120/240 VAC versions. Requires A99 NTC sensor (sold separately; P/N A99B-series).

**Terminal block wiring:**
| Terminal | Function |
|---|---|
| C1, C2 | Control power input (24 VAC or 120/240 VAC depending on model) |
| SEN | Sensor signal (either lead of A99 — not polarity-sensitive) |
| COM | Sensor and low-voltage common; connect shield drain here only |
| Y1, R, B1 | SPDT relay output (R = common; Y1 = normally open; B1 = normally closed) |

**Key settings (accessed via 3-button menu):**

| Parameter | Code | Range | Notes |
|---|---|---|---|
| Setpoint | SP | –40 to 212°F | Main cut-in / cut-out temperature |
| Differential | dIF | 1–30°F | Distance between cut-in and cut-out |
| Anti-Short Cycle Delay | ASd | 0–12 min | Minimum off-time; prevents rapid cycling |
| Keypad Lockout | LOC | On/Off | Prevents unauthorized setpoint changes |
| Sensor Offset | OFS | –10 to +10°F | Calibrates reading to match reference thermometer |
| Sensor Failure Mode | SF | On / Off | Relay state if sensor fails or disconnects |
| Temperature Units | °F/°C | F or C | Display units |
| Defrost Interval | dI | 2–24 hr / 0 = disabled | Hours between defrost initiations |
| Defrost Duration | dFt | 1–99 min | Maximum defrost run time |
| Defrost Termination Temp | dtE | –40 to 212°F | Ends defrost early if coil reaches this temp |

**Defrost modes:**
- Off-cycle defrost: compressor off, fans may run, heaters off — uses temperature differential to melt frost; only works for coolers, not freezers
- Electric defrost: relay energizes heater circuit; dFt and dtE control duration; compressor stays off during defrost

**Sensor fault codes (LCD display):**
- **SF + OP**: Open circuit — sensor disconnected, broken lead, or loose terminal
- **SF + SH**: Short circuit — sensor wire shorted to ground or to itself
- Control defaults to SF relay state when fault is active; alarm output (if wired) also triggers

**Critical sensor rules:**
- Only use A99B-xxx sensors — any other sensor type causes calibration error; the A421 expects a specific resistance-temperature curve
- Sensor leads are NOT polarity-sensitive but shield must connect to COM at the control only (isolated at sensor end)
- Maximum sensor lead extension: use 18 AWG for runs >50 ft; 22 AWG minimum for shorter runs

**Compressor control (cooling mode):**
- Y1-R closes when temperature rises above setpoint + differential (compressor ON)
- Y1-R opens when temperature drops to setpoint (compressor OFF)
- ASd timer starts on compressor OFF; compressor cannot restart until ASd expires

---

### A28 Series — Two-Stage Temperature Controls

**Overview:** Electromechanical two-stage control with two independent SPDT switches. Used for staged compressor capacity or independent zone control. Liquid-filled bulb.

**Stage sequencing:**
- Stage 1 cuts in first at the warmer (higher) setpoint
- Stage 2 cuts in at a lower temperature (more cooling demand)
- Interstage differential (adjustable 2–7°F) prevents both stages from running simultaneously when one stage is adequate
- Both stages cut out at their individual setpoints minus their individual differentials

**Application:** Walk-in freezer with two-speed compressor or two separate compressors; stage 2 provides capacity for high pull-down load, stage 1 maintains temperature at light load.

---

### P70 / P72 Series — Dual Pressure Controls

**Overview:** Electromechanical bellows-type dual pressure control. Combines high-pressure cut-out and low-pressure cut-in/cut-out in a single housing. Line voltage, SPST or SPDT. Standard on rack systems, condensing units, and walk-in compressors.

**High-pressure side:**
- Scale shows CUT-OUT setting only
- Fixed differential (~65 psi) — cut-in = cut-out minus 65 psi
- Turn range screw clockwise to raise the cut-out setting
- **Auto-reset models (P70AB):** Resets automatically when pressure drops below cut-in; used for low-pressure control
- **Manual reset high-side (P70NB and similar):** Requires Trip-Free® button press after high-pressure cut-out; prevents compressor restart until fault is investigated

**Low-pressure side:**
- Scale shows CUT-IN setting
- Separate differential adjustment (MICRO-SET models: turn diff screw clockwise = larger differential = lower cut-out)
- CUT-OUT = CUT-IN − differential

**Typical setpoints by refrigerant:**

| Refrigerant | Application | Low-Side Cut-In | Low-Side Cut-Out | High-Side Cut-Out |
|---|---|---|---|---|
| R-404A | Walk-in cooler (35°F) | 55–60 psig | 45–50 psig | 200–220 psig |
| R-404A | Walk-in freezer (−10°F) | 15–20 psig | 8–12 psig | 185–200 psig |
| R-448A | Walk-in cooler (35°F) | 58–63 psig | 48–53 psig | 210–230 psig |
| R-448A | Walk-in freezer (−10°F) | 16–21 psig | 9–13 psig | 195–215 psig |
| R-134a | Reach-in cooler (38°F) | 25–30 psig | 18–22 psig | 130–150 psig |

**Pressure tap location:**
- High-side tap: into the discharge line downstream of compressor, upstream of condenser (or on liquid line post-receiver)
- Low-side tap: suction line at compressor inlet
- Always tap from the TOP of horizontal lines — prevents oil and liquid from entering bellows; oil slugging in bellows = stuck control = compressor won't restart

**P72 vs P70:** P72 adds a second set of contacts for alarm or auxiliary function; otherwise identical.

---

### P78 Series — Compact Dual Pressure Controls

**Overview:** Modern IP54-rated dual pressure control. SPDT switch action. Same function as P70 but in a smaller, weather-resistant enclosure suited for outdoor or equipment-mounted applications.

**Key differences from P70:**
- IP54 enclosure (P70 is NEMA 1 / open)
- Compact form factor for tight equipment compartments
- SPDT contacts allow use as alarm or auxiliary output on one side
- Same pressure range options as P70; compatible with same refrigerants

---

### A99 NTC Temperature Sensors

**Compatible with:** A421 series controllers only. Do NOT substitute generic NTC sensors.

**Specifications:**
- Type: Negative Temperature Coefficient (NTC) thermistor
- Resistance at 77°F (25°C): 10 kΩ
- Resistance at 32°F (0°C): ~32 kΩ
- Resistance at −4°F (−20°C): ~100 kΩ
- Not polarity-sensitive (two identical leads)
- Operating range: −40 to +221°F (−40 to +105°C)

**Model variants:**
| Part No. | Housing | Application |
|---|---|---|
| A99B-200C | Bare leads, 6 ft cable | Suction line or evaporator coil clamp |
| A99B-200D | Bare leads, 20 ft cable | Remote sensing applications |
| A99B-GND | Grounded housing | Panel or surface mounting |
| A99B-PHD | Pipe immersion, 3/8" well | Liquid line or pipe immersion |

**Extension wiring:** Use shielded twisted pair; 22 AWG for runs up to 50 ft, 18 AWG for 50–200 ft. Connect shield drain to A421 COM terminal only; tape off shield at sensor end to prevent inadvertent grounding.

---

### Common Faults and Field Fixes — Penn Controls

| Symptom | Likely Cause | Check / Fix |
|---|---|---|
| A421 display shows "SF OP" | Open sensor circuit | Check sensor lead continuity; re-seat terminals; verify sensor cable not cut |
| A421 display shows "SF SH" | Shorted sensor or cable | Disconnect sensor; if fault clears, sensor or cable is bad; check for pinched/wet cable |
| Compressor short cycling | ASd too short or differential too narrow | Increase ASd (minimum 3–5 min for most compressors); increase differential 1–2°F |
| A421 reads 5–8°F off actual | Sensor not in contact with measured air/surface | Reposition sensor; add thermal grease or clamp for line-contact sensors |
| A19 contact won't switch | Kinked capillary or lost charge | Check capillary for kinks; if bulb temp far outside setpoint range and no switching, replace control |
| A19 cycles too fast | Differential too narrow | Increase differential adjustment; ensure bulb is not picking up case heat from nearby source |
| P70 low-pressure lockout at startup | Low-pressure cut-out too high or system undercharged | Verify refrigerant charge; adjust cut-out down if setpoint is confirmed correct |
| P70 high-pressure cut-out (auto-resets) | Condenser fouled, fan failure, high ambient | Clean condenser; verify all condenser fans running; check discharge pressure |
| P70 high-pressure cut-out (manual reset keeps tripping) | Repeated overpressure condition | Find and fix root cause before resetting — condenser, fan, refrigerant overcharge, or non-condensables |
| P70 won't cut back IN on low pressure | Differential set too wide, or bellows stuck | Check differential setting; tap housing gently while watching pressure; if bellows stuck, replace control |
| P78 reads pressure but won't switch | SPDT contacts welded from inrush | Test with multimeter across all three contact terminals; replace if welded |

---

### Application Quick Reference

**Walk-in cooler (35–38°F product):**
- A421 setpoint: 37°F, differential: 2°F, ASd: 3 min
- P70 low-side cut-in: 57 psig (R-404A), cut-out: 47 psig; high-side cut-out: 205 psig

**Walk-in freezer (−10°F product):**
- A421 setpoint: −12°F, differential: 3°F, ASd: 5 min
- Electric defrost: dFt 30 min, dtE 55°F, dI every 6–8 hours
- P70 low-side cut-in: 17 psig (R-404A), cut-out: 9 psig; high-side cut-out: 195 psig

**Reach-in display case (34–38°F):**
- A19 setpoint: 36°F, differential: 2–3°F (expect frequent cycling with door openings)
- P70 low-side cut-in: 57 psig (R-404A); high-side cut-out: 210 psig

**Condenser fan cycling (A19, cooling mode):**
- Use A19DAC range (40–110°F); wire load between R and Y (fans cycle OFF when condensing pressure drops)
- Setpoint: 110°F equivalent condensing temp; differential: 10°F (fans off at 100°F, on at 110°F)

---

### Parts and Support — Penn Controls

- **Johnson Controls / Penn Controls:** johnsoncontrols.com/hvac-equipment/unitary-hvac/commercial-package | 1-800-861-3999
- **Documentation:** docs.johnsoncontrols.com — search "Penn Controls" or part number (A421, A19, P70, etc.)
- **A99 sensor compatibility note:** Only A99B-series sensors are compatible with A421 controls — confirm part number before ordering replacements`


export const CARNOT_KNOWLEDGE = `
## Carnot Réfrigération (M&M Carnot / Johnson Controls) — CO₂ Transcritical Systems

Carnot Réfrigération was founded in 2008 in Trois-Rivières, Quebec as the first North American manufacturer of CO₂ transcritical refrigeration systems. Acquired by M&M Refrigeration in 2019 (forming M&M Carnot), then by Johnson Controls in June 2023. All post-2023 service goes through Johnson Controls. Support email: **carnotservice@jci.com**.

Carnot specializes in **CO₂ transcritical booster rack systems** for supermarkets and condensing units for walk-in and warehouse applications. They hold patents on ejector-based defrost and flash gas recovery for transcritical CO₂.

---

### Product Lines

| Product | Type | Capacity | Application |
|---|---|---|---|
| CAR-090 (legacy) | Transcritical booster rack | — | Supermarket multi-temp |
| Aquilon DS™ | Air-cooled CO₂ condensing unit | 10–75 TR | Walk-in / warehouse |
| Aquilon Chill™ | CO₂ chiller / heat pump | — | Process cooling, DHW |
| Aquilon Industrial™ | Large-capacity CO₂ rack | — | Cold storage warehouse |

**CAR-090 (supermarket rack):** Carnot's original transcritical booster product for supermarkets. Uses Micro Thermo (MT-Alliance) as the integrated rack and case controller — see the Micro Thermo knowledge section for board, network, and controller detail. All system setpoints are documented on the startup sheet inside the electrical cabinet.

---

### System Architecture — Transcritical Booster

Carnot supermarket systems follow the standard CO₂ booster configuration:

- LT booster compressors → discharge into MT suction header (or directly into flash injection port)
- MT compressors → gas cooler → high-pressure (HP) throttling valve → flash tank receiver
- Flash gas bypass valve → MT suction header (recirculates flash gas to avoid liquid carryover)
- Liquid from flash tank → LT and MT case EEVs

**Transcritical operation (ambient > ~75°F / 24°C):**
- CO₂ leaves gas cooler as supercritical fluid (no two-phase region)
- HP throttling valve controls high-side pressure using an efficiency algorithm — target is NOT minimum pressure; higher HP reduces flash gas, improving MT capacity
- Maximum HP limit: ~1,450 psig (100 bar); valve opens to protect system

**Subcritical operation (ambient < ~75°F):**
- CO₂ condenses in gas cooler; HP valve controls to maintain subcooling (typically 1.5–3°F)
- Minimum HP limit: ~700 psig (48 bar); system can operate with free cooling below this

**Free cooling capability:** When ambient drops below ~54°F (12°C), gas cooler fans can reject enough heat that no compression is needed on the high side — significant energy savings in Canadian winters.

---

### Ejector Technology (Carnot Patent)

Carnot's key differentiator is an integrated ejector for flash gas recovery and defrost:

**How it works:**
- High-pressure CO₂ from the gas cooler outlet drives the ejector as the motive fluid
- Ejector entrains lower-pressure flash gas from the flash tank, boosting it to an intermediate pressure
- Net effect: flash gas bypass compressor work is partially replaced by ejector work (no moving parts)
- COP improvement: 10–42% over non-ejector transcritical systems, depending on ambient

**Defrost (ejector-assisted):**
- Traditional hot gas defrost uses high-pressure discharge gas; Carnot's system routes gas cooler outlet through the ejector circuit to achieve defrost pressure without drawing from compressor discharge
- Eliminates the energy penalty of compressor-driven defrost
- Defrost pressure and return pressure setpoints are set per system; verify on startup sheet

**Field note:** If flash tank pressure is unstable or the ejector appears to be bypassing (both motive and suction pressures equalizing), suspect a stuck or leaking ejector check valve or a fouled ejector nozzle. Contact M&M Carnot service — do not attempt ejector disassembly in the field without factory guidance.

---

### Gas Cooler and GC Sensor

**Gas cooler type:** Air-cooled; fans are VFD-controlled and stage/modulate based on gas cooler outlet temperature and ambient.

**Floating setpoint control:**
- Gas cooler outlet target = ambient + approach ΔT (typically 1–3°F above ambient)
- Minimum outlet setpoint: ~60°F (prevents liquid floodback at low ambient)
- Maximum outlet setpoint: ~85°F (fans run flat out above this ambient)

**GC outlet temperature sensor (E00XXX series, per Carnot install guide):**
- Sensor must be installed on the **common header** if multiple gas cooler sections are in parallel — not on an individual circuit
- Immersion depth: sensor tip must contact refrigerant flow, not sit in stagnant pocket
- Shield grounded at controller end only; sensor cable must be shielded twisted pair
- Verify reading against NIST-traceable reference thermometer at commissioning; log in startup sheet
- Drift >1°F from reference: recalibrate offset in controller; drift >3°F with no fixable cause: replace sensor
- **Critical:** an offset GC sensor drives incorrect HP throttling valve decisions — too cold a reading forces pressure too low (subcooling error); too warm forces pressure too high (efficiency loss and potential HP alarms)

**HP throttling valve:** Sporlan GC or FGB series, stepper motor driven; controlled by rack controller (Micro Thermo or Danfoss AK-PC). Verify valve position and modulation in software after sensor calibration.

---

### Control Platforms

Carnot racks have been built with multiple controller platforms depending on vintage and customer spec:

| Platform | Typical use | Notes |
|---|---|---|
| Micro Thermo MT-Alliance | CAR-090 and early supermarket racks | Full case and rack control; LonWorks network; see Micro Thermo section |
| Danfoss AK-PC 782A | Later supermarket racks | Designed specifically for transcritical CO₂; CALM and ALC algorithms |
| Carel pRack | Some M&M Carnot builds post-2019 | CO₂-specific rack controller; dual HP valve control |
| Parker Sporlan PSK3LX | GC and FGB valve control module | Often used alongside Micro Thermo for HP valve sequencing |

**Identify the controller from the electrical panel door or startup sheet before troubleshooting.** Setpoints, alarm codes, and navigation differ entirely between platforms.

---

### Commissioning Checklist (CAR-090 / Carnot Supermarket Racks)

The Carnot startup sheet is stored inside the electrical cabinet — all setpoints, transducer calibrations, and valve positions must be recorded there at first commissioning.

**Pre-start checks:**
1. All isolation valves open; verify no locked-out valves
2. Pressure relief valves installed and set per nameplate; verify blow-off piping is routed to safe discharge location
3. All sensor wiring complete; verify 5V supply to each pressure transducer
4. CO₂ detector active; ventilation interlock tested (open damper and evacuators on alarm)
5. Oil reservoir sight glass at least half-full
6. Electrical panel: verify VFD drives programmed for correct fan/compressor rotation

**Startup sequence:**
1. Energize control power; allow controller to initialize and complete self-check
2. Enable gas cooler fans; confirm VFD ramps and fan rotation is correct
3. Enable MT compressors one at a time — allow suction pressure to stabilize (≥30 s) between additions
4. Confirm flash tank pressure rises to setpoint (~483 psig / 31°F)
5. Confirm HP throttling valve begins modulating; observe gas cooler outlet temperature
6. Enable LT booster compressors; confirm LT suction pressure is stable
7. Enable case circuits one at a time; confirm EEVs open and superheat is controlled
8. Minimum **18°F (10°C) superheat** at compressor inlet before loading — any lower, stop and investigate EEV or sensor
9. Record all setpoints, transducer readings, and valve positions on startup sheet

---

### Common Faults — Carnot CO₂ Systems

| Fault | Likely cause | Check |
|---|---|---|
| HP alarm (>1,450 psig) | GC fans not running or VFD fault; GC coil fouled; HP valve stuck; very high ambient | VFD status; GC fan rotation; check HP valve signal vs position in controller |
| Flash tank pressure unstable / hunting | Flash gas bypass valve fault or GC sensor offset driving wrong HP | Verify GC sensor calibration; check FGB valve position via controller |
| Ejector bypassing (motive = suction pressure) | Ejector check valve stuck open or leaking; nozzle fouled | Contact M&M Carnot — do not disassemble ejector in field |
| MT suction low (LP alarm) | EEVs all closed; MT compressor tripped; solenoid not opening | Check case controllers for active defrost; verify solenoid coil voltage |
| LT suction low (LP trip) | LT booster tripped; LT EEVs all closed; LT defrost active on all circuits | Check LT case controllers; verify booster compressor status |
| Compressor slugging / liquid in suction | Superheat <18°F; EEV overfeeding; sensor off coil | Check superheat reading; re-seat suction temperature sensor on line |
| High discharge temperature | Low refrigerant charge; GC heat rejection poor; compressor valve wear | Verify refrigerant weight in system; GC approach temperature; discharge valve leak-by test |
| GC sensor reading stuck/frozen | Sensor shorted or open; wiring fault | Verify sensor resistance; check 5V supply; compare to hand-held thermometer |
| CO₂ detector alarm (no leak) | EMI from VFD near detector; self-test cycle due; detector end-of-life | Relocate detector from EMI source; check detector test/cal date |
| Oil reservoir low | M3 solenoid stuck closed; oil regulator mis-set; separator bypass | Check Swagelok oil regulator pressure; verify M3 solenoid energization at light load |
| Defrost incomplete / ice buildup | Defrost termination sensor off coil; defrost duration too short; return pressure too low | Reattach termination sensor; extend max defrost time 5 min increments; verify return-side setpoint |

---

### Parts and Support

- **M&M Carnot service (Johnson Controls):** carnotservice@jci.com | 24/7 emergency: 1-866-227-2750
- **Documentation:** mmcarnot.com | docs.johnsoncontrols.com (search "Carnot" or "Aquilon")
- **Startup form:** Filed inside electrical cabinet at every new commissioning — request copy from M&M Carnot if missing
- **Note on fault codes:** Specific alarm codes depend on the controller platform (Micro Thermo, Danfoss AK-PC, Carel pRack). Refer to that controller's documentation for code lookup.`


export const EMERSON_E2_E3_KNOWLEDGE = `
## Emerson E2 / E3 Supervisory Store Controllers

![Emerson Electric logo](https://upload.wikimedia.org/wikipedia/commons/5/50/Logo_Emerson.svg)

### Product Overview
| Controller | Generation | Display | OS | Key Use Case |
|------------|-----------|---------|-----|--------------|
| E2 | Legacy (still widely installed) | Resistive colour touchscreen | Embedded Linux | Full-store refrigeration + HVAC + lighting |
| E3 | Current (replacement for E2) | Capacitive colour touchscreen | Android-based | Full-store + cloud connectivity + analytics |

Both are **site controllers**: one unit manages all refrigeration circuits, HVAC units, and lighting schedules for an entire store. They talk down to individual case controllers and rack controllers via LonWorks (FTT-10) or Modbus RS-485; they talk up to enterprise software (Emerson CoolTerm / Site Supervisor) via TCP/IP.

---

### E2 Architecture

#### Hardware
- **CPU board** — runs the application; has RJ-45 Ethernet + two COM ports
- **I/O boards** (16AI, 8RO, 8DO, 8AO) — expand to handle sensors and relays
- **E-Link bus** — RS-485 chain connecting I/O expansion boards to the CPU
- **COM1/COM2** — serial ports used for LonWorks adapter (LON-RS485 gateway) or direct Modbus to rack controllers
- Power: 24 VAC; internal battery backs RTC and alarm memory for ~72 h

#### Versions / Firmware
- **E2 RX** — original retail controller
- **E2 BX** — HVAC/building-only variant
- **E2 XM** — expanded I/O version (more circuits)
- Firmware versions: **2.x, 3.x, 4.x** — check via *Main Menu → System → About*
- 4.x firmware required for R-448A/R-449A refrigerant property tables

#### Circuit Types
| Type | What it controls |
|------|-----------------|
| Refrigeration Circuit | One case section — setpoint, defrost, alarms, sensor inputs |
| CC (Case Controller) | Groups circuits from a connected case controller (Emerson EC2, EC3, Retail Solutions CC) |
| Rack | Condensing unit or parallel rack — suction setpoint, capacity steps |
| HVAC | Rooftop unit — heating/cooling stages, economizer |
| Lighting | Relay-based on/off schedule |

---

### E3 Architecture

#### Key Differences from E2
- **Android OS** with capacitive touchscreen — navigation uses swipe/tap gestures
- **Built-in Wi-Fi + Ethernet** — native cloud/remote access without separate modem
- **I/O boards** are same E-Link protocol as E2 but physically different connectors on some models
- Supports **BACnet/IP** and **OPC-UA** in addition to Modbus and LonWorks
- Configuration via built-in web interface (Chrome/Edge on LAN) or on-screen
- Remote access via **Emerson Site Supervisor** (cloud) or **CoolTerm** (local PC software)

#### E3 Supervisor Reference Card — Key Shortcuts
- **Home screen → swipe left** — live alarm list
- **Home screen → swipe right** — circuit overview grid
- **Top-right menu → Setpoints** — quick setpoint access without full navigation
- **Top-right menu → Reports** — energy, alarm history, defrost log exports
- Factory reset: hold power + home buttons for 10 s (only use as last resort — wipes all programming)

---

### Common Configuration Tasks

#### Adding a New Refrigeration Circuit (E2 and E3)
1. Main Menu → Configuration → Circuits → Add
2. Select circuit type (Refrigeration)
3. Assign input sensors: supply air (SA), return air (RA), defrost termination (DT), liquid line (LL)
4. Set setpoints: *Setpoint*, *Setpoint High Limit*, *Setpoint Low Limit*
5. Configure defrost: type (electric/hot gas), initiation (time clock or adaptive), termination (temperature or time-out), drip time
6. Assign to a display group for UI organisation
7. Save and verify circuit appears in live view with sensor readings

#### Defrost Schedule
- Up to **8 defrost initiations per day** per circuit
- Adaptive defrost: controller tracks actual defrost frequency and dynamically adjusts — requires *Adaptive Defrost* option licence on E2; built-in on E3
- Defrost termination temperature: typically **50–55°F (10–13°C)** for medium-temp cases; **65°F (18°C)** for low-temp
- Failed defrosts (time-out) generate a **Defrost Fail** alarm — check termination sensor calibration first

#### Setpoint Schedules (Night Setback)
- E2: *Setpoint Scheduling* — assign AM/PM setpoints + schedule periods
- E3: *Setpoint Profiles* — more flexible multi-period scheduling
- Night setback raises case temperature setpoint (e.g. +3°F) during closed-store hours to save energy

#### Alarm Configuration
- Priority 1 (Critical) — activates dial-out / email notification immediately
- Priority 2 (Standard) — logged; notification after configurable delay
- Priority 3 (Informational) — logged only
- **Deadband**: always set a return-to-normal deadband to prevent chattering alarms (e.g., high temp alarm at +10°F with 2°F deadband returns at +8°F)

---

### Networking & Communications

#### LonWorks to Case Controllers
- FTT-10 twisted-pair network (no polarity) — max segment length **500 m (1640 ft)**
- Termination resistors **105 Ω** at each end of the bus
- Each case controller node has a **Neuron ID** — recorded during commissioning; used for replacement
- Max 127 nodes per LonWorks segment; use a **LonWorks repeater** for longer stores
- Common fault: node goes offline → check terminators, then check 24 VAC power at the case controller, then re-bind the node in the E2/E3 network configuration

#### Modbus to Rack Controllers
- RS-485 half-duplex, typically **9600 or 19200 baud, 8N1**
- Each rack controller has a unique **Modbus address** (1–247)
- Verify address on the rack controller itself before troubleshooting in E2/E3
- Common fault: all racks show comms error → check RS-485 wiring polarity (A+/B−), termination resistor (120 Ω) at far end, and baud rate match

#### TCP/IP Remote Access
- E2: requires static IP or DHCP reservation — set in *Main Menu → Network Setup*
- E3: configure in *Settings → Network*; supports both Ethernet and Wi-Fi
- **CoolTerm** (PC software): connects over LAN, provides full configuration, alarm acknowledgement, data trending
- **Site Supervisor** (cloud): Emerson's CMMS integration; requires active subscription and outbound port 443

---

### Alarm Diagnostics — Common Issues

| Alarm | Likely Cause | First Check |
|-------|-------------|-------------|
| Circuit High Temp | Case load high, defrost fail, sensor offset | Check defrost log; verify return air sensor |
| Circuit Low Temp | Setpoint too low, valve stuck open, sensor offset | Check supply air sensor and TXV superheat |
| Defrost Fail | Termination sensor not reaching setpoint | Sensor location; faulty heater (electric defrost); check hot gas solenoid |
| Comms Loss (LON node) | Wiring fault, power loss at case, node lockup | 24 V at case controller; terminators; rebind node |
| Comms Loss (Modbus) | Address conflict, baud rate mismatch, wiring | Verify address on rack controller; check A/B polarity |
| Sensor Out of Range | Sensor open/short or wiring fault | Measure sensor resistance at terminal block; compare to temp/resistance table |
| Low Battery | Internal RTC battery below threshold | Replace CR2032 (E2) or Li-ion pack (E3) — log a maintenance record |
| Rack Suction High | Suction setpoint not being maintained | Check compressor capacity; verify rack controller communications |

---

### Sensor Wiring & Input Types

#### E2 Analogue Inputs (16AI board)
- **0–5 V** — most pressure transducers (output 0.5–4.5 V)
- **4–20 mA** — alternative pressure transducer wiring; requires 250 Ω shunt resistor at board
- **NTC 10kΩ @ 77°F** — Emerson standard temperature sensors (same table as A99 series)
- **0–10 V** — humidity or CO sensors

Input type is set per channel in board configuration — mismatch is the single most common sensor reading error.

#### Sensor Replacement
- NTC sensors: measure resistance with a DMM — compare to published temp/resistance table
- At **32°F (0°C)** → ~32 kΩ; at **77°F (25°C)** → ~10 kΩ; at **104°F (40°C)** → ~5 kΩ
- Pressure transducers: verify supply voltage (typically 5 VDC) before condemning transducer

---

### 12 Common Field Mistakes

1. **Input type not configured** — NTC sensor on a 0–5 V input reads garbage; always set input type per channel after wiring.
2. **Defrost termination sensor in wrong location** — sensor must be on the coldest coil section; placing on drain pan gives premature termination and wet coils.
3. **Adaptive defrost left enabled during initial commissioning** — adaptive algorithm needs 2–3 weeks of stable data; disable until store is running normally.
4. **Night setback too aggressive** — raising setpoint >5°F during pull-down period causes temperature excursions; test in small increments.
5. **LonWorks terminators missing** — network appears to work at first, but intermittent node dropouts occur; always verify both end terminators.
6. **Modbus address 0 assigned to rack controller** — address 0 is the broadcast address; assign 1 or above.
7. **Time clock not synced after power failure** — E2 battery keeps RTC, but verify time/date after any extended outage; defrost at wrong times causes temperature problems.
8. **Alarm deadbands set to zero** — causes chattering alarms and floods the alarm log; minimum 2°F deadband on temperature alarms.
9. **Replacing E2 CPU board without exporting configuration** — always back up configuration to USB/PC via CoolTerm before any board replacement; factory defaults lose all circuit programming.
10. **Forgetting to set correct refrigerant in rack circuit** — pressure-temperature conversions in alarm thresholds depend on the refrigerant selected; R-448A vs R-404A pressures differ significantly.
11. **Using telnet/HTTP to configure E3 without disabling the on-screen lock** — screen lock on E3 does not lock out web interface; a padlock icon on screen means screen only, not full lock.
12. **LON node replacement without Neuron ID** — when replacing a case controller board, the new Neuron ID must be re-commissioned in the E2/E3; node does not auto-register.

---

## CPC (Computer Process Controls) — Brand Context & Peripheral Hardware

### What "CPC" Means in the Field
**CPC = Computer Process Controls, Inc.** — a Kennesaw, Georgia company founded 1984 that designed the entire E2/E3 product family. Emerson Climate Technologies acquired CPC; the brand is now under **Copeland** (Emerson spun off its climate division in 2023).

When a technician says "the CPC board" they can mean any of:
- The **E2 or E3 store controller** itself
- A **MultiFlex I/O board** (the RS485 expansion boards)
- A **CC-100 / CS-100 case controller** (Echelon-networked, E2 only)
- A **legacy CCB** (Case Control Board from the RMCC era)
- A **Gateway board** (protocol translator on the RS485 network)

CPC document numbers follow the **026-XXXX** pattern (e.g., 026-1610 = E2 standard manual, 026-1701 = peripherals I/O manual, 026-1704 = MultiFlex board manual).

---

### E2 Controller Model Variants

| Series | Application | Models | Max Circuits |
|--------|-------------|--------|-------------|
| **RX** | Refrigeration (supermarkets) | RX-100, RX-300, RX-400, RX-500 | 48–128 |
| **BX** | Building / HVAC only | BX-300, BX-400 | — |
| **CX** | Convenience store (HVAC + refrigeration) | CX-100, CX-300, CX-400, CX-500 | 48–128 |

**RX-300 vs RX-400:**
- RX-300: 1 condensing system, 4 suction groups, up to 48 standard circuits
- RX-400: 2 condensing systems, 4 suction groups, up to 64 standard circuits — used in larger stores with two independent refrigeration systems

Part numbers follow **845-XYYY** (e.g., 845-1300 = RX-300, 845-1400 = RX-400, 845-3400 = CX-400).

---

### RS485 I/O Network — MultiFlex Boards

The primary expansion network inside the store connects the E2/E3 to distributed I/O via **RS485 at 9600 baud** (default; configurable). Up to **127 devices** per COM port. Standard wiring: Belden 9493 or equivalent 3-conductor shielded cable, daisy-chain topology, termination jumpers at both ends.

#### Board Types

| Board | Channels | Function |
|-------|----------|----------|
| **16AI** | 16 analog inputs | Temperature, pressure, humidity sensors |
| **8RO** | 8 relay outputs | Compressor stages, solenoids, fans |
| **8DO** | 8 digital outputs | Low-current switching |
| **4AO** | 4 analog outputs | 0–10 V or 4–20 mA control signals |
| **MultiFlex Combo** | Mixed | Presents to E2 as 16AI + 8RO + 4AO + 8DO simultaneously |
| **8ROSMT** | 8 relay outputs | Surface-mount relay board; activates/deactivates 8 loads |
| **MultiFlex ESR** | Expanded | Used for distributed refrigeration case control on larger systems |
| **Gateway Board** | — | Protocol translator; connects RS485 network to third-party systems; mounts on 3″ snap track |

#### DIP Switch Addressing (RS485 Network)

Each board must have a unique **Network ID** of the same board type on the same COM port segment.

- Boards are numbered **starting from 1** per type (e.g., four 16AI boards = IDs 1, 2, 3, 4; three 8RO boards = IDs 1, 2, 3)
- On **MultiFlex Combo boards**, addressing is split across two DIP switch banks:
  - **S3, switches 1–5**: 16AI (input) network address
  - **S4, switches 1–5**: 8RO (relay output) address
  - **S4, switches 6–8**: 4AO (analog output) address
- 5-bit switch = addresses 1–31 per board type per segment
- **Baud rate switch**: one dedicated switch; must match E2 COM port configuration (default 9600)
- **Address 0 is invalid** — board will not communicate; common cause of "board not found" on initial setup

#### Input Types on 16AI (must match wiring)

| Input Type | Range | Typical Use |
|-----------|-------|-------------|
| 0–5 V | 0.5–4.5 V active | Pressure transducers (most common) |
| 4–20 mA | — | Pressure transducers (needs 250 Ω shunt at board) |
| NTC 10 kΩ | — | Temperature sensors (Emerson standard) |
| 0–10 V | — | CO₂ / humidity sensors |
| Digital (dry contact) | Open/closed | Door switches, pressure switches |

**Input type must be set per channel in the E2/E3 software** — mismatch is the single most common cause of bad sensor readings after board installation.

---

### Echelon / LonWorks Case Controllers (E2 Only — NOT available on E3)

The E2 supports Echelon (LonWorks FTT-10) for smart distributed case controllers, added via a plug-in card (P/N 638-4860). **E3 has no Echelon support** — Echelon devices must be replaced with BACnet/Modbus equivalents during an E3 upgrade.

| Device | Function |
|--------|----------|
| **CC-100** | Case Controller — controls lights, fans, defrost, and refrigeration for a single display case section |
| **CS-100** | Case Circuit Controller — controls a single refrigeration circuit |
| **16AIe** | 16 analog input board (Echelon version) — discontinued |
| **8ROe** | 8 relay output board (Echelon version) — discontinued |

**Echelon wiring rules:**
- FTT-10 twisted-pair, no polarity, max segment **500 m (1640 ft)**
- Termination resistors **105 Ω** at each physical end of the bus
- Max **127 nodes per segment**; use a repeater for long stores
- Each node has a unique **Neuron ID** — record it at commissioning and stick label on the board
- Node replacement: new board's Neuron ID must be manually re-commissioned in the E2 network screen

---

### Legacy CCB (Case Control Board) — RMCC Era Hardware

The CCB was the distributed case controller in the pre-E2 RMCC system (discontinued 1998). E2 added CCB support in **firmware version 2.30** — RX-300 and RX-400 only (RX-100, BX, CX do not support CCB).

**Critical CCB integration notes (from CPC Tech Bulletin 026-4119):**
- CCBs communicate at a **fixed 19200 baud** (non-negotiable, hard-coded)
- E2 default I/O baud rate is 9600 — you **must change the COM2 port baud rate to 19200** when using CCBs
- Best practice: dedicate one COM port exclusively to CCBs; put all other I/O boards on the other COM port
- CCBs are added in the E2's "Configured I/O" screen; circuits are mapped in "Case Control Associations"
- Original RMCC COM A/D network supported up to **31 devices per segment** — same limit applies on E2

---

### E2 → E3 Upgrade Hardware Notes

| Feature | E2 / E2E | E3 (Lumity) |
|---------|----------|-------------|
| Echelon support | Yes (plug-in card) | **No** — CC-100/CS-100 not supported |
| BACnet/Modbus | Yes | Yes |
| COM ports | COM 1–4 | COM 1–4 + COM 7 (additional, electrically isolated) |
| COM 2 isolation | Not isolated | Electrically isolated |
| Mounting | E2E mounting points | **Same** mounting points — drop-in physical replacement |
| I/O wiring | COM 1–4 connectors | Direct plug-in from E2 — **no rewiring needed** |
| CPU speed | Baseline | 12× faster |
| RAM | Baseline | 16× more |

**Upgrade checklist:**
1. Export full E2 configuration to USB via CoolTerm before shutdown
2. Document all Echelon node Neuron IDs — these devices will need replacement
3. Verify all case controllers on the RS485 I/O network are BACnet or Modbus (not Echelon-only)
4. E3 mounts on same panel cutout — connector pinout is compatible for COM 1–4 I/O boards
5. Re-import configuration on E3; verify sensor readings circuit by circuit before enabling setpoint control`


export const SYSTEM_DIAGNOSTICS_KNOWLEDGE = `
## Refrigeration System Diagnostics — Fault Finding by Symptom

This guide covers systematic diagnosis for HFC multiplex parallel rack systems (R-404A, R-448A, R-449A) and CO₂ transcritical booster rack systems. Diagnose in order: take readings first, understand the pattern, then test the most likely cause.

---

### Step 1 — Record a Complete System Snapshot Before Touching Anything

| Reading | How to Get It | Why It Matters |
|---------|--------------|----------------|
| Suction pressure(s) | Gauge at suction header; or store controller | Convert to saturation temp — compare to setpoint |
| Discharge/head pressure | Gauge at discharge; or store controller | Convert to sat temp — compare to ambient |
| Suction line temp | IR or clamp thermocouple at suction header | Calculate superheat = suction line temp − sat temp |
| Liquid line temp | At king valve outlet or liquid header | Calculate subcooling = sat temp at condensing − liquid temp |
| Ambient temperature | Outside + machine room | Condenser performance baseline |
| Compressor amps | Clamp meter on each leg | Overload, voltage imbalance, capacity issues |
| Case temperatures | Store controller alarm list or walk-in thermometer | Identifies which circuits are affected |
| Oil level / pressure | Sight glass; oil pressure differential gauge | Floodback, oil return problems |

---

### High Suction Pressure

**Definition:** Suction saturation temperature significantly above setpoint (e.g., setpoint −10°F, actual sat = +15°F).

#### Too much heat load reaching the system
- Multiple circuits in defrost simultaneously — check defrost schedule overlap
- Evaporator fan motors failed — feel/listen for airflow at each case
- Evaporator coils iced over — check defrost termination sensor location and setpoint
- Product over-temperature on load-in day
- Anti-sweat heaters stuck ON — measure door heater current; very common in summer

#### Excess refrigerant flow (flooding)
- TXV bulb lost charge or stuck open → superheat near 0°F, suction line frosting
- EEV stuck open or controller fault → check EEV position feedback on controller
- Floodback from a circuit with failed defrost termination solenoid

#### Loss of compression capacity
- Compressor suction valve failure — pull valve plates; compare compressor differential across each cylinder
- Capacity control (unloaders) stuck unloaded — verify cylinder unloader solenoids
- Digital Scroll solenoid failure — always in modulated/unloaded position

#### CO₂ booster specific
- MT EEVs flooding: check MT suction superheat at each circuit
- LT compressors not running when they should: verify LT suction setpoint
- Flash tank pressure too high: HP valve underpressure setpoint or GC outlet sensor reading high

---

### Low Suction Pressure

**Definition:** Suction saturation temperature significantly below setpoint; compressors running but pulling pressure down.

#### Insufficient refrigerant flow
- Plugged filter-drier: measure pressure drop across drier; >2–3 psi drop on liquid line = replace
- Strainer screen restricted: check after filter-drier or at TXV inlet
- Low refrigerant charge: cross-check with **low subcooling** (< 5°F subcooling confirms low charge)
- Liquid solenoid partially closed or stuck: verify voltage at coil; check plunger movement
- TXV hunting or underfed: check superheat; high and unstable = TXV hunting

#### Low ambient / low head pressure affecting TXV feed
- TXVs require adequate pressure differential to feed — below ~50 psi differential the valve starves
- Install head pressure control if not present; minimum condensing pressure ≈ **200 psig for R-404A** (≈89°F / 32°C sat), **175 psig for R-448A** (≈78°F / 26°C sat) — below these, TXVs starve and liquid flash gas forms in the liquid line

#### Over-capacity for the load
- Too many compressors on; LP cutout set too low; suction setpoint too aggressive
- Night setback too deep — setpoint drops faster than load drops

#### CO₂ booster specific
- Flash tank pressure low → check HP valve overshooting
- LT suction too low with all LT compressors running: check LT EEV feeds

---

### High Discharge / Head Pressure

**Definition (HFC):** Discharge saturation temperature more than 25–30°F above ambient. **Definition (CO₂):** GC outlet above floating setpoint target.

#### Condenser / gas cooler issues (most common)
- **Dirty condenser coil** — most common cause; inspect and clean coil fins; use coil cleaner and low-pressure rinse
- Failed condenser fan motor(s) or blade — check each fan individually
- Fan cycling controls set too tight — condenser fans short-cycling off; verify fan controller setpoints
- Discharge air recirculation — check for missing baffles; ensure 3-foot minimum clearance on discharge side
- High ambient temperature exceeding design limit (most HFC condensers rated to 95–105°F ambient)

#### Refrigerant overcharge
- Tell: high head pressure + **high subcooling** (>15°F)
- Verify: check total system charge weight if records available; recover refrigerant incrementally

#### Non-condensables (air in system)
- Diagnosis: isolate receiver, let system equalize 15 min, compare pressure to refrigerant sat temp at ambient — if pressure is higher than it should be, non-condensables are present
- Source: improper evacuation during installation or repair; nitrogen break during repair left in system

#### CO₂ GC high pressure
- GC outlet sensor drifted high → HP valve closes too early → pressure rises; verify sensor calibration (±1.5°F max)
- GC fans all running? Check power and motor condition
- GC coil fouled: inspect and clean
- HP valve mechanical failure: stuck closed or slow to open; manual bypass test
- Adiabatic system: verify water supply pressure and pad saturation

---

### High Superheat

**Definition:** Superheat >15°F above target for medium-temp, >20°F for low-temp circuits.

#### Insufficient refrigerant flow to the evaporator
- TXV ice blockage at bulb or valve body (ice on valve body is the tell) → recover and replace, check moisture content
- TXV undersized or adjusted too tightly → measure P-T curves; adjust stem ½ turn open at a time
- EEV opening percentage low on controller display → check controller sensor inputs and setpoint
- Plugged liquid line filter-drier — see high superheat + low subcooling together

#### Low system charge
- Pattern: **high superheat + low subcooling + low suction pressure** = textbook low charge
- Verify with leak detector before adding refrigerant

#### Low head pressure starving TXV
- Follow head pressure control troubleshooting above
- Verify head pressure control setpoint is appropriate for refrigerant type

#### Mechanical restriction at evaporator
- Evaporator coil blocked with ice — check defrost operation; manually defrost and recheck
- Liquid solenoid stuck partially closed — measure pressure drop across solenoid body

---

### Low Superheat / Liquid Floodback

**Definition:** Superheat < 5°F; liquid refrigerant migrating to suction header and compressor.

#### Symptoms of active floodback
- Suction line sweating or frosting back to compressor
- Compressor crankcase sweating
- Oil sight glass foamy or oil level dropped
- Slugging noise from compressor
- CoreSense (Copeland) or controller logging floodback events
- Compressor running rough or with reduced compression ratio

#### Causes
- **TXV sensing bulb not clamped to suction line** — most common; bulb must be clean, tight, insulated, and correctly positioned (4 o'clock or 8 o'clock on horizontal suction line)
- TXV bulb charge migrated to coldest point (liquid-charged bulb installed in freezer) → replace with cross-charged bulb
- TXV oversized for actual load — valve always opening wide; replace with correct capacity
- EEV controller sensor failure or control loop malfunction → force EEV to manual, verify superheat
- Defrost termination solenoid leaking after defrost — liquid drains into suction line; replace solenoid

#### Immediate action
- Close expansion valve (or reduce EEV opening)
- Check crankcase heater function — warm oil before restart
- Check oil dilution: if oil is very thin/clear, run crankcase heater 4+ hours before starting

---

### Oil Problems

#### Oil Level Low / Oil Pressure Differential Trip

**HFC systems:**
- High floodback diluting oil — address floodback first
- Oil separator bypass: check float valve function; verify differential across separator
- Insufficient suction line velocity to return oil (below 1,500 FPM in vertical up-risers; below 700 FPM in horizontal runs) — check line sizing
- Oil trapped in long horizontal runs — verify 1/4″ per 10 ft slope toward compressor
- Multiple suction group system: verify each suction group has oil return strategy

**CO₂ systems (unique challenges):**
- CO₂ fully miscible with POE oil — oil migrates throughout system easily but can accumulate in flash tank
- Oil separator differential pressure: if drop across separator is low, separator not working
- Oil level controllers (Kriwan INT69, Emerson OMB, Traxoil): verify sensor signal and float operation
- LT circuits: oil return velocity is critical at very low temperatures — check line sizing for low-temp suction
- After extended shutdown: CO₂ absorbs deeply into oil; **never start compressor without running crankcase heater for minimum 4 hours** (or until compressor case is warm to touch)
- Oil pulse return: some CO₂ systems use periodic EEV pulse to purge oil from evaporators; verify pulse schedule in controller

---

### Compressor Diagnostics

#### Won't Start
1. Check crankcase heater — cold compressor with oil foaming on start = heater failed
2. Check all safety controls: HP cutout, LP cutout, oil pressure differential, motor protector (manual reset?)
3. Check control circuit: 24 V at contactor coil? Contactor pulling in?
4. CoreSense lockout (Copeland): read fault code on CoreSense module
5. Check phase rotation on 3-phase (scrolls run backwards if phases reversed → no compression, just noise)

#### Trips on High Pressure
- Follow high discharge pressure diagnosis
- Check HP cutout setpoint vs. manufacturer spec (Copeland ZB scroll: 450 psig R-404A, 400 psig R-448A)
- HP cutout continuity when cool — fails open on some models; test with ohmmeter

#### Trips on Low Pressure (or Runs to LP Cutout)
- Follow low suction pressure diagnosis
- LP cutout setpoint: verify against manufacturer minimums
- Common cause: refrigerant charge low or solenoid closed overnight

#### Discharge Temperature Too High
- Limit: **225°F (107°C) for HFC scrolls** (Copeland ASTP activates near 280°F — that is a last resort, not a target)
- Causes: high compression ratio (high head / low suction), high superheat at suction, inadequate cooling of motor
- Check: suction superheat not excessive (>35°F causes motor overheating in hermetic compressors)

#### Amperage Analysis (3-Phase)
| Reading | Likely Cause |
|---------|-------------|
| All phases high | High head pressure, mechanical drag, overcharge |
| All phases low | Low suction pressure, internal valve failure, unloaded |
| Phase imbalance >2% | Utility voltage imbalance — damages windings over time; document and report to utility |
| One phase very low | Open winding or single-phasing — shut down immediately |

---

### CO₂ Transcritical — System-Level Fault Patterns

#### GC Pressure Uncontrolled Rise
1. GC fan(s) failed — verify speed/direction on all fans
2. HP valve stuck closed or slow — manual bypass test; check actuator signal
3. GC outlet sensor drifted high — HP valve thinks GC is overcooled; calibrate sensor
4. Ambient above design limit — reduce compressor capacity; increase fan speed
5. GC coil severely fouled — clean immediately; refrigerant cannot reject heat

#### Runs Subcritical When Ambient Demands Transcritical (>88°F / 31°C)
- GC outlet temperature exceeding critical point (87.7°F / 31°C) but HP valve not opening enough
- GC outlet sensor reading lower than actual → HP valve under-opening → check sensor

#### Runs Transcritical at Low Ambient (Wasting Energy)
- HP valve stuck in partially closed position — not allowing pressure to drop
- Wrong setpoint curve for the season — verify controller configuration

#### Flash Tank Level Problems
- **Level too low:** LT load high, LT EEVs opening wide; check LT superheat — if also low, EEVs flooding
- **Level too high:** MT load insufficient to draw down flash tank; verify MT circuit operation
- Level sensor failure: check float or capacitive sensor output signal

#### MT/LT Suction Pressure Crossover
- LT suction should always be lower than MT suction
- If LT suction equals MT suction: intermediate check valve failed (bi-flow check or non-return valve)
- High-pressure gas flowing from MT side into LT side: LT compressors work against higher-than-expected pressure

---

### Quick Diagnosis Matrix — Reading Patterns

| Suction | Head Pressure | Superheat | Subcooling | Most Likely Diagnosis |
|---------|--------------|-----------|------------|----------------------|
| High | High | Low | Normal/High | Overcharge + condenser problem |
| High | Normal | Low (~0°F) | Normal | TXV/EEV stuck open — floodback |
| High | Normal | Normal | Normal | Compressor valve failure or excess load |
| Low | High | High | Low | **Low refrigerant charge** |
| Low | High | High | Normal | Liquid line restriction (drier, strainer) |
| Low | Normal | High | Low | Low charge confirmed |
| Low | Normal | High | Normal | TXV restricted or solenoid closed |
| Normal | High | Normal | High | Refrigerant overcharge |
| Normal | High | Normal | Normal | Condenser fouled or fan failure |
| Normal | Normal | High | Normal | Isolated circuit problem — not system-wide |
| Normal | Low | Low | Low | Low ambient with no head pressure control |

---

### Systematic Elimination Order

When you have a problem circuit but system pressures look normal:

1. **Verify the refrigerant is flowing** — is the liquid solenoid energised? Is there a temperature drop across it?
2. **Check the expansion device** — superheat at evaporator outlet; compare to target
3. **Check the evaporator** — fan motors running? Coil iced? Airflow blocked?
4. **Check the defrost** — was there a recent defrost? Did it terminate properly?
5. **Check sensors** — is the thermostat/case controller reading correctly?
6. **Check the circuit wiring** — solenoid coil resistance (typically 200–400 Ω for 24 VAC coils; open coil = OL on meter)

When the problem is system-wide (all circuits affected):

1. **Suction header first** — read suction sat temp vs. setpoint
2. **Compressor deck** — all compressors running that should be?
3. **Head pressure** — condenser fans all running?
4. **Liquid line** — filter-drier pressure drop? Subcooling at condenser?
5. **Charge verification** — subcooling + suction superheat + suction pressure pattern`


export const DEFROST_KNOWLEDGE = `
## Defrost Systems — Deep-Dive Troubleshooting Guide

Defrost is the single most common source of service calls in supermarket refrigeration. Most temperature alarms, wet coils, high energy bills, and product loss trace back to defrost problems. This guide covers all three types used in commercial refrigeration with systematic fault diagnosis for each.

---

### Defrost Fundamentals

**Why defrost is needed:** Every refrigerated evaporator coil operates below 32°F (0°C) on medium-temp circuits and well below freezing on low-temp. Moisture in the air that passes through the case freezes onto the coil fins. Without defrost, the coil becomes a solid block of ice, airflow stops, and the case warms.

**Three types used in supermarket refrigeration:**
| Type | Heat Source | Best For | Main Risk |
|------|-------------|----------|-----------|
| Electric | Resistance heaters in coil | Low-temp frozen food | Heater element failure; high energy use |
| Hot gas | Compressor discharge refrigerant | Medium-temp; low-temp when sized right | Oil slugging; sequencing problems |
| Off-cycle | Ambient air (no active heat) | Medium-temp only; mild climates | Frost build-up if defrost interval too short |

---

### Electric Defrost

#### How It Works
Electric resistance heaters are embedded in or clipped to the evaporator coil. When defrost is initiated, refrigerant solenoids close (isolating the circuit), evaporator fans stop, and heaters energize. Heat melts frost off the coil; condensate drains to a heated drain pan and out through a drain line heater. Defrost terminates when a temperature sensor on the coil reaches a setpoint, or when a time-out limit is hit.

#### Defrost Initiation
- **Time-clock (scheduled):** Fixed times per day set in the case controller or store controller
  - Typical: 2–4 defrosts per day for medium-temp; 4–6 for low-temp
  - Initiation at: 0200, 0800, 1400, 2000 (typical 6-hour interval for medium-temp)
- **Adaptive / Demand:** Controller analyzes actual frost load and only defrosts when needed
  - Saves energy significantly (up to 30% on defrost energy)
  - Requires temperature sensors to function correctly
  - Disable during initial 2–3 week commissioning period

#### Defrost Termination
- **Temperature termination (primary):** Sensor on coldest coil section reaches setpoint
  - Medium-temp coils: typically **50–55°F (10–13°C)**
  - Low-temp coils: typically **55–65°F (13–18°C)**
  - Sensor must be clamped to the coldest area of the coil — usually the bottom or rear section
- **Time-out fallback:** Maximum defrost duration regardless of termination sensor
  - Typical: 30–45 min for medium-temp; 45–75 min for low-temp
  - If time-out is consistently activating instead of temperature termination → investigate
- **Drip time:** Delay after heaters off before fans restart; allows condensate to drain
  - Typical: 3–5 minutes; too short = water blown onto product

#### Heater Wiring and Testing
- Most commercial coil heaters are **240 VAC**, wired in parallel sections
- Total heater load: typically 1–3 W per cubic foot of case volume
- **Testing a heater element:**
  1. Disconnect power at the defrost contactor
  2. Ohmmeter across each heater section terminals
  3. Open circuit (OL) = failed element; typical resistance 20–100 Ω depending on wattage
  4. Shorted to ground = element insulation failure; replace immediately
- **Defrost contactor:** check contacts for pitting/welding; high-resistance contacts cause partial heat
- **Drain pan heaters:** 40–60 W typically; test same way; failed drain pan heater = frozen drain = overflow

#### Electric Defrost Fault Diagnosis

| Symptom | Likely Cause | Check First |
|---------|-------------|-------------|
| Coil icing up, defrost not clearing | Heater element(s) failed | Ohmmeter test on each section; check contactor |
| Defrost times out every cycle | Termination sensor wrong location or failed | Move sensor to coldest coil section; check sensor resistance |
| Drain overflowing onto floor | Drain pan heater failed or drain line frozen | Test drain pan heater; clear drain line with hot water |
| Water dripping on product after defrost | Drip time too short | Increase drip time by 2 min increments |
| Case temp rises too high during defrost | Defrost duration too long; case not isolated properly | Verify liquid solenoid closes fully; check defrost duration setting |
| Fans restart too early (frost blowoff) | Drip time too short or fan-delay thermostat failed | Check fan-delay thermostat (if fitted); increase drip time |
| Heaters energize but coil stays frozen | 240 V circuit open on one leg (losing 120 V) | Check both legs of 240 V supply to defrost contactor; look for open neutral or leg |
| Heaters run but case temp alarm activates | Heaters undersized or defrost interval too short | Increase defrost frequency; check case door gaskets for air infiltration |

---

### Hot Gas Defrost

#### How It Works
Hot gas defrost diverts compressor discharge gas (which is very hot — typically 150–220°F / 65–105°C) into the evaporator coil. The hot refrigerant condenses in the coil, releasing heat that melts frost. Condensed liquid is returned to the system via a check valve and liquid return line.

#### Two-Pipe vs Three-Pipe Systems

**Two-pipe (simple hot gas):**
- Hot gas solenoid on discharge line opens → hot gas enters coil from the inlet
- Condensed liquid backs up and exits through the liquid line check valve
- Simple; works for medium-temp applications
- Risk: liquid slugging if gas cools too fast in a heavily iced coil

**Three-pipe (KoolGas / pressure-actuated):**
- Dedicated hot gas supply line (large diameter)
- Separate liquid return (drain) line with back-pressure valve
- Liquid return check valve prevents reverse flow
- Smoother defrost; better for low-temp and longer runs
- Hussmann KoolGas is the most common three-pipe system; uses a back-pressure (check) valve set at ~20–25 psig to maintain minimum pressure in the coil during defrost

#### Hot Gas Defrost Sequence

1. **Pre-defrost:** Liquid line solenoid closes; fans stop; system pumps down the circuit
2. **Hot gas on:** Hot gas solenoid opens; discharge gas flows into evaporator
3. **Defrost running:** Coil pressure rises as gas condenses; frost melts; condensate to drain pan
4. **Termination:** Temperature sensor on drain pan or coil outlet reaches setpoint (typically 50°F / 10°C for medium-temp); or time-out
5. **Pressure equalization:** Brief delay with hot gas solenoid still open to bleed excess pressure (prevents liquid slugging on restart)
6. **Drip time:** Fans remain off; condensate drains
7. **Fan restart:** Fans come on; liquid solenoid opens; circuit returns to refrigeration

#### Hot Gas Defrost Fault Diagnosis

| Symptom | Likely Cause | Check First |
|---------|-------------|-------------|
| Coil not defrosting fully | Hot gas solenoid not opening fully; inadequate hot gas supply pressure | Verify solenoid coil voltage; check hot gas header pressure during defrost (minimum 150 psig R-404A) |
| Compressor tripping on LP during defrost of adjacent circuit | Hot gas defrost pulling suction pressure on active circuits | Stagger defrost schedules; ensure pump-down before hot gas opens |
| Oil slugging noise at compressor after defrost | Liquid carryover from coil returning to suction header | Check equalization timing; verify back-pressure valve setting on 3-pipe system |
| Defrost terminates too quickly (frost not cleared) | Termination sensor in warm spot on coil | Relocate sensor to coldest point (near coil inlet, bottom section) |
| Coil re-freezes immediately after defrost | Drain pan heater failed; condensate not clearing | Test drain pan heater; verify drain open |
| Hot gas runs but no temperature rise in coil | Back-pressure valve stuck open (3-pipe) — pressure not building | Test BPV: manually restrict outlet; if coil pressure rises, valve is passing |
| Suction pressure drops severely during hot gas | Hot gas solenoid leaking through during refrigeration mode | Test solenoid: feel hot gas line — warm when should be cold = leaking |
| Liquid hammering in piping at defrost start | Liquid trapped in hot gas line | Verify hot gas line pitch (slope toward coil); add drip leg if needed |

---

### Off-Cycle (Natural) Defrost

#### How It Works
The refrigeration circuit simply shuts off — fans may continue running (using ambient store air to melt frost) or also stop. No additional heat source is used. Relies entirely on the warm air in the store to melt frost.

#### When It's Applicable
- **Medium-temperature cases only** (dairy, deli, produce) — coil operates above −5°F (−20°C); light frost accumulates
- Ambient store temperature **above 55°F (13°C)**
- Cases with **good door/night curtain sealing** (low frost load)
- NOT suitable for low-temp frozen food cases — frost load too heavy; defrost time too long; product temperature risk too high

#### Typical Settings
- Defrost frequency: 2–4 times per day
- Duration: 20–45 minutes (fans off increases effectiveness)
- Termination: time-only (no temperature sensor needed for basic off-cycle)
- Fan arrangement: fans-off off-cycle is more effective than fans-on; but fans-on is simpler

#### Off-Cycle Defrost Fault Diagnosis

| Symptom | Likely Cause | Check |
|---------|-------------|-------|
| Heavy frost build-up despite defrosts | Defrost frequency too low or duration too short; or ambient humidity very high | Increase defrost frequency; consider switching to electric or hot gas |
| Coil never fully clears | Defrost duration too short | Extend duration; or add one more defrost per day |
| Case temperature too high during defrost | Ambient temp high; long defrost duration | Shorten defrost or add night curtains; lower case setpoint slightly |
| Frost concentrated on bottom of coil | Air short-cycling in case; door gaskets failed | Check gaskets; verify night curtain fit; check fan baffling |

---

### Defrost Termination Sensors — Placement Rules

Correct sensor placement is the single most important factor in defrost performance. A sensor in the wrong location causes:
- Premature termination → frost not fully cleared → re-icing during operation
- Late termination → excessive heat → product temperature rise → food safety risk

**Electric defrost — termination sensor must be at the coldest coil location:**
- For horizontal coils: bottom-rear of the coil (last area to defrost)
- For vertical coils: center of the coil (highest frost density)
- Must be **in contact with a coil fin or tube**, not floating in air
- Insulate the sensor mounting to prevent it reading air temperature instead of coil temperature

**Hot gas defrost — termination sensor placement:**
- **Drain pan thermostat** (most common): mounted in drain pan, not on coil; set at 50–55°F
  - Advantage: confirms condensate is liquid (coil is above freezing)
  - Risk: drain pan can warm up while coil still has ice at the back
- **Coil outlet sensor**: measures temperature of refrigerant leaving coil during defrost; more accurate for full-coil clear
- If using drain pan termination and coils consistently don't clear fully → add a second sensor at coil inlet and use the later-terminating of the two

**Setpoint guide:**
| Application | Termination Setpoint | Notes |
|-------------|---------------------|-------|
| Medium-temp electric | 50–55°F (10–13°C) | Lower end for dairy (humidity sensitive) |
| Low-temp electric | 55–65°F (13–18°C) | Higher setpoint needed to clear deep frost |
| Medium-temp hot gas | 50–55°F (10–13°C) drain pan | |
| Low-temp hot gas | 55–60°F (13–16°C) coil outlet | |
| CO₂ off-cycle | 45–50°F (7–10°C) | Lower setpoint acceptable; less heat available |

---

### CO₂ System Defrost Specifics

CO₂ refrigeration uses different defrost strategies depending on the temperature level:

#### Medium-Temp (MT) CO₂ — Off-Cycle or Electric
- MT cases in CO₂ booster systems commonly use **off-cycle** defrost (light frost load; higher evaporating temps)
- Electric defrost used for higher humidity applications (produce, fresh meat)
- MT EEVs close during defrost; fans stop or continue at low speed

#### Low-Temp (LT) CO₂ — Hot Gas or Electric
- **Hot gas:** Uses CO₂ discharge gas from LT compressors; same principles as HFC hot gas but CO₂ pressures are much higher
  - LT CO₂ discharge during hot gas: typically 400–600 psig — verify pipe and valve ratings
  - Back-pressure valve on LT CO₂: set at approximately 290–435 psig (20–30 bar) depending on application
- **Electric:** Simpler; used when hot gas routing is complex

#### CO₂ Defrost Fault Patterns
- **High discharge pressure during hot gas defrost:** Coil pressure rising excessively — back-pressure valve stuck closed or set too high
- **LT compressors trip on high pressure during defrost:** Other LT circuits receiving hot gas pressure spike — stagger defrosts; verify isolation
- **Flash tank pressure rise during defrost:** Condensed CO₂ from defrost returning to flash tank faster than system can handle — check liquid return check valves

---

### Adaptive Defrost — How Controllers Manage It

**Basic adaptive algorithm (most store controllers):**
- After each refrigeration period, the controller measures how far case temperature drifted from setpoint
- If temperature drifted significantly → frost load was high → keep current defrost schedule
- If temperature held stable → frost load was low → skip next defrost or extend interval
- Over 1–2 weeks, the controller settles into the minimum defrost schedule for that load

**Commissioning note:** Disable adaptive defrost for the **first 2–3 weeks** of operation. The algorithm needs a stable baseline. A store with high humidity or frequent door openings during fit-out will create an artificially high frost load that confuses the algorithm.

**When adaptive defrost causes problems:**
- Infrequent defrost leading to heavy frost → manually initiate defrost, then check adaptive log
- Adaptive reducing defrosts too aggressively during high-humidity season → set a minimum defrost frequency floor (e.g., minimum 2 per day regardless of algorithm)

---

### 12 Common Defrost Mistakes

1. **Termination sensor not touching the coil** — floating in air; reads ambient; terminates too early every cycle.
2. **Termination sensor on drain pan instead of coil for electric defrost** — drain pan warms quickly; coil still partly frozen; termination is premature.
3. **Drip time set to zero** — fans restart immediately after heaters off; water is blown onto product; case humidity rises; re-frost accelerates.
4. **No time-out backup on electric defrost** — if termination sensor fails open, heaters run indefinitely; product is lost and heaters may burn out.
5. **All circuits defrosting simultaneously** — suction pressure spikes dramatically; compressors may trip; product temperatures in non-defrost circuits rise; stagger defrosts by 15–30 min.
6. **Drain line heater failed and not noticed** — slow seasonal problem; drain clogs, pan overflows, water on floor; checked only after leak complaint.
7. **Hot gas defrost on multiple adjacent circuits simultaneously** — insufficient hot gas supply pressure; defrosts run long or fail to clear; stagger defrosts.
8. **Adaptive defrost disabled permanently** — wastes significant energy; it was disabled at commissioning and never re-enabled after stability period.
9. **Wrong defrost type after case or coil replacement** — replaced coil has different heater wattage or termination sensor position; original controller settings no longer valid; recalibrate.
10. **Pump-down solenoid not closing before hot gas opens** — liquid refrigerant trapped in coil when hot gas enters; severe liquid hammer; solenoid or coil damage.
11. **Defrost termination setpoint too low for the application** — set at 40°F for a low-temp case; coil barely clears; re-frosts within one refrigeration cycle.
12. **Night curtain not deployed during off-cycle defrost** — enormous additional frost load from warm store air; off-cycle defrost cannot keep up; must switch to active defrost type.`


export const WALK_IN_KNOWLEDGE = `
## Walk-In Cooler and Freezer Troubleshooting

![Walk-in cold room interior with ceiling-mounted evaporators](https://upload.wikimedia.org/wikipedia/commons/c/c6/Cold_Room.jpg "Walk-in cold room with ceiling-mounted unit coolers — typical of the installations covered in this guide")

Walk-ins are some of the most common service calls in commercial refrigeration. Most problems fall into five categories: temperature not maintaining, unit cooler icing, defrost failures, drain/water issues, and door/envelope problems.

---

### Walk-In System Overview

**Typical system components:**
- **Unit cooler (evaporator):** Mounted at ceiling or wall; draw-through (fan pulls air through coil) or blow-through (fan pushes air through coil)
- **Condensing unit:** Remote (rooftop or machine room) or self-contained
- **Thermostatic expansion valve (TXV) or EEV:** At unit cooler
- **Liquid line solenoid:** Controlled by thermostat or case controller
- **Defrost system:** Electric heaters in coil and drain pan; hot gas; or off-cycle
- **Drain pan and drain line:** Drain line heated (freeze protection) in freezers
- **Door(s):** With heater frame, gasket, auto-closer
- **Floor heater (freezers only):** Prevents floor heaving from ground freeze

**Walk-in cooler vs walk-in freezer — key differences:**
| Feature | Walk-In Cooler | Walk-In Freezer |
|---------|---------------|-----------------|
| Box temp | 34–38°F (1–3°C) | −10 to 0°F (−23 to −18°C) |
| Defrost type | Off-cycle or electric | Electric or hot gas |
| Defrost frequency | 1–2× daily | 3–6× daily |
| Drain line | Unheated acceptable | Must be heated (electric or steam) |
| Floor heater | Not required | Required (concrete slab installs) |
| Door frame heater | Optional | Required — prevents ice seal |
| Anti-sweat heaters | Optional | Required at all cold joints |

---

### Temperature Not Maintaining

#### Box temperature too high (cooler or freezer)

**Check the condensing unit first:**
- Is the unit running? Compressor energized? Contactor pulled in?
- Head pressure within range? (See System Fault Diagnosis guide for high head pressure causes)
- Suction pressure — is it at or near setpoint?

**Check the unit cooler:**
1. Evaporator fans all running? A single failed fan motor can cause a large temperature rise — feel for airflow at each fan section
2. Coil iced over? If coil is a solid block of ice, defrost has failed — manually initiate defrost
3. Refrigerant flowing? Feel the suction line at the unit cooler outlet — should be cold and possibly sweating; if warm and dry, refrigerant is not flowing
4. Liquid solenoid energized? Check for voltage at solenoid coil when box calls for cooling
5. TXV feeding? Check superheat at evaporator outlet (clamp thermocouple on suction line before TXV bulb; read suction pressure; calculate superheat)

**Check the box itself:**
- Door gaskets intact and sealing? Hold a dollar bill in the door — should resist pulling out
- Door auto-closer working? Hinges adjusted?
- Door heater frame on, preventing ice seal forming at gasket?
- Large product load recently introduced? Warm product raises temperature temporarily — not a refrigeration fault

#### Box temperature too cold (cooler)
- Thermostat setpoint too low — verify setpoint; calibrate if needed
- Thermostat bulb out of airstream or touching coil directly — reposition
- Liquid solenoid not closing on thermostat satisfied call — check solenoid for bypass

---

### Unit Cooler Icing Up

Evaporator coil icing is the most common walk-in service call after "temperature not maintaining." The coil builds up ice until airflow stops, then the box warms.

#### Defrost not occurring
- Defrost timer not advancing or clock lost power — check timer position; verify 24 V supply to timer
- Defrost contactor not pulling in — check contactor coil, control voltage at terminal
- Defrost heaters failed (all sections) — ohmmeter test; see defrost guide

#### Defrost not completing (partial clearing)
- Defrost termination thermostat in wrong location — must be on coldest coil section
- Termination thermostat setpoint too low — reset to 50–55°F for cooler, 55–65°F for freezer
- Heater wattage insufficient — check nameplate vs. actual load
- Time-out too short — extend by 15-minute increments
- Defrost frequency too low — add another defrost initiation

#### Defrost completing but re-frosting immediately
- Drain pan heater failed — condensate refreezes in drain pan and backs up onto coil
- Drip time too short — fans start before condensate has drained; blown onto coil
- Door left open during or after defrost — warm humid air floods box

#### Defrost completing but moisture blown off coil
- Fans restarting before drip time expires — check fan-delay thermostat (should open circuit to fans below 35°F on coil outlet)
- No drip time configured — add minimum 3–5 minutes

#### Frost on suction line back to condensing unit
- Severe floodback — TXV/EEV overfeeding; see floodback section in system diagnostics guide
- Suction line insulation failed at box penetration — exposed line freezes ambient moisture; replace insulation

---

### Drain Problems

#### Water on floor inside box
- Drain pan overflow: drain line frozen or clogged
  - Freezer drain line heater failed — test drain line heater; clear blockage with warm water
  - Drain line plugged with food debris — clear and sanitize
- Condensate dripping off suction line (poorly insulated penetration)

#### Water on floor outside box (under condensing unit)
- Normal condensate from condensing unit on humid days
- Check that condensate drain from condenser is plumbed correctly

#### Drain line freezing (freezer)
- Electric drain line heater failed — test continuity; typically 5–15 W/ft, 120 or 240 VAC
- Drain line heater thermostat stuck open — test thermostat; some are self-regulating heat tape (no thermostat)
- Drain line run too long without slope — standing water refreezes; recheck slope (1/4″ per foot minimum)

---

### Door and Envelope Problems

#### Excessive frost at door frame
- Door frame heater failed — test heater element; check wiring at hinge termination (flex wire breaks)
- Door heater thermostat setting wrong — verify setpoint (typically maintains frame at 35–40°F)
- Door gasket damaged — replace gasket; check door alignment

#### Ice build-up on floor at door threshold
- Threshold heater failed or never installed — add strip heater at threshold
- Door not sealing at bottom — adjust sweep or add threshold heater

#### Box sweating excessively on exterior panels
- Anti-sweat heater failed on panel joint — test and replace
- Insulation compromised — check for wet panels (wet insulation = severe heat gain; panel replacement needed)

#### Floor heaving (freezer) — thermal expansion cracking
- Floor heater failed — test heater circuits; restore immediately to prevent permanent structural damage
- Floor heater thermostat setpoint wrong — typically set to maintain floor above 32°F beneath slab
- Verify floor heater is on a separate circuit from defrost (must run continuously)

---

### Walk-In Freezer Specific — Floor Heater Systems

Floor heaters prevent ground freeze which can heave and crack concrete slabs. Two types:

**Electric floor heaters:**
- Embedded resistance cables in a concrete slab or under the floor
- Controlled by a thermostat sensing subfloor temperature (typically maintains 40–45°F below slab)
- **Must run continuously** — do not disable, even when unit is not in service; thaw/refreeze cycles cause more damage than continuous freezing
- Test: measure heater circuit resistance (typically 10–50 Ω depending on wattage and zone)

**Glycol/water floor heating systems (larger installations):**
- Circulating pump runs warm glycol through pipes embedded in slab
- Check pump operation, glycol concentration (typically 30% propylene glycol), and heat exchanger condition

**Signs of floor heater failure:**
- Floor cracking or heaving — immediate concern; restore heating and allow slow thaw
- Cold spots on floor surface
- Thermostat reading below 32°F under slab

---

### Unit Cooler Motor and Airflow

#### Evaporator fan motor failure
- Fail on high amps: check for seized bearing (motor hot to touch); replace motor
- Fail on open winding: no current draw; ohmmeter test at motor terminals — open circuit between any two winding leads = failed
- Blade damaged or wrong rotation: check rotation; EC fan motors are polarity-sensitive — verify wiring
- Fan blade hitting shroud: listen; visually inspect; realign or replace blade

#### Airflow distribution
- Baffles missing or damaged: cold air short-circuits back to unit cooler without covering box
- Product stacked too high: blocking airflow paths; re-stack leaving 6-inch minimum clearance to ceiling
- Walk-in too warm at back wall: typical sign of inadequate airflow — check fan delivery, add circulation fan if needed

---

### Walk-In Electrical System

| Component | Test | Typical Values |
|-----------|------|----------------|
| Electric defrost heaters | Ohmmeter, disconnected | 15–80 Ω depending on wattage |
| Drain pan heater | Ohmmeter | 50–200 Ω typically |
| Drain line heater | Ohmmeter | Varies with length; 10–100 Ω |
| Door frame heater | Ohmmeter + heat check | 50–300 Ω; should be warm when energized |
| Floor heater | Ohmmeter by zone | 10–50 Ω per zone |
| Defrost contactor | Contactor coil resistance | 20–100 Ω typical; check contacts for pitting |
| Fan motor winding | Ohmmeter | Should read similar resistance on all three phases (3-phase) |

---

### 10 Common Walk-In Mistakes

1. **Defrost timer not set to correct time** — timer clock wrong after power failure; defrosts run at wrong time; temperature swings confuse staff.
2. **Drain line heater on same circuit as defrost contactor** — heater de-energizes during defrost; drain freezes from condensate; drain overflows.
3. **Floor heater disabled to "save energy"** — floor heaving begins within one season; very expensive repair.
4. **TXV bulb not insulated** — bulb reads ambient air temperature instead of suction line; superheat control lost; floodback or starvation results.
5. **Oversized condensing unit running short cycles** — never runs long enough to pull humidity; box stays at temperature but product frosts from humidity; downsize or add hot gas bypass.
6. **Evaporator fan delay thermostat bypassed** — fans start immediately after defrost; frost blown onto product; box humidity rises.
7. **Door left open during manual defrost** — humid air enters, dramatically increases frost load, extends future defrost times.
8. **Using off-cycle defrost on a freezer** — ambient air cannot supply enough heat to fully clear a low-temp coil; must use electric or hot gas.
9. **Anti-sweat heaters on a timer to save energy** — during high-humidity periods the timer is never enough; panels sweat, drip, promote mold.
10. **Replacing condensing unit without checking refrigerant charge** — unit swapped, refrigerant weight not verified; over or undercharge from day one.`


export const PARALLEL_RACK_KNOWLEDGE = `
## Parallel Rack Systems — HFC Multiplex Troubleshooting

A parallel rack (multiplex rack) is a central refrigeration system where multiple compressors share a common suction manifold, serving multiple refrigerated circuits throughout the store. The rack is the heart of the supermarket refrigeration system; a fault at the rack affects every case on that suction group.

---

### Rack System Architecture

**Core components:**
- **Compressor bank:** 2–8 compressors (scroll, reciprocating, or semi-hermetic) piped to a common suction and discharge header
- **Suction groups:** Separate suction headers for different temperature levels (typically MT = medium-temp, LT = low-temp; some stores have 3 groups)
- **Discharge header → oil separator → condenser → receiver → liquid header → to all circuits**
- **Oil management:** Oil separator, oil level controllers, oil return lines to each compressor crankcase
- **Liquid injection:** On scroll compressors — cools discharge; activated by discharge temperature
- **Head pressure control:** Fan cycling or variable-speed condenser fans
- **Rack controller:** (Emerson E2/E3, Danfoss AK-PC, Micro Thermo) manages staging, setpoints, alarms

**Suction group terminology:**
| Term | Meaning |
|------|---------|
| Suction group / circuit group | Set of circuits that share a suction header and setpoint |
| MT (medium-temp) | Typically −15°F to +25°F suction sat temp; dairy, deli, produce |
| LT (low-temp) | Typically −30°F to −20°F suction sat temp; frozen food, ice cream |
| Setpoint | Target suction saturation temperature for the group |
| Floating suction | Controller raises suction setpoint when load is low — saves energy |

---

### Compressor Staging and Sequencing

**How staging works:**
1. Rack controller monitors suction pressure vs. setpoint
2. If suction pressure rises above setpoint + deadband → stage on (add compressor capacity)
3. If suction pressure drops below setpoint − deadband → stage off (reduce compressor capacity)
4. Staging: scroll compressors typically start in sequence; variable-speed compressors modulate continuously

**Lead/lag assignment:**
- Lead compressor: starts first, stops last — highest run hours
- Lag compressors: come on as load increases
- Rotation: modern rack controllers rotate lead/lag assignment to equalize run hours across compressors

**Capacity modulation:**
- Reciprocating compressors: cylinder unloaders (solenoid-controlled)
- Scroll compressors: Digital Scroll solenoid or variable speed
- Hot gas bypass: used at very low loads to prevent compressor short-cycling (not common on modern systems)

**Staging deadband:**
- Too narrow (< 2 psig): compressors cycle rapidly; excessive starts (scrolls have 10-min restart timer)
- Too wide (> 8 psig): suction pressure oscillates; case temperatures vary

---

### Suction Group Management

#### Floating Suction Setpoint
Modern rack controllers raise the suction setpoint when case temperatures are stable and well below alarm thresholds. This is the single biggest energy-saving feature on a rack.

- **How it works:** Controller checks all circuit temperatures in the group; if all are within X°F of setpoint, suction is raised by Y°F
- **Typical float range:** 2–8°F above base setpoint
- **Benefit:** Higher suction pressure = less compression ratio = significant energy savings
- **Common issue:** Float disabled after a service call and never re-enabled — verify floating is active in rack controller

#### Setpoint Scheduling
- Night setback: raise suction setpoint by 2–5°F during closed-store hours (less traffic = less case load)
- Ensure setback doesn't trigger temperature alarms — verify with case controller alarm thresholds

---

### Oil Management

Oil management is the most common cause of compressor failures on parallel racks. Each compressor must receive adequate oil return continuously.

#### Oil System Components
| Component | Function |
|-----------|----------|
| Oil separator | Removes oil from discharge gas before it enters condenser and circuits; oil returns to crankcase(s) |
| Oil level controller | Maintains correct oil level in crankcase; opens to admit oil from separator when level drops |
| Oil equalization line | Connects crankcases at same height; equalizes oil level passively across all compressors |
| Oil reservoir (sump) | Central oil storage that feeds level controllers |
| Oil heater (crankcase) | Boils off refrigerant absorbed into oil before startup |

#### Oil Fault Diagnosis
**Compressor tripping on low oil pressure:**
1. Check oil sight glass — low or foamy oil = oil return problem or floodback
2. Check oil separator bypass: if separator is bypassing, oil goes straight to system circuits
3. Check oil level controller: sticky float or failed solenoid = oil not feeding crankcase
4. Check equalization lines: blocked = oil level unequal across compressors; only some units get oil
5. Check for refrigerant floodback: oil diluted with liquid refrigerant foams on startup

**Oil foaming on startup:**
- Crankcase heater failed — refrigerant has absorbed into oil overnight; oil becomes frothy when pressure drops on start
- Solution: always verify crankcase heater is warm before starting; add warm-up delay if heater is marginal

**Oil accumulating in circuits (not returning):**
- Suction line velocity too low (common at low-load periods): oil pools in horizontal lines
- Risers too large: oil travels up in the annular film, insufficient gas velocity at low load
- Add suction line accumulator if severe flooding/slugging occurs at startup

---

### Head Pressure Control on Racks

**Fan cycling (simplest):**
- Condenser fans stage on/off based on head pressure or ambient
- Common problem: fans cycling too frequently → head pressure oscillates → suction pressure oscillates → case temps vary

**Variable-speed fans (most common on modern racks):**
- VFD-controlled fans modulate continuously
- VFD fault: fans stop or run at fixed speed; check VFD fault codes
- VFD parameter loss after power failure: head pressure runs uncontrolled; reprogram from backup

**Head pressure setpoint (floating):**
- Modern racks float head pressure as low as practical (saves condenser fan energy)
- Minimum head pressure: ~200 psig for R-404A, ~175 psig for R-448A
- Head pressure too low in cold weather: liquid line subcooling drops → flash gas → TXVs starve → high superheat on multiple circuits simultaneously

---

### Common Rack Fault Diagnosis

#### All circuits on a suction group high temperature simultaneously
This is a rack-level problem, not a case-level problem.
1. **Suction pressure**: Is it at setpoint? If high → not enough compressor capacity → check staging
2. **All compressors running that should be?** Check rack controller status screen
3. **Any compressor locked out?** Check fault log; HP/LP/oil/motor protector trips
4. **Head pressure OK?** If very high, staging may be limited by discharge temperature protection
5. **Liquid line**: Subcooling at rack? If near zero → flash gas → all TXVs starving simultaneously (this mimics refrigerant charge loss)

#### Suction pressure hunting (oscillating ±5 psig)
- Staging deadband too narrow → compressors cycling on/off rapidly
- Floating suction setpoint chasing a moving target → disable float temporarily to diagnose
- One compressor with failed suction valve running but not pumping: capacity is lower than rack controller thinks → widens oscillation

#### Suction pressure too low (running below setpoint)
- Too many compressors on for the load → check minimum run time settings
- Hot gas bypass stuck open → extra capacity being added to suction
- One suction group pulling down another through failed check valve → verify check valves between groups

#### Compressor short-cycling
- Scroll compressor minimum OFF time: typically **3 minutes** (prevents liquid slugging on restart)
- Minimum ON time: typically **30 seconds**; prevents thermal overload
- Rack controller staging minimum times are parameters — verify they are set correctly
- Short-cycling cause: too many compressors relative to load; reduce staging steps or add hot gas bypass

#### Discharge temperature high on one compressor
- Liquid injection solenoid failed (scroll): no liquid injection cooling → discharge rises
- High suction superheat entering compressor → motor not cooled adequately
- Suction valve failure → low compression → heat builds from re-expansion
- High compression ratio → check head pressure; check suction setpoint

#### Compressor not staging on when needed
- LP cutout tripped and manual-reset required
- Contactor failed or control fuse blown
- Rack controller minimum off-time not expired (scroll restart timer)
- Capacity at 100% but suction still rising → undersized rack for load; evaluate compressor sizing

---

### Refrigerant Charge Verification on a Rack

A parallel rack with improper charge exhibits symptoms that can be confused with many other faults.

**Low charge indicators:**
- Low subcooling at liquid header (< 5°F)
- High superheat on multiple circuits simultaneously
- Low suction pressure despite low case temperatures
- Liquid line sight glass showing bubbles consistently

**High charge indicators:**
- High subcooling (> 20°F) with normal or elevated head pressure
- Elevated suction pressure
- Oil dilution (refrigerant dissolving into oil in receiver)

**Charge verification procedure:**
1. Stabilize system: all compressors running in steady state, all circuits in refrigeration
2. Measure subcooling at liquid header outlet
3. Target subcooling: **10–15°F** for most HFC rack systems
4. Adjust charge in small increments (1–2 lb at a time); allow 15 minutes to stabilize between additions
5. Record final weight added and update system charge record

---

### Rack Energy Management Features

| Feature | How It Works | Common Issue |
|---------|-------------|-------------|
| Floating suction | Raises suction setpoint when case temps are comfortable | Disabled after service call; not re-enabled |
| Floating head pressure | Lowers head pressure as ambient drops | Set too aggressively → TXV starvation in cold weather |
| Night setback | Raises suction setpoint during off-hours | Set too aggressively → morning temperature alarms |
| Demand defrost | Only defrosts circuits that need it | Disabled at commissioning; never re-enabled |
| Compressor rotation | Equalizes run hours across all compressors | Not configured; one compressor always lead → early failure |
| Anti-sweat heater control | Dims heaters based on dew point | Dew point sensor failed; heaters run at full power always |

---

### 10 Common Parallel Rack Mistakes

1. **Staging deadband too narrow** — compressors rapid-cycle; scroll restart timers trip; capacity gaps cause temperature swings across all circuits.
2. **Crankcase heaters not verified after power restoration** — first startup after outage causes oil foaming and potential compressor failure.
3. **Oil equalization lines blocked or valved off** — oil level varies across compressors; some trip on low oil while others are over-filled.
4. **Floating head pressure too low in winter** — subcooling drops below 5°F; flash gas in liquid line; high superheat alarms on multiple circuits simultaneously misdiagnosed as refrigerant leak.
5. **Compressor rotation not enabled** — lead compressor accumulates 3× the run hours; fails first; owner surprised.
6. **Night setback too aggressive** — suction raises 8–10°F overnight; case temperatures drift above 40°F on medium-temp; health code concern; reduce setback to 3–5°F maximum.
7. **Liquid injection solenoid coil failed and not caught** — discharge temperature slowly rises over weeks; compressor fails from heat; no alarm was set on discharge temperature.
8. **Discharge check valve failed on one compressor** — hot discharge gas flows back through idle compressor; compressor heats up; contaminates oil; causes oil breakdown.
9. **Refrigerant added without rechecking subcooling** — technician adds refrigerant by sight glass (bubbles disappear) but overcharges; high subcooling, elevated head pressure, oil dilution.
10. **Suction accumulators not drained after servicing** — liquid refrigerant trapped in accumulator flashes on restart; liquid slug reaches compressor; catastrophic valve failure.`


function buildEquipmentContext(
  equipment: Equipment,
  readings?: SensorSnapshot,
  recentLogs?: MaintenanceLog[],
  activeAlarms?: AlarmEvent[]
): string {
  const lines: string[] = [
    '--- ACTIVE EQUIPMENT CONTEXT ---',
    `Unit: ${equipment.name}`,
    `Manufacturer / Model: ${equipment.manufacturer} ${equipment.model}`,
  ]
  if (equipment.serial_number) lines.push(`Serial: ${equipment.serial_number}`)
  if (equipment.refrigerant)   lines.push(`Refrigerant: ${equipment.refrigerant}`)
  if (equipment.location)      lines.push(`Location: ${equipment.location}`)
  if (equipment.installed_at)  lines.push(`Installed: ${new Date(equipment.installed_at).toLocaleDateString()}`)
  if (equipment.specs && equipment.specs.length > 0) {
    lines.push('Nameplate / Specifications:')
    equipment.specs.forEach(s => lines.push(`  - ${s.label}: ${s.value}`))
  }
  if (equipment.notes)         lines.push(`Notes: ${equipment.notes}`)
  lines.push(`Current status: ${equipment.status}`)

  if (readings && Object.keys(readings).length > 0) {
    lines.push('', '--- CURRENT SENSOR READINGS ---')
    if (readings.case_temp)        lines.push(`Case temperature:  ${readings.case_temp.value.toFixed(1)}°${readings.case_temp.unit}`)
    if (readings.setpoint)         lines.push(`Setpoint:          ${readings.setpoint.value.toFixed(1)}°${readings.setpoint.unit}`)
    if (readings.suction_pressure) lines.push(`Suction pressure:  ${readings.suction_pressure.value.toFixed(1)} ${readings.suction_pressure.unit}`)
    if (readings.superheat)        lines.push(`Superheat:         ${readings.superheat.value.toFixed(1)}°${readings.superheat.unit}`)
    if (readings.discharge_temp)   lines.push(`Discharge temp:    ${readings.discharge_temp.value.toFixed(1)}°${readings.discharge_temp.unit}`)
    if (readings.recorded_at)      lines.push(`As of: ${new Date(readings.recorded_at).toLocaleTimeString()}`)
  }

  if (activeAlarms && activeAlarms.length > 0) {
    lines.push('', '--- ACTIVE ALARMS ---')
    activeAlarms.forEach(a => {
      lines.push(`[${a.severity}] Code ${a.code}: ${a.description ?? 'No description'} (since ${new Date(a.triggered_at).toLocaleString()})`)
    })
  }

  if (recentLogs && recentLogs.length > 0) {
    lines.push('', '--- RECENT MAINTENANCE HISTORY ---')
    recentLogs.slice(0, 5).forEach(log => {
      lines.push(`${new Date(log.performed_at).toLocaleDateString()} | ${log.title}`)
      lines.push(`  Notes: ${log.notes}`)
      if (log.work_done)   lines.push(`  Work done: ${log.work_done}`)
      if (log.next_action) lines.push(`  Next action: ${log.next_action}`)
    })
  }

  return lines.join('\n')
}

// ── Big Picture First troubleshooting methodology ────────────────────────────
// This is the core diagnostic framework applied to every fault/symptom response.
const BIG_PICTURE_METHODOLOGY = `
## THE BIG PICTURE FIRST APPROACH

Before touching gauges or tools, always work through these three layers in order:

### 1️⃣ Airflow
**Symptoms:** Ice buildup, high temps, poor cooling, short cycling, sweating, high superheat
**Check:**
- Is the evaporator fan running? No air movement = no heat removal
- Dirty coil or plugged filter?
- Blocked/restricted return airflow? (product stacking, obstructions)
- Ice buildup on coil? (defrost cycle, heaters, drain lines)
- Are case air curtains working? (open cases)
- On racks: are ALL evaporators affected or just one?
**Fix:** Clean coils, check fans, clear obstructions, verify defrost operation

### 2️⃣ Electrical & Power
**Symptoms:** System dead, erratic operation, won't pump down, tripped breakers
**Check:**
- Is there power? Don't assume — check voltage at the panel
- Tripped breakers? Never reset without finding the cause first
- Control voltage present? Relays, solenoids, and EEVs won't work if not energised
- Are solenoids clicking when cooling is called for?
- Defrost timers/controllers running correctly?
- Pressure switches: High-pressure safety tripped? Low-pressure cutting out?
**Fix:** Find the cause before resetting. Check wiring, test solenoids and relays

### 3️⃣ Refrigerant Flow
**Symptoms:** Low suction pressure, high superheat, flooding, liquid line bubbles, high discharge pressure, frost where it shouldn't be
**Check:**
- What are suction and discharge pressures?
- Superheat and subcooling? (tells you if metering is working)
- Liquid line sight glass? Bubbles = flash gas (low charge or restriction)
- Frost before the TXV/EEV? Flash gas issue
- High head pressure? Condenser problem, non-condensables, or overcharge
- Low suction? TXV/EEV starving, restriction, or low charge
**Fix:** Check refrigerant charge, verify TXV/EEV operation, look for restrictions

---

## SYSTEM-SPECIFIC TROUBLESHOOTING

**Walk-In Coolers / Freezers (WIC / WIF)**
- Ice on coil → failed defrost (check heaters, termination sensor, drain)
- High superheat → TXV issue or low charge
- Liquid line bubbles → low charge or restriction
- High suction, poor cooling → door gaskets, excessive traffic, high load

**Deli Bunkers / Open Display Cases**
- Won't hold temp → bad air curtain, fans not running, incorrect night cover
- Ice on TXV bulb → flooding (check bulb placement and insulation)
- High suction pressure → EPR valve stuck open
- High head pressure → condenser airflow blocked

**Rack Systems**
- One circuit warm, others fine → solenoid stuck closed, TXV fault, wiring
- Whole rack high suction → EPR valve, high load, defrost stuck on
- High oil in separator → oil return problem, failed check valve
- Compressors short cycling → pressure switch differential too narrow, OCV fault

**Condensers / Gas Coolers**
- High head pressure → dirty coil, fan failure, non-condensables
- Low head pressure → failed head pressure control valve, cold ambient
- CO₂ gas cooler: approach temp > 5°C above ambient = cleaning required

---

## THE JOURNEYMAN'S MINDSET
- Work from the simplest fix first
- Check the obvious before grabbing tools
- Don't assume — verify each step
- Never replace a part without confirming it is the cause
- One change at a time — rushing creates new problems`

export const VFD_KNOWLEDGE = `
## VFDs (Variable Frequency Drives) — Supermarket Refrigeration

![Variable frequency drive (VFD)](https://upload.wikimedia.org/wikipedia/commons/8/85/Siemens_VFD.jpg "Variable frequency drive — used on condenser fans, evaporator fans, and compressor motors in modern rack systems")

A VFD converts fixed-frequency AC to variable-frequency output, allowing motors to run at adjustable speeds. In commercial refrigeration: condenser fan arrays (head pressure floating), evaporator fans (energy/noise), and compressor motors on some systems.

---

### Power Section Basics
Three stages: Rectifier (AC→DC) → DC Bus (filter/capacitors) → Inverter (DC→AC via PWM).
DC bus voltage ≈ 1.35× line voltage. 600V system = ~810V DC bus (Canadian standard). US 480V system = ~650V DC bus.
Output is PWM at a carrier frequency (2–16 kHz); motor sees variable V/Hz ratio.
V/Hz ratio held constant below base speed to maintain motor flux.

---

### Common VFD Brands in Refrigeration
| Brand | Model | Typical Use |
|---|---|---|
| Danfoss | FC102 (HVAC Drive), FC103 (Refrigeration Drive) | Condenser fans, CO₂ rack fans |
| ABB | ACS550, ACS880 | Condenser fan arrays, pumps |
| Yaskawa | GA800, A1000 | Compressor motors, fans |
| Emerson/Control Techniques | Commander C300 | Condenser fans |
| Rockwell | PowerFlex 40/525 | Fan arrays |
| Schneider | Altivar ATV610 | Fan and pump |

---

### Key Parameters — First Commissioning
| Parameter | Typical Setting | Notes |
|---|---|---|
| Motor rated current (FLA) | Nameplate FLA | Enables correct overload protection |
| Motor rated voltage | Nameplate V | Must match motor |
| Base frequency | 60 Hz (NA) | |
| Max frequency | 60–70 Hz | Never exceed motor design |
| Min frequency | 15–20 Hz | Below 10 Hz = motor overheating risk |
| Accel time | 10–30 s (fans) | Longer = less inrush |
| Decel time | 10–30 s | Fast decel → OV trip |
| Carrier frequency | 4–8 kHz | Higher = quieter motor; more VFD heat |
| Motor thermal protection | ETR or PTC | Always enable |

---

### Condenser Fan VFD — Head Pressure Control
- Discharge or condensing pressure transducer → store controller PID → 0–10V or 4–20mA analog → VFD speed reference
- Set minimum speed: 20–30 Hz minimum prevents motor overheating on PSC/NEMA motors
- ECM/BLDC motors handle lower speeds than induction motors — check motor spec before setting min Hz
- R-448A condensing target example: 175–200 psig (~78–90°F condensing) at design ambient
- Fan arrays with multiple VFDs: stage fans on in sequence; running one at 60 Hz is more efficient than two at 30 Hz

---

### Fault Codes — Universal Types
| Code | Meaning | Common Cause |
|---|---|---|
| OC / OCP | Overcurrent | Locked rotor, short circuit, accel too fast |
| OV / OVP | DC bus overvoltage | Decel too fast; add braking resistor for high inertia loads |
| UV / LV | Undervoltage | Low line voltage, blown input fuse, phase loss |
| OH / OHT | Drive overtemperature | Blocked cooling, dirty heatsink, high ambient in panel |
| GF | Ground fault | Motor winding to ground, cable insulation damaged |
| OP / OLP | Motor overload | Wrong FLA set, motor overloaded |
| PH / PHL | Phase loss / imbalance | Input phase open, blown fuse, loose terminal |
| COM | Communication fault | Network cable loss, wrong baud/address |

---

### Parameter Backup — Never Skip
Before any VFD replacement:
1. Upload parameters to PC via drive software (Danfoss MCT10, ABB Drive Composer, Yaskawa DriveWizard)
2. Or: use LCP/HIM keypad copy function (Danfoss: LCP copy; ABB: control panel upload)
3. Fallback: photograph or transcribe parameter list manually
After swapping VFD: upload saved parameters → commissioning time drops from hours to minutes.
Write motor nameplate data on a label inside the panel door.

---

### Wiring Checklist
- Input: L1/L2/L3 correct rotation (compressors — rotation matters; fans — usually not)
- Output: U/T1, V/T2, W/T3 to motor (swap any two to reverse rotation)
- Control: analog input (0–10V or 4–20mA); digital inputs (enable, run/stop, fault reset)
- Shielded cable for all control wiring; ground shield at one end only
- VFD output must NOT share a breaker with capacitive loads (PF correction banks) — PWM destroys capacitors

---

### Short-Cycling Prevention
VFDs allow capacity modulation instead of on/off cycling.
Fan motors on VFD: controlled soft-start eliminates relay chatter.
If a fan short-cycles on VFD: check if controller is toggling analog output (use PID mode, not on/off logic).
Minimum run timer parameter available in most drives — use it.

---

### 10 Common Field Mistakes
1. High carrier frequency in a hot mechanical room → VFD overheats
2. Forgetting to set motor FLA → factory default overload won't protect correctly
3. Running induction motor below 15 Hz continuously → motor overheating
4. No braking resistor on large high-inertia fans → OV trip on decel
5. Control wiring in same conduit as power → EMI causes erratic speed/faults
6. No parameter backup before swap → hours of re-commissioning
7. Wrong V/Hz curve (square-law vs linear) — use square-law for centrifugal fans
8. Wrong fuse type upstream (need semiconductor fuses with some VFDs)
9. Motor thermal protection not enabled in drive
10. Min frequency too low → motor hunts, runs rough, or fails to start`

export const REFRIGERANT_RETROFIT_KNOWLEDGE = `
## R-404A → R-448A / R-449A Retrofit Guide — Supermarket Refrigeration

### Why R-404A Is Being Phased Out
R-404A GWP = 3922. Canadian, EU, and major retailer policies mandate phase-down.
R-448A (Honeywell Solstice N-40) GWP = 1387; R-449A (Chemours Opteon XP40) GWP = 1397.
Both are HFO/HFC blends designed as functional R-404A replacements in existing systems.

---

### R-448A vs R-449A — Which to Use
| Property | R-448A (Solstice N-40) | R-449A (Opteon XP40) |
|---|---|---|
| Manufacturer | Honeywell | Chemours |
| GWP | 1387 | 1397 |
| Capacity vs R-404A | ~97–100% | ~97–100% |
| Efficiency vs R-404A | +5–8% COP improvement | +5–8% COP improvement |
| Discharge temp vs R-404A | +5–15°F higher | +5–15°F higher |
| Oil compatibility | Existing POE acceptable | Existing POE acceptable |
Both are functionally equivalent. Choose based on local supplier availability and refrigerant cost.

---

### Step-by-Step Retrofit Procedure
1. **Recover R-404A** — full charge; label recovery cylinder; do not mix with R-448A
2. **Oil check** — R-404A systems on POE: test with acid kit (Sporlan or equivalent); if acid-free, existing POE can stay. Mineral oil or AB oil: drain and replace with POE ISO 32 (MT) or ISO 68 (LT)
3. **Replace filter-drier** — mandatory; change to XH-7 or XH-9 molecular sieve (rated for HFO blends)
4. **TXV assessment** — TXVs with R-404A bulb charge need replacement bulb assembly with R-407C or R-448A charge; EEVs are unaffected (just adjust superheat setpoint)
5. **Update pressure control setpoints** — HP cutout, LP cutout (see table below)
6. **Charge as liquid** — R-448A and R-449A are zeotropic blends; must enter system as liquid to maintain composition; use liquid port or invert cylinder
7. **Target charge weight** — typically within 5% of original R-404A charge by weight
8. **Set and verify superheat** — 8–12°F suction superheat at evaporator outlet
9. **Update controller setpoints** — suction pressure setpoint, discharge/condensing pressure setpoint, fan staging pressures
10. **Apply labels** — mark all service ports and rack label with new refrigerant type and charge weight
11. **Document** — record refrigerant brand, charge weight, oil type/brand, date, technician

---

### Pressure / Temperature Reference
**Medium-temp suction (~25°F evaporating):**
| Refrigerant | Approx. Suction |
|---|---|
| R-404A | 27 psig |
| R-448A | 27 psig (near identical) |

**Low-temp suction (−20°F evaporating):**
| Refrigerant | Approx. Suction |
|---|---|
| R-404A | 3.8 psig |
| R-448A | 4.0 psig |

**Condensing pressure at 90°F condensing temp:**
| Refrigerant | Condensing Pressure |
|---|---|
| R-404A | ~213 psig |
| R-448A | ~200 psig |
| R-449A | ~203 psig |

Note: R-448A/R-449A condense at slightly lower pressure than R-404A at the same temperature.

---

### Critical: Discharge Temperature Is Higher
R-448A and R-449A compressors run 5–15°F hotter discharge temperature than R-404A.
- Copeland: verify ASTP setpoint; default ASTP shutoff is 225°F (107°C) — usually adequate
- Bitzer: verify INT69 VS is properly set and functional; check published envelope for R-448A
- If compressor has a discharge temp sensor: confirm setpoint is 225°F or higher
- Monitor discharge temp closely for first 24 h post-retrofit

---

### TXV Considerations
- TXV with R-404A bulb charge will misfeed with R-448A — replace bulb assembly with R-407C or R-448A charge
- Sporlan: CX series can be recharged in field; ANG/ANGE valves — replace bulb/element
- Danfoss TUA/TUAE: check charge type from model number (charge type suffix); replace if R-404A charged
- EEV (Sporlan SER/SERI, Danfoss AKV): no bulb charge issue; minor superheat setpoint adjustment may be needed (+1–2°F)

---

### Oil Requirements
- POE in good condition (clean, acid-free): keep existing oil
- Acid test positive or oil discoloured: flush system with fresh POE
- Recommended POE: ISO 32 for MT systems; ISO 68 for LT compressors running at low ambient
- Never mix POE with mineral oil or alkylbenzene — causes sludge

---

### 8 Common Field Mistakes
1. Charging as vapour — must be liquid; blend fractionation ruins composition
2. Not changing filter-drier — XH-6 (R-404A rated) not adequate for HFO blends
3. Leaving R-404A TXV bulb charge — causes erratic superheat
4. Not checking discharge temp after startup — R-448A runs hotter; potential ASTP/INT69 trip
5. Mixing leftover R-404A into the charge — contaminates blend, invalidates warranty
6. Not updating refrigerant labels on service ports and rack data plate
7. Skipping acid test on oil — contaminated POE will fail compressor after retrofit
8. Not documenting charge weight — critical for future leak tests and recharges`

export const TYLER_HILL_PHOENIX_KNOWLEDGE = `
## Tyler Display Cases & Hill Phoenix — Supermarket Refrigeration

![Commercial supermarket refrigerated display cases](https://upload.wikimedia.org/wikipedia/commons/a/af/Cold_Storage_Cabinets.jpg "Supermarket refrigerated display cases — typical of Tyler open multideck and Hill Phoenix installations")

---

## TYLER (CARRIER COMMERCIAL REFRIGERATION)
Tyler is a Carrier/Watsco brand. Tyler cases are among the most widely installed open multideck and reach-in cases in North American supermarkets.

### Tyler Case Families
| Series | Type | Common Application |
|---|---|---|
| T-Series Multideck | Open multideck | Produce, dairy, deli |
| Tyler Reach-In | Glass-door reach-in | Frozen, dairy, beverages |
| Tyler Island / Coffin | Open top chest / island | Frozen bulk, ice cream |
| Tyler Service Deli | Service cases | Fresh meat, deli counter service |
| Tyler Specialty | Grab-and-go, floral | Variable |

### Tyler Controllers & Temperature Setpoints
- Dixell XR75CX, XR06CX: most common Tyler case controller; digital display, relay outputs for fan, defrost, alarm
- Some Tyler systems use Carrier CaseMaster or remote supervisory controller
- Medium-temp setpoint: typically 28–35°F (−2 to +2°C)
- Low-temp setpoint: typically 0°F (−18°C) or −5°F for hard-frozen
- Differential: 4–6°F typical (controller cycles compressor or case solenoid)

### Tyler Defrost
- **Electric resistance**: Standard on low-temp; Chromalox tubular or fin-wound heaters
- **Hot gas**: On some Tyler medium-temp and deli cases; 2-pipe system
- **Off-cycle**: Medium-temp cases with glass doors; fans off, ambient melts frost
- Termination thermostat: 47–55°F typical; check continuity with ohmmeter
- Defrost frequency: 2–4× per day on low-temp; 1–2× on medium-temp
- Drain pan heater: 25W line voltage on low-temp; verify energized during defrost and standby
- **Hi-limit thermostat**: 70–85°F; manual-reset type on some models — check this after any defrost complaint

### Tyler Fan Motors
- Shaded pole (small coolers): 2–5W; match CW/CCW rotation — reversed rotation = 50% airflow loss
- PSC: 1/30–1/4 HP; match capacitor µF rating; capacitor failure is the #1 fan motor fault
- ECM (newer Tyler): smart fan module; non-repairable; replace module assembly

### Tyler Common Faults
| Symptom | Likely Cause |
|---|---|
| Case warm, fans running | Low refrigerant, TXV malfunction, blocked evaporator |
| Excessive frost on evap | Defrost not completing, bad termination sensor, drain blocked |
| Fan cycling on thermal | Motor bearing failure, high ambient, blocked return air |
| Case icing at door | Door gasket failure, door out of alignment, high store humidity |
| Evap ices from top | Distributor nozzle blocked or refrigerant distributor issue |
| No defrost heat | Failed heater element, open hi-limit thermostat, timer/controller fault |
| Case temp spiking at night | Night curtain not dropping; check curtain mechanism and schedule |

---

## HILL PHOENIX (DOVER REFRIGERATION & FOOD EQUIPMENT)
Hill Phoenix manufactures display cases and the Advansor CO₂ transcritical booster rack system — one of the most widely deployed CO₂ platforms in North American supermarkets.

### Hill Phoenix Case Families
| Series | Type | Application |
|---|---|---|
| Evolution | Open multideck MT | Produce, dairy, deli |
| Impact | Reach-in MT/LT | Dairy, frozen |
| Apex | Open or glass door | Produce, floral |
| Fusion | Service case | Fresh meat, prepared foods |
| G Series | Island / coffin | Frozen bulk |
| Element CO₂ | CO₂-compatible cases | CO₂ DX or pumped secondary |

Hill Phoenix case controllers: Carel IR33 / IR33+ (most common); Dixell XR75 on older models; Carel pCO mini for EEV on CO₂ cases.

### Hill Phoenix Advansor CO₂ Transcritical Booster Rack
The Advansor rack is a complete CO₂ transcritical booster system manufactured by Hill Phoenix (via Advansor acquisition from Denmark).

**Architecture:**
- MT compressors (medium temp suction): typically Bitzer BSK reciprocating CO₂
- LT compressors (low temp booster): Bitzer BSK
- Flash tank: intermediate pressure vessel separating MT and LT circuits
- Gas cooler: air-cooled with VFD fan control; pressure-optimized by Carel controller
- Defrost: Hot gas from MT discharge circuit piped to LT evaporators
- Controls: Carel pCO5+ rack controller with Carel Boss or BEMS supervisor

**Advansor Alarm / Fault Reference:**
| Fault | Meaning | First Check |
|---|---|---|
| HP Cutout (High Pressure) | Discharge pressure > safety setpoint | Gas cooler fans, ambient temp, charge level |
| LP Cutout (Low Pressure) | Suction below safety setpoint | Evaporator load, TXV/EEV, refrigerant charge |
| Oil Level Low | Compressor oil level below sensor | Bitzer IQ module LED, oil return lines |
| Carel E0 / probe alarm | Sensor/probe fault | Probe wiring at pCO5 analogue input, probe resistance |
| Defrost Timeout | Defrost not completed in allotted time | Hot gas valve operation, termination sensor |
| Fan Fault | VFD fault on gas cooler fan | Check VFD fault code (OC, OH, COM typical) |
| Flash Tank Level | Flash tank level out of range | Flash tank level sensor, liquid line solenoid |

**Advansor Commissioning Key Points:**
- Gas cooler approach temp target: 1–3°C above ambient in transcritical mode
- Setpoints: Flash tank pressure, HP float setpoint, MT/LT suction setpoints
- Oil management: Bitzer IQ module per compressor; sight glass check at startup and after 2h operation
- Safety relief valve: Test date and set pressure must be recorded; 130 bar (1885 psi)
- Refrigerant: CO₂ grade 99.99% purity; dedicated CO₂ recovery cylinder required

---

### 8 Common Field Mistakes
1. Confusing Tyler and Hill Phoenix case parts when ordering — case dimensions similar but all parts differ
2. Not checking termination thermostat continuity after a defrost complaint — stuck-open = case runs warm
3. Replacing Tyler controller without recording parameter settings — must document first
4. Not resetting manual-reset hi-limit after a defrost problem — unit stays in alarm
5. Overlooking night curtain motor failure on Tyler cases — single largest cause of night-time temp spike
6. Advansor: ignoring Carel probe alarm while diagnosing a refrigeration symptom — probe faults mask real data
7. Advansor: recovering CO₂ with HFC recovery equipment — requires CO₂-rated recovery unit
8. Running Advansor in subcritical mode above critical point — check ambient; controller handles automatically but understand the switchover`

export const HEATCRAFT_BOHN_KNOWLEDGE = `
## Heatcraft Refrigeration Products — Bohn / Larkin / Climate Control

![Walk-in cold room with ceiling-mounted unit coolers](https://upload.wikimedia.org/wikipedia/commons/c/c6/Cold_Room.jpg "Walk-in cold room — Bohn and Larkin unit coolers are commonly installed in configurations like this")

Heatcraft Refrigeration Products (HRP) is the commercial refrigeration division of Lennox International, manufacturing unit coolers, condensing units, and remote condensers under four brand names:
- **Bohn** — widest product range; dominant in North America
- **Larkin** — walk-in cooler/freezer, industrial
- **Climate Control** — walk-in focused, often OEM for store builders
- **Chandler** — packaged condensing units

Product literature: heatcraftrpd.com/resources/literature

---

### Unit Cooler Families (Bohn / Larkin Designations)

**Model prefix decoding (Bohn example — BHF024A6B):**
- **B** = Bohn brand
- **H** = Hot gas defrost / **L** = Electric / **A** = Air (off-cycle)
- **F** = Freezer / **C** = Cooler (medium temp)
- **024** = nominal capacity (BTU/h × 100)
- **A** = coil circuit configuration
- **6** = number of fans
- **B** = voltage code

| Series | Defrost Type | Application |
|---|---|---|
| BHF / LHF | Electric | Low-temp walk-in freezer |
| BAC / LAC | Air (off-cycle) | Medium-temp walk-in cooler |
| BHH / LHH | Hot gas | Low-temp freezer, hot gas defrost |
| BHC / LHC | Electric | Low-temp cooler |
| BHFC | Electric | Combination low-temp |
| SDB | Steam | Food processing / blast freeze |

---

#### Fan Motors
- **Shaded pole** (small coolers, <1/30 HP): 2–5W; must match CW or CCW rotation; reversed motor = 50–60% airflow loss
- **PSC (Permanent Split Capacitor)** (1/30–1/4 HP): capacitor failure is #1 fault; match µF and voltage rating exactly; run capacitor separate from start capacitor
- **ECM (Electronically Commutated)** (newer units, up to 1/3 HP): variable speed; smart module; not field-repairable — replace full motor/module assembly
- Fan blade pitch: Low-temp units have steeper pitch (more CFM for defrost air distribution and tighter evaporating temp)
- Fan guard: Replace corroded guards — 15–25% airflow penalty from heavily corroded mesh

---

### Electric Defrost — Detail
- **Heater types**: Chromalox tubular (cal-rod); fin-wound wire-in-sheath; glass tube on glass-door units
- **Termination thermostat** (ET): opens at 47–55°F (8–13°C) — ohm-test for continuity; if open at room temp → replace
- **High-limit thermostat** (HLT): safety at 70–85°F; some models are **manual-reset** — must be manually reset after overcooling or heater fault
- **Drain pan heater**: tape or strip heater on drain pan bottom; verify continuity and that it is energized during defrost and often continuously on freezer units
- Defrost time: 20–40 min typical; if frost remains at end of cycle, increase time or check heater continuity
- Wiring path: L1 → defrost timer contact → defrost relay → evaporator heaters → drain pan heater (in parallel with evap heaters on most models) → N

### Hot Gas Defrost — Detail (BHH / LHH Series)
- Hot gas enters evaporator through a dedicated inlet port (not through suction)
- Suction check valve: prevents hot gas from reversing into suction header
- Defrost solenoid valve: NC; opens on defrost command
- Fan delay thermostat (FDT): Prevents fans from restarting until coil < 35°F — never bypass; hot air redistribution will damage motor windings
- Drain: ensure drain is heated (or heat tape on drain line) — hot gas produces more condensate than electric

### Off-Cycle / Air Defrost (Medium-Temp BAC/LAC)
- Fans stop when thermostat satisfied; frost melts from ambient air
- Effective only when case temperature is at or above 28–32°F
- Drain pan unheated on most models — if application is near 32°F, add drain pan heater to prevent freezing

---

### Condensing Units (Bohn / Larkin / Heatcraft)
- Models: BHT, LHT (remote condensing, no compressor), HCM, HCD series (with compressor)
- Match condensing unit capacity to unit cooler at design TD and saturated suction temp
- **TD (temperature differential)**: Design TD = room setpoint minus evaporating temp; coolers typically 10°F TD; freezers 10–15°F TD
- Refrigerant: R-404A, R-448A, R-507, R-22 (legacy)
- Suction line sizing: 1500 FPM minimum in vertical up-risers for oil return; 700 FPM in horizontal

---

### Heatcraft Product Literature Navigation
- heatcraftrpd.com/resources/literature — search by model number or category
- Categories available: Installation & Operation Manuals, Engineering Data, Wiring Diagrams, Specification Sheets
- Always download the specific IOM for the exact model — defrost wiring and termination thermostat locations vary by unit
- Warranty: units are serial-number tracked; always record unit SN before beginning service

---

### 10 Common Field Mistakes
1. Reversing shaded-pole fan motor rotation — severe airflow loss, no visible damage
2. Wrong capacitor µF on PSC motor replacement — motor runs hot, shorts winding
3. Termination thermostat clipped too close to heater → premature termination → frost remains on evap
4. Using wrong heater wattage — too high a watt density burns fin coating; always match OEM
5. Not resetting manual-reset high-limit thermostat after defrost issue — unit stays warm indefinitely
6. Fans running during hot gas defrost (FDT bypassed or failed) — motor overheating failure
7. Frozen drain line on first cold start — most freezer callbacks are clogged drains; check heater on every startup
8. Selecting unit by BTU/h only without matching TD — two units same BTU/h at different TD have completely different room temperature results
9. Using R-404A TXV on an R-448A retrofit — replace bulb charge; see Retrofit section
10. Not recording unit serial number before service — blocks warranty claims and parts lookup`

export const BITZER_KNOWLEDGE = `
## Bitzer Compressors — Supermarket Refrigeration

![Bitzer semi-hermetic compressor in condensing unit](https://upload.wikimedia.org/wikipedia/commons/d/dc/Cold_Room_Condensing_Unit_-_Bitzer_Compressor.jpg "Bitzer semi-hermetic compressor integrated into a multi-fan condensing unit — typical of Ecoline applications")

---

### Product Families
| Family | Type | Application |
|---|---|---|
| Ecoline (2K/4K/4N/6H/6J/8G) | Semi-hermetic reciprocating | HFC/HFO multiplex racks, walk-in |
| ORBIT (2KES–8GES) | Hermetic scroll | Small to medium refrigeration |
| CSH / CSS | Semi-hermetic screw | Large racks, industrial |
| BSK / BSH | Semi-hermetic reciprocating — CO₂ | CO₂ transcritical & subcritical racks |
| CSVH | Semi-hermetic screw — CO₂ | CO₂ industrial |

---

### Model Number — Ecoline (4NES-20(Y))
- **4** = number of cylinders
- **N** = Ecoline design (high efficiency N series)
- **ES** = refrigerant group (S = R-404A/R-448A/R-507; E = R-134a/HFO/R-448A range)
- **20** = displacement class
- **(Y)** = intermediate injection port (economizer / sub-cooling)

**CO₂ model (2KES-05):** 2K = 2-cylinder CO₂; ES = CO₂ refrigerant; 05 = displacement class.

---

### INT69 VS Protection Relay — Critical Safety Device
The INT69 VS (Kriwan) is Bitzer's compressor motor protection module. It is MANDATORY on all Bitzer semi-hermetic compressors.

- Three PTC thermistors embedded in motor windings (one per phase)
- Trips when any winding exceeds ~230°F (110°C), regardless of current draw
- **Reset procedure**: Manual reset button on INT69 module; push to reset after motor cools
- **Diagnosing INT69 fault**: Measure PTC thermistor resistance at INT69 terminals S1–S4
  - Normal (room temp): < 250 Ω
  - Trip threshold: ~3000 Ω
  - Open/failed: > 10 kΩ (OL on meter) → replace PTC thermistor string or compressor motor
- INT69 wired in series with compressor contactor coil — open INT69 = no contactor energization
- **Always check INT69 before condemning a compressor that won't start**
- CO₂ version: INT69 G (different trip point for CO₂ application) — do not substitute standard INT69 on CO₂ compressor

---

### Bitzer IQ Module — Oil Level Management
- Infrared sensor in oil sight glass; detects oil level optically
- Output relay: closes (OK); opens (low oil level) → alarm or shutdown
- Power: 24V AC/DC
- LED indicator: Green = OK; Amber = borderline; Red = low
- **Foamy oil during startup**: Normal for first 15–20 min; wait before interpreting IQ alarm
- **Refrigerant migration**: If compressor sat in cold room overnight, refrigerant dissolved in oil → oil level appears high, IQ may show low alarm until refrigerant boils off; use crankcase heater
- Crankcase heater: energize 2–4 h before starting compressor after long off period

---

### BITZER BEST Software
Free download at bitzer.de — compressor selection and performance calculation tool.
- Input: refrigerant, suction/discharge conditions, ambient
- Output: capacity (kW/BTU), power input (kW), COP, discharge temperature, required motor size, envelope check
- Generates operating envelope diagram — verify that actual operating point falls inside the envelope
- Critical for verifying replacement compressor is correct before installation

---

### Operating Envelope
- **Max discharge temperature**: 120°C (248°F) — INT69 provides primary protection; discharge sensor as backup
- **Min suction superheat at compressor inlet**: 11°K (20°F)
- **Max compression ratio**: Depends on model; Ecoline 4-cyl LT ≈ 12:1; MT ≈ 8:1 — exceeding damages valves
- **Liquid refrigerant risk**: Suction temp below −10°F with R-404A/R-448A → liquid in oil → monitor oil level and use liquid line solenoid to prevent floodback on shutdown

---

### Cylinder Unloaders (4-Cyl and 6-Cyl Models)
- Solenoid-operated pin lifts suction valve plate → cylinder pumps nothing
- Full load: all cylinders active; part load: 2 of 4 unloaded (50% capacity)
- Unloader solenoid: 24V DC; energize = unload cylinder
- Verify with clamp meter: full-load current vs. part-load current shows ~50% reduction when unloaded correctly
- Stuck unloader: remove solenoid, clean plunger; verify 24V signal during unload command

---

### Tandem / Trio Configurations
- Shared suction/discharge manifolds; shared oil equalization line (3/8" copper between crankcases)
- **Oil equalization**: Check sight glass on both/all compressors; oil should be at same level
- **Start stagger**: Controller must stagger starts by minimum 30 s — prevents simultaneous inrush from tripping circuit breaker
- Common fault: Oil migrates to one compressor (equalization line restricted or check valve stuck) → running compressor starves for oil

---

### CO₂ Compressors (BSK / BSH Series)
- Design pressures: Discharge up to 130 bar (1885 psi); suction up to 50 bar (725 psi) at MT booster stage
- Oil: **BITZER BVC68** polyol ester — CO₂-specific; do NOT use standard HFC POE (different additive package for CO₂)
- Valve plates: Heavier duty for CO₂ pressure differential
- HP safety relief valve: set at 130 bar mechanical + HP electrical cutout at 125 bar
- Discharge temp in transcritical: 140–200°F typical — higher than HFC systems; INT69 G essential
- Oil separation: Return oil separator in discharge line; verify oil level in separator sight glass
- **INT69 G**: CO₂ version of protection relay — must use G version, not standard INT69

---

### Service Valve Positions
Bitzer semi-hermetic service valves (suction and discharge): 3-position stem.
- **Back-seated (fully out)**: Normal running position — valve fully open, access port closed
- **Mid-position**: Open valve and access port — use only for service measurements; never leave here
- **Front-seated (fully in)**: Isolates compressor — use for pump-down or compressor replacement
Always back-seat after service.

---

### 10 Common Field Mistakes
1. Not checking INT69 first when compressor won't start — most "dead compressor" calls are INT69 trips
2. Wrong oil — Bitzer requires BSE 32/BSE 55 for HFC; BVC68 for CO₂; mixing causes sludge/seal failure
3. Ignoring IQ module foamy-oil alarm during startup — wait 20 min; if alarm persists after warmup, oil is genuinely low
4. Operating outside published envelope — verify with BITZER BEST before commissioning
5. CO₂ compressor with HFC POE oil — catastrophic long-term damage to seals and valves
6. Not using BITZER BEST to verify replacement model — wrong capacity or refrigerant group
7. Leaving service valve in mid-position after service — pressurizes access port fitting
8. Forcing INT69 reset without diagnosing cause — motor at 230°F means a real problem
9. Using standard INT69 on CO₂ compressor — wrong trip point, compressor unprotected
10. Tandem oil equalization line reversed — oil pools in one crankcase, other compressor fails`

// ── HVAC Rooftop Unit Knowledge Base ─────────────────────────────────────────

export const LENNOX_RTU_KNOWLEDGE = `
## Lennox Commercial Rooftop Units — Field Reference

![Lennox International logo](https://upload.wikimedia.org/wikipedia/commons/7/77/Lennox_International_logo.svg)

![Commercial rooftop packaged HVAC units](https://upload.wikimedia.org/wikipedia/commons/9/90/Rooftop_Packaged_Units.JPG "Commercial rooftop packaged units — Lennox LGH/LCH series are installed in configurations like this")

---

### Model Families Overview

| Series | Type | Capacity Range | Notes |
|---|---|---|---|
| LGH / LCH | Gas heat / Electric cool (3-phase) | 3–25 ton | Most common commercial |
| LGF / LCF | Gas heat / Electric cool (single-phase) | 3–5 ton | Light commercial |
| Landmark | High-efficiency commercial | 7.5–25 ton | Two-stage cooling and heating |

**LGH naming decode — example LGH120H4B:**
- **L** = Lennox
- **G** = gas heat
- **H** = cooling (H = R-410A; C = R-22 legacy)
- **120** = 120 = 10-ton nominal (MBH ÷ 12 for tons: 120 MBH ÷ 12 = 10 tons)
- **H** = high-efficiency variant
- **4** = 3-phase 575V (Canadian standard); US equivalent is 460V — always verify unit nameplate
- **B** = design sequence

LCH is identical to LGH except L**C** = electric heat instead of gas. LGF/LCF follow the same convention with an F suffix indicating single-phase power.

**Landmark series** uses LZH prefix (high efficiency), has factory-installed two-stage scroll compressors and communicating Prodigy 2 controls.

---

### Prodigy 1 vs Prodigy 2 Control Boards

#### Identifying Which Board Is Installed

- **Board label**: look at the upper edge of the board for silkscreen text — "PRODIGY" or "PRODIGY 2"
- **Model year**: units manufactured before ~2012 generally have Prodigy 1; post-2012 have Prodigy 2 (check unit nameplate manufacture date)
- **Physical layout**: Prodigy 1 has a single bank of status LEDs on the left side; Prodigy 2 has a 4-character scrolling LED display in the upper-right corner
- **Connector count**: Prodigy 2 has additional connectors for variable-speed ID fan and communicating thermostat (RJ-45 port visible on right edge)

#### Prodigy 1 LED Flash Codes

The status LED flashes a number of times, pauses, then repeats. Count flashes in one group.

| Flash Count | Fault |
|---|---|
| 2 | Pressure switch open (not verified after inducer start) |
| 3 | Draft inducer fault (pressure switch failed to close) |
| 4 | High-limit switch open |
| 5 | Flame sense fault (flame lost after establishing) |
| 6 | Ignition fault (failed to establish flame on all retries) |
| 7 | Low flame signal (microamp signal below threshold during operation) |
| 8 | Polarity reversed (L1/L2 swapped at unit disconnect — fix incoming wiring) |

**Note:** Prodigy 1 does not store fault history. You must observe the LED in real time during a fault condition.

#### Prodigy 2 Fault Codes and Navigation

Prodigy 2 displays fault codes as scrolling text on the 4-digit LED display.

**Accessing fault history:**
1. Press and hold the MODE button for 3 seconds — display enters fault history mode
2. Each stored fault code scrolls across the display
3. Prodigy 2 stores the last 5 faults with timestamp
4. Press MODE again to exit fault history

**Prodigy 2 added features vs Prodigy 1:**
- Variable-speed ID (induced draft) fan — reduces noise, improves combustion efficiency
- Enhanced economizer integration with mixed-air temperature PID control
- Expanded fault history (5 faults vs none on Prodigy 1)
- Communicating thermostat support via RJ-45 bus (iComfort system)
- Two-stage heat control output (W2 terminal active)
- Active dehumidification mode output

**Common Prodigy 2 fault codes (scrolling display text):**
- \`LP\` = Low pressure switch fault (cooling)
- \`HP\` = High pressure switch fault (cooling)
- \`HL\` = High limit open (heating)
- \`PS\` = Pressure switch (inducer — heating)
- \`FS\` = Flame sense fault
- \`IG\` = Ignition fault (failed to light on retries)
- \`EC\` = Economizer fault (mixed-air sensor, actuator feedback)
- \`HR\` = Heat rollout switch open (manual reset required)

---

### Economizer System

#### Types

- **Differential dry-bulb**: compares outdoor air temperature (OAT) to return air temperature (RAT). Opens damper when OAT < RAT − differential setpoint (typically 2°F). Simple, no humidity sensing.
- **Differential enthalpy**: compares outdoor air enthalpy to return air enthalpy using dedicated enthalpy sensors. More efficient — avoids bringing in humid outdoor air even when temperature is favorable.

#### Damper Actuator — Lennox/Interlink Part 102691-04

- Type: 24VAC, 2-position (open/closed), spring-return, normally-closed
- Stroke: 0–90°
- Spring-return direction: closes on loss of power (fail-safe closed = no outside air on power failure)
- Signal: Y1 from control board energizes 24VAC to open damper; de-energized = spring drives damper closed

**Wiring for 102691-04 (older/OEM — Black/White/Orange/Green harness):**
- Black = 24VAC common (neutral)
- White = 24VAC hot (power)
- Orange = damper open signal from Y1 terminal on control board
- Green = ground

**Wiring for newer actuator variant (Red/Pink/Grey/Black harness):**
Found on later-production LGH/LCH units and some field-replacement actuators:
- Red = 24VAC hot (power)
- Black = 24VAC common (neutral)
- Grey = damper open/control signal from Y1 (or 0–10VDC on modulating economizer)
- Pink = position feedback signal (0–10VDC output back to Prodigy 2 board) OR second control input on 3-point floating actuators

**⚠️ Always verify against the unit wiring diagram** — the diagram is on the inside of the control panel door and is the definitive reference for that specific unit. Wire colours vary by actuator manufacturer, vintage, and whether the economizer is 2-position or modulating. Never assume functions by colour alone.

**Replacement procedure for 102691-04:**
1. Shut off unit power at disconnect
2. Note wire positions and photograph wiring before disconnecting
3. Disconnect the 24VAC harness connector at actuator body
4. Remove 2 mounting screws (5/16" head) holding actuator to damper bracket
5. Rotate coupler ring to neutral (midpoint) to relieve spring tension before removing
6. Install new actuator, align coupler to damper shaft
7. Torque mounting screws to 35 in-lb
8. Reconnect wiring harness
9. Restore power; cycle Y1 signal and verify damper opens fully (90°) and spring-returns closed when signal removed
10. Verify no binding at extreme positions

#### Common Economizer Faults

**Actuator gear strip:**
- Symptom: motor runs but damper doesn't move, clicking noise
- Test: disconnect power, manually push damper — should move freely
- Fix: replace actuator 102691-04; check damper blade for binding before installing new actuator

**Damper blade binding on debris:**
- Symptom: actuator hums, draws high current, damper won't reach full stroke
- Test: with power off, manually operate damper — note resistance
- Fix: clear debris from damper frame and blade seals; verify blade is not warped

**Mixed-air sensor failure (C7835A or equivalent NTC sensor):**
- Symptom: damper hunts continuously (opens and closes rapidly), fault code EC on Prodigy 2
- Test: measure sensor resistance — at 70°F should read approximately 10 kΩ (varies by sensor type — check data sheet)
- Fix: replace sensor; verify mounting location is in mixed-air stream (6–12" downstream of mixing point)

**Economizer high-limit tripping in high ambient:**
- Symptom: unit locks out economizer function on hot days even when OAT < RAT
- Cause: mixed-air temperature high-limit switch set too low, or high-limit sensor in wrong location reading supply air discharge
- Fix: verify high-limit setpoint is 65°F (adjustable on Prodigy 2); confirm sensor is in mixed-air section not discharge

---

### Ignition System

#### Components

- **Hot Surface Igniter (HSI)**: silicon nitride element, rated ~60W at 120VAC. Resistance when cold: 40–70Ω. At operating temperature: resistance drops. Replace if resistance out of range or if element is visibly cracked.
- **Flame sensor/rod**: stainless steel rod positioned in burner flame. Measured output: microamp signal, should be >1.5µA during flame. Check with a microamp-capable meter in series with the flame rod wire.
- **Draft inducer motor**: pre-purges combustion chamber before ignition, maintains negative pressure for combustion.

#### Normal Ignition Sequence (Prodigy 1 and 2)

1. W1 thermostat call received
2. Draft inducer energizes — begins pre-purge
3. Pressure switch closes within 7–15 seconds (confirms inducer is moving air)
4. HSI pre-heat begins — 17-second warm-up period
5. Gas valve opens — W valve energizes
6. Flame must be detected within 7 seconds or the IFC aborts the trial
7. If flame established: normal heating operation
8. Flame sense signal confirmed >1.5µA continuously during operation

#### Soft Lockout Sequence

- Trial for ignition fails → wait → retry
- Total of 3 retry attempts
- After 3rd failed trial: soft lockout — 1-hour wait before automatic restart
- Manual reset: cycle thermostat call off for 30 seconds, back on

**Hard lockout** (Prodigy 2 only): after 5 consecutive soft lockout cycles, board goes to hard lockout requiring manual board reset button press.

#### Ignition Troubleshooting

**No spark / no glow:**
- Verify 120VAC to HSI circuit (IFC board output)
- Measure HSI resistance: replace if open or < 10Ω (shorted)
- Check igniter wire harness for chafing

**Nuisance ignition lockouts:**
- Most common cause: carbon-fouled flame rod
- Clean rod with fine steel wool — do not use sandpaper (leaves abrasive residue)
- Verify microamp signal in flame: connect microamp meter (on DC µA range) in series with sensor wire
- Signal <1.5µA: clean rod first, then verify rod positioning in flame (tip should be 1/2" into flame cone)
- If signal still low after cleaning: check ground path continuity from burner box to unit chassis; poor ground = weak flame signal

---

### Common Faults and Fixes

#### Cracked Heat Exchanger

**Signs:**
- CO spillage detected at supply registers (> 9 ppm CO is actionable; > 35 ppm is OSHA action level for occupied space)
- Elevated CO2 in supply air beyond expected combustion contribution
- Soot deposits on secondary heat exchanger tubes
- Visible cracks or pinholes in primary heat exchanger panels

**Diagnosis protocol:**
1. Perform CO test at supply registers with combustion analyzer — unit running in heating with all air handlers on full airflow
2. Visual inspection: remove access panels, use inspection mirror and flashlight to examine primary HX panels for cracks, warping, or holes
3. Dye test: introduce non-toxic smoke/dye into combustion chamber; observe supply air for traces with UV light (use appropriate dye formulated for HX testing)
4. If CO confirmed: immediately shut down heating section, tag unit, notify building owner

**Important:** A cracked heat exchanger requires full heat exchanger assembly replacement — do not attempt field repair.

#### High-Limit Trip

Causes (in order of likelihood):
1. **Dirty filter** — measure static pressure across filter bank; > 0.25" W.C. = restricted
2. **Failed supply fan** — check capacitor first (measure µF, compare to nameplate ±6%), then motor winding resistance and amp draw
3. **Dirty evaporator coil** — reduced airflow through fouled coil; clean with low-pressure coil cleaner
4. **Blocked return air** — furniture, merchandise, or store fixtures blocking return grilles

**High-limit switch specs (LGH/LCH):** auto-reset at 170°F, opens at 200°F. Manual-reset rollout switch: 250°F.

#### Pressure Switch Fault (Heating — Flash Code 2 or 3 on Prodigy 1)

Causes:
1. **Condensate in pressure switch tubing** — disconnect tubing at switch, blow clear, slope tubing to drain away from switch
2. **Failed inducer motor** — motor hums but shaft doesn't turn (check capacitor), or motor dead (check 120VAC supply to motor)
3. **Flue restriction** — bird nest, collapsed vent section, failed draft hood
4. **Cracked inducer wheel** — wheel spins but doesn't move adequate air; remove housing cover and inspect wheel

**Pressure switch specification (standard):** closes on −0.3" to −0.5" W.C. differential. Test with manometer tap at pressure switch port.

#### Refrigerant Low-Charge Diagnosis

**Superheat method (fixed orifice systems):**
- Record outdoor ambient temperature (OAT) and return air wet-bulb (RWB)
- Target suction superheat = 10–15°F
- Measure suction line temperature at compressor service valve (clamp thermometer)
- Measure suction saturation pressure and convert to temperature (use P/T chart for R-410A)
- Superheat = Suction line temp − Suction saturation temp
- If superheat > 15°F: unit is low on charge — add refrigerant in small increments
- If superheat < 5°F: risk of flood-back — check airflow before adding charge

**Subcooling method (TXV systems, Lennox Landmark):**
- Measure liquid line temperature at liquid service valve
- Measure liquid saturation pressure (high-side gauge at liquid service valve) and convert to temperature
- Subcooling = Liquid saturation temp − Liquid line temp
- Target: 10–15°F subcooling
- < 10°F subcooling: low charge or restriction upstream
- > 18°F subcooling: overcharged or liquid line restriction

**Never add refrigerant without identifying and repairing the leak.** R-410A systems must be pressure-tested with nitrogen before recharging.

---

### Maintenance Intervals

| Task | Interval |
|---|---|
| Filter replacement (2" commercial) | Every 3 months (monthly if dusty environment) |
| Heat exchanger visual inspection | Annually |
| Combustion analysis (CO, CO2, flue temp) | Annually |
| Belt tension check (belt-drive supply fan) | Every 6 months; 1/2" deflection per foot of span |
| Evaporator coil cleaning | Spring and fall |
| Condenser coil cleaning | Spring and fall |
| Gas pressure verification | Annually |
| Electrical connection torque | Annually |
| Drain pan cleaning and inspection | Annually |
| Economizer actuator stroke test | Annually |

**Gas pressure specs:**
- Natural gas manifold pressure: 3.5" W.C.
- Propane manifold pressure: 10.0" W.C.
- Incoming gas supply pressure: 5.0–13.6" W.C. (natural gas); 11.0–13.6" W.C. (propane)

**Supply fan belt tension:** apply 1 lb of force perpendicular to belt midspan — deflection should be 1/2" per foot of span. Over-tightening causes premature bearing failure.

**Compressor oil:** scroll compressors on R-410A units require Lennox-approved POE oil. Do not add oil unless refrigerant weigh-in confirms oil loss during refrigerant service.

---

### Quick Reference — Prodigy 2 DIP Switch Settings

| DIP | Function | ON | OFF |
|---|---|---|---|
| 1 | Cooling stages | 2-stage | 1-stage |
| 2 | Heating stages | 2-stage | 1-stage |
| 3 | Heat/Cool changeover | Auto | Manual |
| 4 | Economizer enable | Enabled | Disabled |
| 5 | Dehumidification | Enabled | Disabled |
| 6 | Reserved | — | — |
| 7 | BMS communication | Enabled | Disabled |
| 8 | Test mode | Test | Normal |

Always return DIP 8 to OFF (Normal) after testing.
`

export const CARRIER_RTU_KNOWLEDGE = `
## Carrier Commercial Rooftop Units — Field Reference

![Carrier Corporation logo](https://upload.wikimedia.org/wikipedia/commons/8/8f/Logo_of_the_Carrier_Corporation.svg)

![Commercial rooftop packaged HVAC units](https://upload.wikimedia.org/wikipedia/commons/9/90/Rooftop_Packaged_Units.JPG "Commercial rooftop packaged units — Carrier WeatherExpert series")

---

### Model Families Overview

| Series | Type | Capacity Range | Notes |
|---|---|---|---|
| 48TC / 48TM | Gas/electric, standard efficiency | 3–12.5 ton | Most common light-commercial |
| 48TF | Gas/electric, large commercial | 15–25 ton | Single or dual refrigerant circuit |
| 50TJ | Cooling only (electric heat optional) | 6–25 ton | No gas section |
| 50XC WeatherExpert | High efficiency gas/electric | 6–25 ton | ASHRAE 90.1 compliant, integrated economizer |

**Bryant equivalents:** Bryant 580J series ≈ Carrier 48TC (same cabinet, different badging). York and other Johnson Controls brands may share components on OEM versions.

#### Carrier 48TC Naming Example: 48TC D06A2A5A0A0A0

- **48TC** = product series (gas heat, standard efficiency)
- **D** = cabinet size (D = medium commercial)
- **06** = nominal cooling capacity (6 ton)
- **A** = design sequence
- **2** = 2-stage cooling
- **A** = 208–230V, 3-phase (varies by position)
- **5** = R-410A refrigerant
- Remaining characters = factory options (economizer, electric heat kW, etc.)

---

### Controls

#### Standard Electromechanical Controls (24V)

- Basic 24V thermostat wiring: R, C, Y1, Y2 (2-stage), W1, W2, G
- Staged cooling via two compressor contactors on dual-circuit units
- No onboard diagnostics — faults identified by checking components directly

#### ComfortLink II (Communicating Controls)

Used on 50XC WeatherExpert and some larger 48TF units. ComfortLink II is Carrier's CCN (Carrier Comfort Network) communicating control platform.

**CCN bus:** 2-wire RS-485 communications at 9600 baud. Address set via DIP switches on the main control board.

**Accessing ComfortLink II diagnostics:**
1. Press and hold the TEST button for 5 seconds
2. Board enters diagnostic scroll mode
3. LED flash codes on the board indicate active faults
4. Connect a Carrier Service Tool (CST) laptop interface for full fault history and live sensor readings
5. Without CST: check flash code table on inside of control access panel door

**Common ComfortLink II LED flash codes:**

| Flashes | Fault |
|---|---|
| 1 | Call for cooling/heating (status, not fault) |
| 2 | Low pressure fault |
| 3 | High pressure fault |
| 4 | Compressor overload / thermal protector |
| 5 | Freeze stat trip (evaporator coil temperature low) |
| 6 | Outdoor fan fault |
| 7 | Supply air temperature sensor fault |
| 8 | Economizer fault |

**CCN address DIP switch setting:**
- Switches 1–6 set the binary CCN address (1–63)
- Switch 7: baud rate (OFF = 9600, ON = 19200)
- Switch 8: termination resistor (ON = terminated; only end devices on bus should be ON)

---

### Economizer System (WeatherExpert)

The WeatherExpert integrated economizer uses motorized damper with full modulating control.

**Damper actuator:** Honeywell ML6161 or equivalent, spring-return, 24VAC, 0–10VDC modulating signal. Spring returns damper to closed (0%) on power loss.

**Enthalpy sensor:** Carrier 33ZCH series enthalpy sensor. Measures both temperature and relative humidity to calculate enthalpy. Installed in outdoor air intake stream.

**Changeover logic:**
- **Differential enthalpy**: opens damper when OA enthalpy is lower than RA enthalpy by a set differential (typically 2 BTU/lb)
- **Differential dry-bulb** (fallback if enthalpy sensor fails): opens when OAT < RAT by differential

**Economizer high-limit control:** prevents mixed-air temperature from dropping below 55°F (adjustable). Mixed-air temperature sensor located downstream of mixing point.

#### Common WeatherExpert Economizer Faults

**OAT or RAT sensor failure causing full-open damper:**
- Symptom: building floods with hot, humid outdoor air; cooling load spikes; humidity complaints from occupants
- Cause: failed sensor reads extreme value, controller defaults to open position
- Test: measure sensor resistance at sensor terminals (compare to resistance/temperature table in service manual)
- Fix: replace failed sensor; verify damper returns to minimum position with new sensor

**Linkage binding:**
- Symptom: actuator hums, damper doesn't reach commanded position, actuator overheats
- Test: disconnect actuator, manually operate damper linkage — should move freely
- Fix: lubricate pivot points with food-grade grease (if food retail application); realign linkage

**Actuator burnout from 24VAC brown-out:**
- Symptom: actuator dead, no response to control signal; may have burn marks on PCB inside actuator
- Cause: voltage below 20VAC at actuator terminals causes motor to stall and overheat
- Test: measure 24VAC at actuator terminals with unit under full load — must be 24–28VAC
- Fix: replace actuator; investigate transformer capacity if voltage is chronically low under load

---

### Refrigerant Circuit

**Circuit configuration:**
- Single-circuit: all units ≤7.5 ton — one compressor, one evaporator coil, one condenser coil section
- Dual-circuit: units ≥10 ton — two independent refrigerant circuits, each with its own scroll compressor, TXV, liquid line, and suction line

**Compressors:** Copeland ZP (scroll) on most models; Carlyle on some OEM variants. R-410A throughout current production.

**Expansion:** TXV standard on all 48/50 series. Orifice plates only on very old legacy units.

**Charging on TXV units (subcooling method):**
- Target subcooling: 10–15°F
- Measure liquid line temperature at liquid service valve with contact thermometer
- Read liquid saturation pressure (high-side gauge) and convert to saturation temperature using R-410A P/T chart
- Subcooling = Sat temp − Liquid line temp
- Add refrigerant if subcooling < 10°F; remove if > 18°F

**Pressure switch settings (R-410A):**
- Low-pressure cutout: 25 psig (manual reset on some models, auto-reset after 5 min on others)
- Low-pressure reset: 40 psig
- High-pressure cutout: 400 psig
- High-pressure manual reset: red button on HP switch body (or compressor access panel)

---

### Heat Section

**Natural gas — single-stage (48TC standard):**
- Gas valve: White-Rodgers 36C or Honeywell VR8300 series (24VAC operator, 3/4" inlet typical)
- Manifold pressure: 3.5" W.C. natural gas, 10.0" W.C. propane
- Ignition: intermittent pilot or direct spark ignition (DSI) on newer units; HSI on late-model units

**Natural gas — two-stage (48TC with W2):**
- First stage: minimum fire (typically 40–50% of rated input)
- Second stage: full fire on continued demand
- Gas valve: dual-operator valve (White-Rodgers 36J or similar)

**Electric heat option (48TC-E suffix):**
- SCR-controlled electric heat strips
- Staged via W1 and W2 signals
- Check amp draw — each strip draws significant current; verify breaker sizing

**Heat exchangers:** primary and secondary (condensing) — two-pass design. Secondary HX condenses water vapor from flue gases (condensing design on high-efficiency 50XC). Condensate drain required on 50XC heat section.

**Cracked HX signs:**
- Elevated CO in supply air (>9 ppm at supply registers during heating operation)
- Excessive cycling on high-limit switch
- Visible carbonization or scale deposits on HX panels
- Water intrusion marks on burner or heat section panels

---

### Common Faults

**Compressor lockout (3-phase units):**
- Cause: 3-phase voltage imbalance > 2% — scroll compressors are sensitive to imbalance and will trip internal overload
- Test: measure all three line voltages L1-L2, L1-L3, L2-L3 at unit disconnect with unit running
- Calculate imbalance: (Max deviation from average ÷ Average voltage) × 100%
- If > 2%: report to utility or building electrical; do not operate compressor until corrected
- Manual reset: press reset button on high-pressure switch; if compressor trips again immediately, internal overload is tripped — wait 30 min for thermal reset

**Dirty condenser coil reducing summer capacity:**
- Target condensing temperature = OAT + 25°F (clean coil)
- Measure: high-side saturation pressure, convert to saturation temperature; compare to OAT
- If condensing temp > OAT + 35°F: coil needs cleaning
- Clean with low-pressure coil cleaner (alkaline for aluminum fin coils — follow manufacturer dwell time)
- Rinse from inside out (supply water from inside, push dirt out of face side)

**TXV hunting:**
- Symptom: suction pressure oscillates ±5 psig continuously, evaporator temperature unstable
- Cause: worn TXV power element loses sensitivity; hunting also caused by refrigerant floodback washing out bulb charge
- Test: confirm superheat at evaporator outlet — should be steady ±2°F; if swinging ±8°F = TXV hunting
- Fix: replace TXV assembly (bulb and valve body together on most Carrier applications)

**Economizer damper stuck open in winter:**
- Result: unit brings in cold outdoor air, heating load increases dramatically, building may not maintain setpoint
- Test: remove control signal (disconnect Y1 at actuator) — spring should close damper within 10 seconds
- If damper doesn't close with Y1 disconnected: actuator spring failed or damper physically stuck
- Fix: replace actuator; clear damper blade obstruction

---

### Maintenance Schedule

| Task | Interval |
|---|---|
| Filter replacement | Quarterly (2" commercial filters) |
| Condenser coil cleaning (chemical) | Annually (spring) |
| Evaporator coil cleaning | Annually (fall) |
| Belt inspection (if belt-drive supply fan) | Every 6 months |
| Gas pressure verification | Annually |
| Blower wheel cleaning | Annually |
| Drain pan inspection and treatment | Quarterly |
| Electrical connection torque check | Annually |
| Economizer full-stroke test | Annually |
| Compressor oil level (if sight glass present) | Annually |

**Gas pressure spec:** manifold 3.5" W.C. natural gas; 10.0" W.C. propane. Measure at manifold test port with digital manometer.

**Drain pan treatment:** apply BioGuard or equivalent slow-release condensate treatment tablet quarterly to prevent algae and biofilm growth.
`

export const YORK_RTU_KNOWLEDGE = `
## York / Johnson Controls Commercial Rooftop Units — Field Reference

![Johnson Controls logo](https://upload.wikimedia.org/wikipedia/commons/4/46/Johnson_Controls_old_logo.svg)

![Commercial rooftop packaged HVAC units](https://upload.wikimedia.org/wikipedia/commons/9/90/Rooftop_Packaged_Units.JPG "Commercial rooftop packaged units — York Predator and Sunline series")

---

### Model Families Overview (Johnson Controls)

| Series | Name | Type | Capacity |
|---|---|---|---|
| ZJ | Predator | Gas/electric 3-phase | 3–25 ton |
| ZR | Predator | Cooling only, 3-phase | 3–25 ton |
| ZXG | Predator (current gen) | Gas/electric 3-phase, dual-circuit | 7.5–25 ton |
| ZXH | Predator (current gen) | High-efficiency gas/electric | 7.5–25 ton |
| DJSC | Sunline 2000 | Gas/electric, older mid-range | 3–12.5 ton |
| DJFC | Sunline | Gas heat, older light commercial | 3–7.5 ton |
| LX | — | High efficiency commercial | 7.5–25 ton |

**York Predator ZJ naming example: ZJ048N06B2AAB1A**
- **ZJ** = Predator gas heat series
- **048** = 048 = 4-ton nominal (CFM-based — 048 = 48,000 BTU cooling)
- **N** = standard efficiency
- **06** = 6 kW electric auxiliary heat
- **B** = 2nd design sequence
- **2** = 208–230V/3-phase
- **AA** = factory options
- **B** = unit options
- **1A** = manufacturing sequence

**Sunline 2000 (DJSC):** older generation, still widely in field service. Use Quantum board, same LED diagnostics. Parts availability declining — consider like-for-like replacement on major failures.

---

### Quantum Microprocessor Control Board

The Quantum board is York's standard RTU controller across Predator and most Sunline units.

**LED indicator layout (Quantum board, looking at board face):**
- Green LED (POWER): steady on = 24VAC supply OK
- Red LED (FAULT): solid on = active fault; flashing = fault code (count flashes)
- Amber LED (ALARM): second fault indicator (used on newer Quantum revisions)

#### Quantum Board LED Flash Codes

| Flash Count | Fault |
|---|---|
| 1 | Low pressure switch open (cooling) |
| 2 | High pressure switch open (cooling) |
| 3 | Loss of charge fault (low-pressure lockout initiated) |
| 4 | High discharge temperature sensor open (>225°F) |
| 5 | Low pressure lockout (3 LP trips in 1 hour) |
| 6 | High pressure lockout (manual reset required) |

#### Accessing Stored Fault History on Quantum Board

1. Press and release the RESET button rapidly — 3 times within 5 seconds
2. The red FAULT LED will flash the code for the first stored fault
3. Press RESET once more to advance to the next stored fault
4. Quantum stores up to 3 recent faults
5. To clear fault history: hold RESET button for 10 seconds

**OptiView controls** (larger LX series): full touchscreen interface. Access diagnostics via: Menu → Diagnostics → Fault History. OptiView stores last 10 faults with timestamp and sensor values at time of fault.

---

### ZXG Model Decode

**Example: ZXG08F2C3A41B1111A3**
- **ZXG** = Predator commercial gas/electric RTU, current production
- **08** = capacity code (cross-reference York capacity table — larger ZXG units are dual-compressor circuit)
- **F** = R-410A refrigerant
- **2** = 208/230V, 3-phase, 60 Hz
- **C3A4** = factory-installed configuration options
- **1B / 1111A3** = cabinet variant and manufacturing sequence

ZXG units use the **Simplicity SE** control platform (SE-SPU1002-10 board), not the older Quantum board. Dual-compressor ZXG units have independent refrigerant circuits — one circuit can run while the other is locked out.

**York serial number decode (ZXG era):** first letter = manufacturing plant (N = Norman, OK; W = Wichita), followed by year/week code, then sequence number.

---

### Simplicity SE Control Board (SE-SPU1002-10)

The SE-SPU1002-10 (Simplicity SE Processing Unit, Johnson Controls) is the current-generation RTU controller found on ZXG, ZXH, and ZXL series Predator units. It replaces the older Quantum board.

**Board identification:** white label on board reads "SE-SPU1002-10 / JOHNSON CONTROLS, INC." A USB-A port is visible on the lower face of the board — this is the primary field service interface.

**Key connector labels on SE-SPU1002-10 (visible on board face):**
- **RAH** — Return Air Humidity sensor input
- **DCT** — Discharge Cooling Temperature sensor
- **PRS** — Pressure transducer / switch inputs
- **OFS** — Outdoor Fan Start / speed output
- **APS** — Air Pressure Switch (supply fan proving)

**USB port uses:**
- Download fault log to USB drive (insert drive → LED flashes → remove → open fault_log.csv)
- Upload firmware updates (download .bin file from JCI TechDirect portal, load via USB drive)
- Connect JCI field laptop with Simplicity SE configuration software for parameter setup

#### SE-SPU Board LED Indicators

Unlike the Quantum board's blink-count system, the Simplicity SE communicates fault detail via RS-485 to the thermostat display. Board LEDs indicate general status only:
- **Green LED (Power):** steady on = 24VAC supply OK; off = no power to board
- **Green/Amber LED (Status):** steady green = normal run; amber flash = active alarm; off = standby
- **Red LED (Fault):** steady red = hard lockout active; flashing = soft fault/alert; off = no fault

Full fault descriptions, sensor values at time of fault, and timestamps are shown on the Simplicity SE thermostat display — not decoded from board LED blink patterns.

#### Simplicity SE Fault Codes and Fixes

**Compressor / Cooling Faults:**

| Fault Message | Cause | Field Fix |
|---|---|---|
| Low Pressure Trip | Suction pressure fell below LP switch cutout (~100 psig R-410A). Low charge, restricted metering device, dirty evaporator, or low airflow. | Verify suction pressure (target 115–130 psig at 70°F ambient). Check filter static. Inspect TXV/EEV. Check for refrigerant leak with electronic detector. |
| High Pressure Trip | Discharge pressure exceeded HP switch cutout (~590 psig R-410A). Dirty condenser coil, failed condenser fan, refrigerant overcharge, or extreme ambient. | Clean condenser coil. Verify all condenser fans spinning (check contactors and capacitors). Check subcooling spec (10–15°F for TXV). |
| Low Pressure Lockout | 3 LP trips within 1 hour. System locked on "Loss of Charge" or LP Lockout. | Board will not auto-reset — manual reset required (hold RESET on thermostat or cycle 24V power). Locate and repair leak before resetting. |
| High Pressure Lockout | HP switch opened. Hard lockout — manual reset only. | Reset only after confirming cause is corrected. HP lockout on a new or recently-serviced unit: check refrigerant charge (overcharge). |
| Compressor Overtemperature | Discharge line temperature sensor reading > 225°F. Low charge or failed condenser fan most common cause. | Verify charge and condenser operation. Check discharge temp sensor resistance: NTC ~10 kΩ at 77°F — replace if open or shorted. |
| Compressor No-Start / Proof Failure | Contactor pulled but current sensor did not confirm compressor started. | Check line voltage at compressor terminals (should be within 10% of nameplate). Check contactor for pitted contacts. Check compressor winding resistance (T1–T2, T2–T3, T1–T3 — should be < 2Ω each, balanced). |

**Heating Faults:**

| Fault Message | Cause | Field Fix |
|---|---|---|
| Draft Pressure Fault | Inducer draft switch not closing. Inducer not running, blocked flue, flooded condensate trap, or cracked inducer wheel. | Verify inducer running (2,800–3,200 RPM). Check flue for bird/wasp nests. Inspect condensate drain — flooded trap creates back-pressure against inducer. Test draft switch: apply −0.35" W.C. via manometer — contacts should close. |
| Ignition Failure / Lockout | Failed to prove flame in 3 attempts. Gas supply issue, failed hot surface igniter (HSI), weak flame sensor signal, or wrong gas pressure. | Check manifold gas pressure: 3.5" W.C. natural / 10.0" W.C. propane. Inspect HSI — glowing orange within 15–17 sec is normal; black/cracked = replace. Clean flame sensor rod with fine steel wool (carbon buildup causes weak µA signal). Soft lockout auto-resets after 1 hour. |
| High Limit Fault | Heat exchanger temperature exceeded high-limit switch setpoint (~175–200°F). Insufficient airflow. | Check filter static pressure drop (> 0.5" W.C. = replace filter). Verify supply blower is running and belt (if belt-drive) is not slipping. Check blower wheel for buildup. High-limit switch is auto-reset — confirm cause before assuming switch failed. |
| Rollout Fault | Rollout limit switch opened. Flame escaping combustion chamber — heat exchanger integrity issue. | Manual reset required: press red button on burner box. **Do not reset repeatedly without investigating** — rollout trips indicate a cracked heat exchanger or combustion gas path problem. CO risk. |

**Sensor / Communication Faults:**

| Fault Message | Cause | Field Fix |
|---|---|---|
| OAT Sensor Fault | Outdoor air temperature sensor open circuit or shorted | Check sensor resistance at board connector: NTC thermistor ~10 kΩ at 77°F. Inspect sensor wiring for chafing (common near sheet metal edges). |
| DAT Sensor Fault | Discharge air temperature sensor out of range | Check sensor at DCT connector. Confirm sensor is seated in discharge duct properly. |
| Thermostat Comm Fault | Loss of RS-485 communication between SE-SPU board and Simplicity SE thermostat | Check 4-conductor cable between board and thermostat: pins 1/2 = RS-485 COMM+/COMM−; pins 3/4 = 24VAC power feed to thermostat. Verify polarity (reversed COMM+/− = no communication). Check for cable damage or water ingress in thermostat conduit. |
| Control Config Fault | Board parameters unconfigured or corrupted | Connect USB drive and download fault log first. Reconnect field laptop with Simplicity SE utility or re-run commissioning wizard from thermostat: Menu → Setup → Unit Configuration. Reload firmware via USB if config corruption is suspected. |

#### Accessing Fault History on Simplicity SE

**Via thermostat display:**
1. Press **MENU** on Simplicity SE thermostat
2. Navigate to: **Service** → **Diagnostics** → **Fault History**
3. Stores last 10 faults with: fault name, date/time, sensor readings at fault, compressor hours at fault, reset method used

**Via USB drive:**
1. Insert USB drive into SE-SPU1002-10 USB-A port
2. Green Status LED flashes rapidly during transfer (5–15 sec)
3. Remove drive — open fault_log.csv on any computer
4. Fault log contains: fault code, timestamp, sensor snapshot, runtime data

**Manual reset methods:**
- **Soft lockout** (LP, ignition): thermostat RESET button, or auto-resets after 1 hour
- **Hard lockout** (HP, rollout): cycle 24VAC power to board, OR hold RESET on thermostat for 10 seconds

---

### Economizer System

**Damper actuator:** Honeywell ML6161 or equivalent (spring-return, 24VAC). Modulating 0–100% on LX series with 0–10VDC signal; 2-position on standard Predator (open/closed).

**Changeover sensors:**
- Differential dry-bulb: single OAT sensor vs RAT sensor, opens damper when OAT < RAT − differential
- Differential enthalpy: Honeywell C7400A enthalpy sensors at OA and RA intakes
  - C7400A output: 2–10VDC proportional to enthalpy
  - 2VDC = low enthalpy (favorable outside conditions); 10VDC = high enthalpy

**Enthalpy wheel option (LX high-efficiency models):** energy recovery wheel transfers heat/moisture between exhaust and intake airstreams. Wheel drive motor: 1/4 HP, 120VAC; check belt tension and wheel purge sector quarterly.

**Damper calibration procedure (modulating economizer on LX):**
1. Shut off power to actuator (disconnect actuator signal wire)
2. Manually position damper to 0% (fully closed) — damper should spring-close without power
3. Restore power to actuator
4. Send Y1 signal (24VAC or 10VDC depending on actuator type) and verify full stroke to 100% open
5. Measure mixed-air temperature at both extremes to verify sensor readings are logical
6. On OptiView: navigate to Economizer → Calibrate to initiate auto-calibration routine

---

### Heating Section

**Draft inducer:**
- Manufacturer: Fasco Industries 702111538 or equivalent (model-specific — check parts manual)
- Typical specs: 120VAC, 0.8–1.2A, 3000 RPM, sleeve bearing
- Check capacitor: most inducer motors use a run capacitor (5–10µF); measure with capacitance meter

**Pressure switch:**
- Standard setpoint: closes on −0.35" W.C. differential (rise-to-close sensing manifold pressure)
- Opens on loss of draft pressure when inducer fails or flue blocks
- Test: apply −0.35" W.C. with a manometer and hand pump to the pressure port; contacts should close

**Ignition system (standard Predator/Sunline):**
- DSI (Direct Spark Ignition) on older units; HSI on current Predator production
- IFC (Ignition Field Control) board handles sequence timing
- Normal sequence: W1 call → inducer on → pressure switch closes (within 30 sec) → HSI heat-up (17 sec on HSI models) → gas valve open → flame sense within 7 sec
- Retries: 3 attempts then soft lockout (1-hour wait)

**Multi-speed ID fan (LX series):** 2-speed on standard, variable-speed on high-efficiency. Variable-speed ID fan controlled by Quantum board PWM signal. Fault: variable-speed control board fails, inducer runs at full speed only (noisy at part-load heating).

#### Common Heating Faults

**Pressure switch won't close:**
- Step 1: verify inducer is spinning (visually or with tachometer — should be 2800–3200 RPM)
- Step 2: check for blocked flue (birds, wasps, collapsed vent)
- Step 3: inspect inducer wheel — cracked wheel (plastic) reduces static pressure output significantly
- Step 4: check condensate trap — if trap is flooded, condensate backs up and creates positive pressure opposing inducer
- Step 5: test pressure switch directly with manometer — if switch closes at correct differential but board still shows fault, check switch wiring continuity

**Rollout switch tripped:**
- Location: red manual-reset button on burner box front panel
- Cause: flame rolls out of burner combustion area due to restricted heat exchanger, improper gas pressure, or wrong orifices
- Always investigate cause before resetting — repeated rollout trips indicate a serious combustion problem
- Reset: press red button firmly until it clicks; button will not hold in if temperature at rollout switch bimetal is still above trip point

---

### Compressor Protection

**High discharge temperature sensor:**
- Carlislie sensor (NTC type) on discharge line
- Opens output at 225°F discharge temp; auto-resets when discharge temp drops to 185°F
- Persistent high discharge temp cause: low refrigerant charge, failed condenser fan, dirty condenser coil

**Crankcase heater:**
- 40–70W PTC heater element on compressor crankcase
- **Critical:** energize crankcase heater minimum 8 hours before first cooling season startup after extended off period
- Refrigerant migrates to compressor crankcase during extended off periods; starting compressor with liquid refrigerant in crankcase = slug damage
- Verify heater is energized: measure temperature at crankcase (should be warm to touch, 90–110°F ambient + elevation); or clamp ammeter on heater circuit

**Klixon overload:**
- Internal overload protector embedded in compressor motor windings
- Trips on overcurrent or winding overtemperature
- Auto-reset after 30–60 minutes of cooling
- Check: if compressor is silent (no hum) and 24VAC is at contactor coil and contactor is pulled in, suspect internal overload — wait 45 minutes, try again

---

### Known Field Issues — York/JCI Predator

**Corroded terminal boards on Quantum controller:**
- York Predator units installed in coastal or high-humidity environments (within 1 mile of ocean) are notorious for corrosion on the Quantum board terminal strips
- Symptoms: intermittent faults, sensors reading erratic, unexplained lockouts
- Inspection interval: every 2 years in coastal environments
- Remedy: clean terminal strip with contact cleaner, apply dielectric grease; replace board if traces are corroded through

**Refrigerant charge loss through Schrader cores:**
- York RTUs have reported slow leaks at Schrader valve cores on service ports, particularly on units > 5 years old
- Replace standard Schrader cores with locking-style caps (JB Industries LP-5 or equivalent) at every PM visit
- Locking caps require a special tool to remove — prevents vandalism and slow-leak loss

**Evaporator coil freeze from combined low-airflow faults:**
- Common scenario: partially-failed supply blower capacitor + dirty filter = just enough airflow restriction to freeze coil at night when thermostat setpoint drops
- Morning finding: ice-packed evaporator, no cooling, possible liquid flood-back to compressor
- Check capacitor µF (within ±6% of nameplate) and filter static pressure at every PM

**Economizer full-open fault from failed enthalpy sensor:**
- C7400A sensor failure mode: output sticks at 2VDC (indicating ideal outside conditions), damper stays 100% open regardless of actual conditions
- Result: high humidity and temperature complaints in summer
- Test: disconnect sensor signal wire, verify damper goes to minimum position; if yes, replace sensor

---

### Refrigerant Notes

**R-410A (post-2010 Predator ZJ/ZR):** standard. Charge to subcooling spec (TXV equipped): 10–15°F. Use only R-410A-rated service equipment (hoses, gauges rated to 800 psi minimum).

**R-22 (pre-2009 Sunline DJSC/DJFC, legacy service only):** R-22 is no longer produced for new equipment (EPA phaseout). For legacy R-22 units:
- Use reclaimed R-22 or approved R-22 replacement refrigerants (MO29, RS-44B — confirm compressor OEM acceptance)
- Check filter-drier annually on units > 10 years — acid formation in aged mineral oil systems can plug capillary tubes or TXV inlet screens
- Consider recommending full unit replacement to building owner on units > 15 years

---

### Maintenance Intervals

| Task | Interval |
|---|---|
| Filter replacement | Quarterly |
| Condenser coil cleaning | Annually (spring) |
| Evaporator coil cleaning | Annually |
| Quantum board terminal inspection | Every 2 years (annually in coastal areas) |
| Crankcase heater verification | Pre-season (before first cooling startup) |
| Gas pressure check | Annually |
| Filter drier inspection (older R-22 units) | Annually |
| Locking Schrader caps check | Every PM visit |
| Economizer stroke test | Annually |
| Rollout and high-limit switch continuity test | Annually |
`

export const TRANE_RTU_KNOWLEDGE = `
## Trane Commercial Rooftop Units — Field Reference

![Trane Technologies logo](https://upload.wikimedia.org/wikipedia/commons/9/9b/TraneTechnologieslogo.svg)

![Commercial rooftop packaged HVAC units](https://upload.wikimedia.org/wikipedia/commons/9/90/Rooftop_Packaged_Units.JPG "Commercial rooftop packaged units — Trane Precedent and Sintesis series")

---

### Model Families Overview

| Series | Name | Type | Capacity |
|---|---|---|---|
| YCD / YCH | Precedent | Gas/electric, 3-phase | 3–10 ton |
| YSD / YSH | Precedent | Gas/electric, large commercial | 12.5–25 ton |
| Sintesis | — | High efficiency commercial | 10–50 ton |
| Voyager | TCONT/TONT | Older commercial, gas/electric | 3–25 ton (legacy) |
| Intellipak II | — | Large commercial | 20–130 ton |

**Precedent YCD naming example: YCD060F3ELA**
- **Y** = commercial product line
- **C** = cooling
- **D** = direct-drive supply fan
- **060** = 5-ton nominal (060 MBH ÷ 12 = 5 ton)
- **F** = 2-stage gas heat
- **3** = 3-phase
- **E** = high-efficiency variant
- **L** = 575V/60Hz/3-phase (Canadian standard; US equivalent is 460V) — always verify unit nameplate
- **A** = design sequence

**YSH (large Precedent):** YS = large, H = gas heat. Units ≥12.5 ton have top-accessible filter rack — remove top panel for filter access (distinct from smaller units' front access).

---

### ReliaTel Control System

The ReliaTel control system is split across two key modules:

**RTOM — Refrigeration/Unit Output Module:**
- Controls compressor contactors, condenser fan motors, economizer actuator outputs
- Houses the primary diagnostic LED array
- Field-replaceable module (plug-in to main wiring harness)

**RTRM — Refrigeration/Thermostat Module:**
- Receives thermostat inputs (Y1, Y2, W1, W2, G, etc.)
- Communicates with RTOM over internal data bus
- Contains the system control algorithm (temperature staging, safeties)
- Houses battery backup for fault memory retention

#### ReliaTel LED Diagnostics (RTOM)

| LED | Normal State | Fault Indication |
|---|---|---|
| POWER (green) | Steady on | Off = no 24VAC supply |
| ALERT (amber) | Off | Flashing = active diagnostic fault |
| ALARM (red) | Off | Steady = system lockout |

**Reading active diagnostic codes via DIP switch:**
1. Locate DIP switches 1–8 on the RTOM board
2. The DIP switches display the binary code of the active fault when ALERT LED is flashing
3. Read switch positions: ON = 1 (up), OFF = 0 (down)
4. Convert binary to decimal for fault code lookup
5. Example: DIP 1=ON, 2=OFF, 3=OFF, others OFF = binary 00000001 = Code 1

**Trane ReliaTel Fault Code Table:**

| Code | Fault Description |
|---|---|
| 1 | Low refrigerant pressure (LP switch open) |
| 2 | High refrigerant pressure (HP switch open, manual reset) |
| 3 | Low discharge superheat (compressor flood-back risk) |
| 4 | Compressor overload (Klixon or external overload) |
| 5 | Outdoor fan motor failure (current sensing) |
| 6 | Supply fan motor failure (current sensing or airflow switch) |
| 7 | Freeze stat trip (evaporator temp below 32°F) |
| 8 | Economizer fault (actuator feedback out of range, sensor fault) |
| 9 | Heat section fault (high limit, rollout, ignition failure) |
| 10 | Low ambient lockout (OAT below minimum cooling ambient — typically 35°F) |
| 11 | Loss of charge (LP locked out after 3 trips) |

**Reading fault history:** RTRM module retains last fault in battery-backed memory. With ReliaTel, connect Trane service tool (TechView laptop software) for full fault log with timestamps and sensor values at fault time. Without TechView: observe ALERT LED flash pattern and read DIP switches to identify most recent active code.

---

### Tracer Controls (BAS Integration)

**Tracer UC400 / UC600 controllers:** building automation system integration modules. Used when Trane RTU is tied to a BAS (BACnet, LonTalk, or Modbus over RS-485).

**Communication protocols:**
- LonTalk (FTT-10A): 78 kbps, free-topology wiring (up to 500m without repeater). Termination: 105Ω terminator at each physical end of bus segment.
- BACnet MS/TP: RS-485, 9600 or 76800 baud. Max devices per segment: 128. Termination: 120Ω at each end.

**Tracer test mode:**
1. Press and hold the TEST button on the Tracer controller for 3 seconds
2. Unit enters output test cycle (energizes each output in sequence for commissioning verification)
3. Sequence: supply fan → cooling stage 1 → cooling stage 2 → heat stage 1 → heat stage 2 → economizer open → economizer close
4. Press TEST button again to advance to next output during test sequence
5. Test mode times out automatically after 15 minutes if not manually ended

**Communication loss fault:** Tracer controller loses BAS communication → unit falls back to standalone operation using last received setpoints or factory defaults (typically 74°F cooling, 68°F heating). Field-program fallback setpoints via TechView before commissioning.

---

### Economizer — Trane Economizer2

**Types:**
- Standard: differential dry-bulb (OAT vs RAT)
- Optional: differential enthalpy (OAT vs RAT enthalpy comparison)

**Actuator (standard Precedent):**
- Belimo NF24-SR or equivalent
- 24VAC power, spring-return to closed (normally closed)
- 0–10VDC modulating signal from RTOM

**High-efficiency Sintesis units:** Belimo LF24-SR (spring-return) with 0–10V modulating — allows precise mixed-air temperature control.

**Economizer fault diagnostics via ReliaTel (Code 8):**
- RTOM Code 8 = economizer fault
- Possible causes in order:
  1. Actuator feedback signal out of range (RTOM expects 0–10VDC feedback; check at RTOM feedback terminal)
  2. Mixed-air temperature sensor failure (open or short — see sensor resistance table)
  3. High-limit switch in economizer housing tripped
  4. Actuator binding or gear failure
- Isolate: disconnect actuator feedback wire; if Code 8 clears = actuator feedback issue; if persists = sensor or high-limit switch

**Mixed-air sensor resistance table (Trane 600Ω thermistor):**

| Temperature (°F) | Resistance (Ω) |
|---|---|
| 32 | 1130 |
| 50 | 800 |
| 68 | 580 |
| 77 | 500 |
| 86 | 440 |

---

### Two-Stage Refrigeration (YCD/YCH ≥7.5 Ton, YSD/YSH)

**Stage architecture:**
- Stage 1: Compressor 1 + Condenser Fan 1 circuit
- Stage 2: Compressor 2 + Condenser Fan 2 circuit (energized only when Stage 1 insufficient)

**Staging control:**
- Discharge air temperature: RTOM stages up when supply air temp > setpoint + 2°F differential; stages down when supply air temp < setpoint − 2°F
- Suction pressure: alternate staging algorithm on some units — uses suction pressure to stage compressors

**Compressor timers:** minimum-on time (3 min) and minimum-off time (3 min) prevent short-cycling. Stored in RTRM.

---

### Heat Section

**IFC (Integrated Furnace Control) board:**
- Controls ignition sequence independently of ReliaTel RTOM
- Reports heat fault to RTOM via hardwired signal (W fault output)

**Normal ignition sequence (Precedent gas heat):**
1. W1 thermostat call
2. Draft inducer energizes (24VAC from IFC)
3. Pressure switch must close within 15 seconds — if not: IFC aborts, reports fault to RTOM
4. HSI heater pre-heat: 34-second warm-up (Trane uses longer preheat than Lennox/Carrier)
5. Gas valve opens
6. Flame sense: flame must be detected within 7 seconds
7. If flame detected: normal heating operation; IFC monitors flame continuously
8. Lockout after 3 failed ignition retries

**Rollout switch:**
- Location: burner box front — red button
- Trip temperature: 195°F auto-reset; 210°F manual-reset
- Manual-reset switch requires pressing firmly — verify button is down and latched before restoring power
- Persistent rollout trips: inspect heat exchanger for blockage, verify gas manifold pressure (3.5" W.C. NG), check burner orifice sizing for altitude

**High-limit switch:**
- Auto-reset version: opens at 170°F, resets at 140°F
- Manual-reset version: opens at 200°F (requires manual button press after cooling)
- Location: supply air plenum above heat exchanger

---

### Common Faults

**RTRM or RTOM board failure:**
Before condemning either board, perform these checks:
1. Verify 24VAC supply at board power terminals (should be 24–28VAC under load)
2. Check all fused circuits on board: typically F1 (transformer), F2 (control), F3 (economizer) — pull each fuse, measure continuity
3. Inspect all connector seating on board (pull and reseat each connector — corrosion or vibration can cause intermittent contact)
4. Verify 5VDC reference supply on board (test point labeled 5V REF or similar) — if missing, board is internally failed
5. Only after verifying all external wiring, power, and fuses: condemn board

**Scroll compressor internal overload trip in high ambient:**
- Scenario: high ambient (>95°F), dirty condenser coil, or weak condenser fan motor capacitor → condenser fan slows → head pressure spikes → compressor internal overload trips
- Diagnosis: condenser fan running (check amp draw on all condenser fan motors — if < 50% of nameplate = capacitor weak), head pressure high
- Check condenser fan run capacitors: measure µF within ±6% of nameplate (35µF, 40µF most common on 5-ton condenser fans)
- Fix: replace capacitor, clean coil; verify condenser fan motor amp draw returns to nameplate after repair

**TXV failure (low suction, high superheat):**
- Symptom: low suction pressure (<60 psig R-410A), high suction line temperature at compressor
- Confirm: temperature clamp at suction line at compressor — should be 45–65°F on a typical day
- Superheat calculation: (Suction line temp) − (Suction saturation temp from pressure gauge)
- If superheat > 25°F with adequate airflow and correct charge level: suspect stuck-closed TXV
- TXV test: using liquid line temperature and suction pressure, look up target superheat on manufacturer superheat chart. If measured superheat >> chart target = TXV restrictive
- Fix: replace TXV assembly (body + power element + bulb as complete assembly — do not mix brands or generations)

**Tracer communication loss:**
- Symptom: BAS shows units offline; units running on fallback setpoints
- Check: LonTalk/BACnet wiring for continuity (ring out each segment end-to-end)
- Verify termination resistors: only two terminators per bus segment; check with ohmmeter across bus with all devices powered off (should read ~60Ω for BACnet or ~52Ω for FTT-10)
- Check power supply at each Tracer controller (24VAC from Class 2 transformer)
- Common failure: one corroded splice in the RS-485 cable takes down entire daisy-chain segment

---

### Maintenance Schedule

| Task | Interval |
|---|---|
| Filter replacement (large Precedent: top panel access) | Quarterly |
| Coil cleaning (low-pressure coil cleaner) | Annually |
| Belt tension (supply blower): 1/2" deflection per foot of span | Every 6 months |
| ReliaTel battery backup replacement | Every 5 years |
| Gas pressure verification (3.5" W.C. NG) | Annually |
| Combustion analysis | Annually |
| Economizer stroke test | Annually |
| Condenser fan capacitor check | Annually |
| Compressor terminal torque | Annually |
| LonTalk/BACnet wiring inspection | Every 2 years |

**Filter access on large Precedent (YSD/YSH ≥12.5 ton):**
- Remove top panel (2 quarter-turn fasteners per side)
- Filter rack slides out from top of unit
- Reinstall: verify filter rack seated fully before replacing top panel to prevent bypass air

**ReliaTel battery:** CR2032 coin cell on RTRM board (or rechargeable NiMH on some revisions). Battery failure = loss of fault memory and setpoint retention across power interruptions.
`

export const RTU_HVAC_DIAGNOSTICS_KNOWLEDGE = `
## RTU Fault Diagnosis — Cross-Manufacturer Field Reference

![Commercial rooftop packaged HVAC units](https://upload.wikimedia.org/wikipedia/commons/9/90/Rooftop_Packaged_Units.JPG "Commercial rooftop packaged units — the type covered in this cross-manufacturer troubleshooting guide")

---

### Cooling Mode Diagnosis

#### No Cooling — Symptom Tree

Work through this sequence before replacing any components:

**1. Thermostat call verified?**
- Confirm Y1 (and Y2 for 2-stage) is active at thermostat
- Measure 24VAC between Y1 and C at unit control board — should be 24–28VAC when thermostat calls for cooling
- If no 24VAC: thermostat wiring, thermostat failure, or transformer issue

**2. 24VAC at compressor contactor coil?**
- Measure between contactor coil terminals (A1 and A2 on most contactors)
- Should be 24VAC when Y1 call is present and no safeties are open
- If no 24VAC: check high-pressure switch, low-pressure switch, freeze stat, and any other series-wired safeties

**3. Contactor pulled in?**
- Listen for audible click when 24VAC applies
- Check line-side and load-side voltage on contactor (should be within 5V of each other when pulled in)
- If 24VAC present at coil but contactor not pulling in: coil burnt out — replace contactor

**4. Compressor response (pulled-in contactor):**
- **Compressor hums but doesn't start:** check start capacitor (if equipped) and start relay; check for mechanical seizure (try rotating shaft if accessible — if won't turn, compressor is seized)
- **Compressor silent with contactor pulled in:** internal overload tripped — wait 30–45 minutes for thermal reset; check line voltage (low voltage = compressor won't start)
- **Compressor trips breaker immediately:** check for compressor short to ground (megohm test: should be >1 MΩ phase to ground); check for phase-to-phase short (should be >0.3Ω between each winding pair)

**5. Compressor running but no cooling:**
- Compressor running but not pumping: broken valve reeds (reciprocating) or failed scroll wraps — check compression ratio: suction should drop below 100 psig (R-410A) within 3 min of startup; if not, compressor is not pumping
- Liquid line solenoid not opening: verify 24VAC at solenoid coil; if coil has power but solenoid is closed, replace solenoid coil or valve

---

#### Low Cooling Capacity — Diagnosis Sequence

**Always start with airflow before touching refrigerant gauges.**

**Step 1: Static pressure across filter bank**
- Clean filter: 0.05–0.10" W.C. differential
- Dirty filter requiring replacement: 0.20–0.25" W.C.
- Use digital manometer with two Magnehelic probes — one upstream, one downstream of filter rack
- Replace filter if pressure drop > 0.20" W.C. before proceeding

**Step 2: Supply/return temperature split (delta-T)**
- Measure supply air temperature at nearest supply register
- Measure return air temperature at return grille
- Target delta-T: 18–22°F for adequate cooling
- Delta-T < 14°F: low airflow or low refrigerant charge
- Delta-T > 24°F: restricted airflow or overcharged refrigerant

**Step 3: Refrigerant check (after confirming airflow is adequate)**
- Attach gauges (R-410A rated to 800 psi minimum — use low-loss fittings)
- Measure suction and discharge pressures
- Compare suction saturation temp to expected evaporator temp (typically 40–45°F evaporator)
- Normal R-410A operating pressures at 75°F return air, 95°F OAT:
  - Suction: ~115–125 psig (40–45°F saturation)
  - Discharge: ~375–420 psig (115–125°F condensing)
- **High suction, low discharge, large delta-T**: likely overcharged or low condensing
- **Low suction, high superheat, small delta-T**: likely low charge or airflow restricted

---

#### High Head Pressure — Causes and Tests

| Cause | Test | Fix |
|---|---|---|
| Dirty condenser coil | Measure OAT and condensing sat temp: target condensing = OAT + 25°F. If > OAT + 35°F = dirty | Clean coil (alkaline cleaner inside-out) |
| Failed condenser fan motor | Clamp ammeter on condenser fan motor leads — compare to nameplate. Low amps = weak capacitor or failed motor | Replace capacitor first; then motor if capacitor doesn't resolve |
| Non-condensables in system | Shut unit off, allow pressures to equalize, wait 20 min for refrigerant temperature to equalize with ambient. Read static pressure and compare to R-410A saturation at that ambient temp. If pressure > saturation = non-condensables present | Recover refrigerant, evacuate system to <200 microns, reweigh-in refrigerant |
| Overcharge | After confirming airflow good: measure subcooling. > 18°F = overcharged | Remove refrigerant in small increments, verify subcooling 10–15°F |

---

#### Low Suction Pressure — Causes and Tests

| Cause | Test | Fix |
|---|---|---|
| Refrigerant undercharge | Measure superheat: > 15°F = likely undercharge; also check for oil foaming at sight glass | Find and repair leak, recharge to spec |
| Low airflow / frozen evaporator | Measure static pressure across evap coil — high DP = frost buildup. Shut unit off, allow 30 min defrost, restart and verify airflow | Correct airflow cause (filter, fan motor, coil cleaning) |
| TXV stuck closed | Superheat high (>25°F), suction temp at compressor above 70°F | Replace TXV assembly |
| Liquid line solenoid not fully open | Check pressure drop across solenoid body (> 5 psig = restricted) | Replace solenoid coil; if persists, replace valve body |
| Plugged liquid line filter-drier | Measure liquid line temp before and after drier — if > 3°F temperature drop across drier = restricted | Replace filter drier (bi-flow on heat pump units, directional on cooling-only) |

---

### Heating Mode Diagnosis

#### No Heat — Symptom Tree

**1. W1 thermostat call present?**
- Measure 24VAC at W1 terminal on control board
- If no call: thermostat or wiring issue

**2. 24VAC at gas valve?**
- Measure at gas valve operator terminals
- No voltage: check inducer status first (must be proven on before gas valve can energize)
- No voltage with inducer running and pressure switch verified closed: check IFC/ignition board output

**3. Inducer motor running?**
- Listen for inducer startup (low hum, building to steady operation)
- If no inducer: check 120VAC at inducer motor (IFC board provides switched 120VAC to inducer)
- Inducer hums but doesn't spin: check run capacitor (5–10µF) — replace if outside ±6%

**4. Pressure switch closed?**
- Test switch directly: measure continuity across switch terminals with inducer running
- If switch does not close with inducer running: check for blocked flue, cracked inducer wheel, condensate in switch tubing

**5. Gas valve opens but no flame:**
- Verify gas supply — check incoming pressure and manual shutoff valves are open
- Verify gas valve is functional: measure coil resistance (gas valve solenoid: typically 10–20Ω)
- HSI glow: verify HSI is energizing (should glow orange-white within 17–34 seconds of IFC command)

---

#### Delayed Ignition

Symptoms: ignition occurs after a 2–4 second delay with a "poof" or small backfire sound.

**Causes and fixes:**
- **Dirty burners**: remove burner assembly (typically 4 screws on burner manifold); clean ports with compressed air; never use wire brushes on burner ports
- **Low gas pressure**: measure manifold pressure with digital manometer at manifold test port; target 3.5" W.C. (NG) or 10.0" W.C. (propane)
- **Wrong orifices for altitude**: at elevations > 2,000 ft, standard sea-level orifices deliver too much gas for the available combustion air; use altitude-derated orifices per manufacturer altitude chart
- **Wet gas or debris in gas train**: water in gas line causes inconsistent ignition timing; install a gas dryer upstream

---

#### Rollout Switch Trips

**Causes:**
1. Restricted heat exchanger (secondary HX plugged with scale or corrosion products)
2. Incorrect manifold gas pressure (too high = overfire = flame rollout)
3. Wrong orifices for gas type (propane orifice with natural gas = severely oversized flow)
4. Cracked primary heat exchanger (combustion air escapes into heat exchanger rather than flowing through burner)
5. Insufficient combustion air (blocked combustion air inlet on roof unit)

**Protocol after rollout trip:**
1. Do not reset and return the unit to service without investigation
2. Inspect burner box for soot or carbon deposits indicating sustained rollout
3. Verify gas manifold pressure
4. Inspect heat exchanger for blockage or cracks
5. If cause is unclear after inspection, perform CO test at supply registers

---

#### Cracked Heat Exchanger Protocol

**Detection methods:**
1. **CO test**: combustion analyzer at supply registers, unit in heating mode, all air handlers at full airflow. >9 ppm CO is actionable; >35 ppm is OSHA action level
2. **Visual inspection**: bright flashlight and mirror inside heat exchanger access panel. Look for cracks, pinholes, deformation, soot lines running from combustion side to air side
3. **Combustion analyzer**: measure CO and CO2 in flue exhaust; CO >400 ppm in flue = incomplete combustion (not necessarily cracked HX, but warrants further investigation)
4. **Dye/smoke test**: introduce non-combustible dye smoke into firebox; UV light on supply air stream for traces

**Action:**
- Confirmed cracked HX: shut down gas heat immediately, tag unit "GAS HEAT DISABLED — CRACKED HX"
- Notify building owner/manager in writing
- Unit may continue running in cooling mode only if cooling section is separate and unaffected
- HX replacement requires complete heat section disassembly — typically 4–8 hours labor; often justifies full unit replacement on older units

---

### Economizer Operation

#### Free-Cooling Theory

When outdoor air is cooler and/or drier than return air, a rooftop unit can cool the building entirely with outdoor air — zero compressor operation. The economizer damper opens to deliver 100% outdoor air. Compressors remain off as long as OA conditions are favorable and building temperature is satisfied.

**Conditions for economizer to provide free cooling:**
- OA temperature (differential dry-bulb) or OA enthalpy (differential enthalpy) is more favorable than return air
- Building is calling for cooling (Y1 from thermostat)
- Supply air temperature can be maintained above 55°F (high-limit control)

**Changeover setpoints:**
- Dry-bulb differential: economizer opens when OAT < RAT − 2°F (typical setpoint; adjustable on most controls)
- Enthalpy differential: economizer opens when OA enthalpy < RA enthalpy − 2 BTU/lb

**Mixed-air temperature control:** once damper is open, modulating economizer control adjusts damper position to maintain mixed-air temperature at setpoint (typically 55°F). This prevents over-cooling and condensation on supply registers.

**High-limit control:** prevents supply air from dropping below 55°F. If mixed-air sensor reads below 55°F, damper modulates toward closed until temperature recovers.

#### Economizer Troubleshooting

**Damper stuck open in heating season:**
- Result: cold outdoor air enters building during heating, defeating heating operation
- Test: disconnect Y1 signal wire at actuator. If damper closes = control signal issue (board not commanding off). If damper stays open = spring failed or damper physically bound
- Also check: minimum position setpoint — if set > 0%, damper will not fully close (intentional code minimum OA ventilation). Confirm minimum position is appropriate for the space (ASHRAE 62.1 requires minimum OA cfm based on occupancy and floor area)

**Damper stuck closed in free-cooling conditions:**
- Result: compressors run when free cooling should be available — wastes energy
- Test: verify Y1 signal is present at economizer actuator (24VAC or 0–10VDC depending on type) when thermostat calls for cooling
- Check enthalpy/dry-bulb sensor voltage: sensor should output 2–10VDC proportional to conditions. Use a voltmeter at sensor output terminal:
  - 2VDC = very favorable (should open)
  - 10VDC = very unfavorable (should stay closed)
  - Stuck at 10VDC on a cool dry day = sensor failed (replace)

**Minimum position setting:**
- ASHRAE 62.1 requires continuous minimum outdoor air flow for occupied spaces
- Typical commercial minimum: 0.15 cfm/sq.ft. or 5–10% damper opening at low occupancy
- Verify minimum position is set and verified (not zero in heating season, not bypassing ventilation code)

---

### Refrigerant Charging in RTUs

#### Weighing-In (Preferred Method)

1. Recover all remaining refrigerant (required if contaminated or if fully evacuating for repair)
2. Evacuate system to <200 microns with a quality vacuum pump — hold 10 minutes, verify no rise > 200 microns (indicates leak or moisture)
3. Calculate nameplate charge (unit label or service manual)
4. Tare scale, place refrigerant cylinder, connect to liquid line service valve
5. Charge full nameplate weight with unit off; top off with gauges running once within ±1 lb of full charge

#### Field Superheat Method (Fixed-Orifice Systems)

1. Record outdoor ambient temperature (OAT) — dry-bulb
2. Record return air wet-bulb (RWB) at return grille — use sling psychrometer or digital RH/temp meter to calculate WB
3. Look up target suction saturation temperature: reference manufacturer chart (or use approximation: Target sat temp ≈ RWB − 35°F)
4. Measure actual suction saturation: read suction pressure gauge → convert to saturation temperature using R-410A P/T chart
5. Measure suction line temperature with contact thermometer at suction service valve
6. Superheat = Suction line temp − Suction saturation temp
7. **If superheat > 15°F**: add refrigerant in 4-oz increments, allow 5 min to stabilize
8. **If superheat < 5°F**: remove refrigerant; risk of flood-back damage to compressor

#### Subcooling Method (TXV Systems)

1. Record liquid line temperature at liquid service valve (contact thermometer)
2. Record high-side pressure at liquid service valve (gauge)
3. Convert high-side pressure to saturation temperature (R-410A P/T chart)
4. Subcooling = Saturation temp − Liquid line temp
5. Target: 10–15°F subcooling
6. **< 10°F**: low charge or restriction upstream of measurement point
7. **> 18°F**: overcharged or liquid line restriction (check filter-drier pressure drop)

**Critical rule:** never add refrigerant without finding the leak first. Document any charge additions per EPA 608 requirements. R-410A systems operating significantly low on charge have a refrigerant leak — it didn't disappear on its own.

---

### Electrical Checks

**24VAC transformer:**
- Measure output at transformer secondary terminals — should be 24–28VAC under full control load
- < 22VAC under load: transformer is undersized or failing
- Common transformer: 40VA or 75VA (verify current draw matches transformer rating)
- Transformer primary: verify line voltage matches transformer primary tap (208, 230, 575, or 600V; US installations may use 460V tap)

**Contactor contact resistance:**
- Use low-resistance ohmmeter (DLRO or equivalent) — standard meters are not accurate at these levels
- Acceptable: < 0.5Ω per pole (L1 to T1, L2 to T2, L3 to T3 with contactor pulled in)
- Replace contactor if any pole reads > 1.0Ω — high resistance = heat build-up = compressor failure
- Also replace if contacts are visually pitted, arced, or show carbon buildup

**Capacitor testing:**
- Use dedicated capacitance meter (not multimeter auto-cap range — insufficient accuracy)
- Measure µF with capacitor disconnected from circuit
- Acceptable: within ±6% of nameplate µF rating
- Most common RTU run capacitors: 35+5µF (dual capacitor for fan and compressor), 40+5µF
- Replace all run capacitors > 5 years old as PM item — capacitors degrade with heat cycles

**Blower motor amp draw:**
- Clamp ammeter on motor leads
- Compare to nameplate FLA (full-load amps) at operating conditions
- > 10% above nameplate: motor is struggling (dirty wheel, bearing wear, over-belt tension)
- < 70% of nameplate on belt-drive: possible broken drive belt

**Compressor amp draw:**
- Measure all 3 legs (3-phase) — should be within 10% of each other
- Compare to compressor nameplate RLA (rated load amps)
- LRA (locked-rotor amps): 5–8× RLA; only seen momentarily on startup
- High amps all phases: high compression ratio, internal overload approaching trip
- Unbalanced amps: phase voltage imbalance or compressor winding problem

---

### Filter and Airflow

**Measuring filter static pressure:**
- Digital manometer (Magnehelic or electronic) with two probes
- Probe placement: one upstream of filter, one downstream
- Measure differential pressure across filter bank
- Reference values:

| Filter Condition | Static Pressure Drop |
|---|---|
| New / clean filter | 0.05–0.10" W.C. |
| Replace at | 0.20–0.25" W.C. |
| Severely restricted | > 0.40" W.C. |

**Supply/return delta-T as airflow indicator:**
- < 14°F delta-T: low airflow (check filter, motor, belt) OR low refrigerant charge
- 18–22°F delta-T: normal operation
- > 24°F delta-T: restricted airflow on return side OR overcharged OR restricted evaporator

**Grille velocity checks (optional, for airflow balancing):**
- Use vane anemometer at supply grilles
- Sum all grille CFM readings for an estimate of total supply airflow
- Compare to unit nameplate CFM rating — should be within 10%

---

### Seasonal Startup Checklist

Perform before first cooling season startup after any period > 4 weeks without compressor operation:

**Pre-startup electrical:**
- [ ] Verify crankcase heater is energized and has been on for minimum 8 hours
- [ ] Check all terminal connections for corrosion — clean and torque to spec
- [ ] Torque compressor terminals (often loosen from vibration over winter)
- [ ] Verify control transformer output voltage (24–28VAC)
- [ ] Check all fuses in unit — pull each fuse and measure continuity

**Refrigerant system (with unit off):**
- [ ] Read static (off) pressures — compare to R-410A saturation at current ambient temp
  - At 70°F ambient: R-410A static pressure should be approximately 201 psig
  - If pressures are low: system lost charge over winter — find and repair leak before charging
- [ ] Check sight glass (if equipped) for moisture indicator color (green = dry, yellow = moisture present)

**Safety system tests:**
- [ ] Test high-pressure cutout: block condenser airflow with cardboard until HP switch trips (do not allow pressure to exceed 430 psig — remove cardboard before that)
- [ ] Test low-pressure cutout: front-seat suction service valve slowly until LP switch trips (verify trip point per spec)
- [ ] Verify HP and LP switches reset correctly after test
- [ ] Test freeze stat: apply ice pack to evaporator coil sensor — verify unit shuts down within 60 seconds

**Economizer:**
- [ ] Manually stroke damper full open and full closed — verify smooth operation and no binding
- [ ] Test spring-return: disconnect 24VAC to actuator, verify damper closes fully within 10 seconds
- [ ] Verify minimum position setpoint is correct for the space

**Cooling operation:**
- [ ] Start unit, allow 10 minutes to reach steady state
- [ ] Record suction and discharge pressures, compare to expected for ambient conditions
- [ ] Measure supply/return delta-T — target 18–22°F
- [ ] Verify condenser fan amperage on all motors (within 10% of nameplate)
- [ ] Verify supply fan amperage

---

### Common Cross-Manufacturer Part Failures

**Run capacitors (most common PM replacement):**
- Replace proactively on PM if > 5 years old and > 90°F summer ambient
- Most common sizes on 3–5 ton RTUs: 35+5µF, 40+5µF (dual round capacitor), 45+5µF
- Ensure replacement capacitor voltage rating matches or exceeds original (370VAC or 440VAC)
- Never use a capacitor with lower µF than nameplate — motor will overheat

**Contactors:**
- Replace if contact pitting is visible or if unit is > 10 years with original contactor
- Replace as matched pair (2-pole for single-phase, 3-pole for 3-phase)
- Verify coil voltage (24VAC on all standard RTU applications)
- Carry 2-pole 30A and 3-pole 30A/40A on service vehicle as common replacements

**TXVs:**
- Hunting (oscillating suction pressure) indicates worn power element — the gas charge in the power element loses sensitivity over time
- Replace as complete assembly: body + power element + bulb
- Do not mix manufacturers or generations — use OEM or exact match replacement
- Rebulb carefully: clamp bulb securely to suction line at same orientation as original (typically 4 or 10 o'clock position on horizontal pipe)

**Pressure switches:**
- Test by applying pressure to port with hand pump and manometer — verify trip and reset points match spec (allow ±5% tolerance)
- Replace if measured trip/reset points have drifted > 5% from spec — field calibration is not reliable
- Stock: LP cutout switch, HP cutout/manual reset switch for most-common RTU brands

**Ignition transformers (spark ignition only):**
- Measure secondary output with insulated high-voltage meter leads: should be 6,000–12,000V depending on model
- Do not short-circuit secondary while measuring — use dedicated HV probe
- Replace if output < 5,000V or if arcing is visible at transformer housing
- HSI replacements: stock silicon nitride 120VAC elements — verify resistance (40–70Ω cold); carry universal replacement kit for common RTU sizes
`

export const AAON_RTU_KNOWLEDGE = `
# AAON / CES / Flo Rooftop Unit Knowledge Base

![AAON Inc. logo](https://upload.wikimedia.org/wikipedia/commons/e/e8/AAON_Logo.svg)

![Commercial rooftop packaged HVAC units](https://upload.wikimedia.org/wikipedia/commons/9/90/Rooftop_Packaged_Units.JPG "Commercial rooftop units — AAON RN and RQ series are installed in similar configurations")

AAON Inc. (Tulsa, OK) manufactures high-efficiency commercial packaged rooftop units sold under the AAON brand and distributed in some regions as CES (Climate Equipment Solutions) or Flo RTUs. Units are built-to-order with a wide option matrix. Key model families used in commercial/supermarket settings:

### Model Families

**RN Series — 6 to 70 tons**
- Most common AAON unit in supermarket and light-industrial settings
- Gas/electric, electric/electric, or heat pump configurations
- R-410A (legacy) and R-454B (Next Gen models, 2023+)
- Available with VFDs on supply and return fans (standard on many configurations)
- Next Gen RN (11–70 ton): improved scroll compressors, updated MCS-5 controls, R-454B ready

**RQ Series — 2 to 25 tons**
- Light commercial / smaller store applications
- Same MCS control platform as RN
- Belt-drive supply fan standard on smaller tonnages; direct-drive on larger
- R-410A standard; Next Gen RQ available with R-454B

**RZ Series — 4 to 25 tons**
- Condensing unit + air handler split variant; less common in rooftop applications
- Same refrigeration and control architecture as RN/RQ

**OH Series — Outdoor Horizontal**
- Horizontal-discharge for ground-level or side-wall mounting
- Same compressor and control platform as RN

### AAON Modular Control System (MCS)

AAON uses a proprietary control platform called MCS (Modular Control System). All AAON RTUs shipped since ~2010 use MCS; older units may have legacy Proctor-Jones or Microtech controls.

**MCS display panel:**
- 2-line or touchscreen LCD depending on model generation
- Navigate with UP/DOWN/ENTER/ESC or touchscreen
- Main menu → Diagnostics → Fault Log: stores last 10–20 fault events with timestamp
- Main menu → Status: shows all live sensor readings (supply air, return air, coil temps, pressures)
- Main menu → Setpoints: view/edit occupied/unoccupied setpoints, deadband, heat/cool stages

**MCS BACnet/Modbus integration:**
- BACnet MS/TP or BACnet IP via optional gateway card
- Modbus RTU standard on most models (RS-485 port on control board)
- Default Modbus address: 1 (field-configurable via DIP switch or menu)
- BACnet device instance: configurable via MCS menu
- All MCS points are mappable; AAON publishes full BACnet/Modbus point lists per model

### MCS Fault Codes — Common A & B Codes

| Code | Fault | Reset Type |
|------|-------|-----------|
| A01  | Supply air high temperature limit | Auto |
| A02  | Freeze protection (coil temp < 34°F) | Auto |
| A03  | Return air sensor fault (open/short) | Auto |
| A04  | Supply air sensor fault (open/short) | Auto |
| A11  | Compressor 1 high pressure lockout | Manual |
| A12  | Compressor 1 low pressure lockout | Auto (3 trips → manual) |
| A13  | Compressor 1 overload / internal thermostat | Manual |
| A14  | Compressor 1 high discharge temperature | Auto |
| A21  | Compressor 2 high pressure lockout | Manual |
| A22  | Compressor 2 low pressure lockout | Auto |
| A31/A41 | Compressor 3/4 (large units) — same pattern | |
| B01  | Supply fan overload / VFD fault | Manual |
| B02  | Supply fan airflow proving switch failed | Auto |
| B03  | Return fan overload / VFD fault | Manual |
| B11  | Gas heat — failed ignition (3 attempts) | Manual |
| B12  | Gas heat — high limit tripped | Auto |
| B13  | Gas heat — rollout switch tripped | Manual |
| C01  | Economizer actuator fault (end-switch not reached) | Auto |
| C02  | Economizer enthalpy sensor fault | Auto |

**Manual reset procedure:** Navigate to Main menu → Diagnostics → Reset Lockouts, or cycle power (30-second minimum off) — note that cycling power does NOT reset manual-reset faults on all models; use menu reset.

### Compressor Configuration

- Scroll compressors throughout: Copeland ZP/ZF or Danfoss/Maneurop MT/TT series
- Tandem compressors (two compressors, one circuit) on 10–25 ton models
- Quad compressors (four compressors, two circuits) on 20–40 ton models
- Large RN (40–70 ton): may have 6–8 compressors on 3–4 circuits
- Compressor staging via MCS: first-stage cooling = 50% capacity (one compressor or tandem lead)
- Compressor minimum run time: 3 minutes (factory default, field-adjustable)
- Low ambient lockout: 25°F default (field-adjustable); units can run to 0°F with low-ambient kit

**Refrigerant charging (R-410A RN/RQ):**
- System charged by weight at factory; use factory charge weight on nameplate + superheat/subcooling method
- Target suction superheat: 10–15°F at compressor suction service valve
- Target subcooling at liquid line: 10–15°F
- R-410A critical charge: ±0.5 lb on tandem systems will significantly affect performance

**R-454B (Next Gen) charging:**
- R-454B is mildly flammable (A2L) — follow AAON Next Gen IOM safety procedures
- Charge only as liquid (invert cylinder) — do not charge vapor-phase
- Same superheat/subcooling targets as R-410A

### Economizer

- Integrated economizer standard on most configurations
- Actuator: Belimo or equivalent spring-return 0–10VDC actuator (24VAC power)
- Control signal: 0VDC = closed, 10VDC = full open
- Enthalpy sensing: differential enthalpy (supply + return enthalpy) or dry-bulb switchover
- Economizer minimum position: field-adjustable 0–100% (default 10–20% for outdoor air ventilation)
- C01 fault: actuator did not reach commanded position — check actuator wiring, actuator end-switch, mechanical binding of damper
- Economizer override test: MCS menu → Outputs → Economizer → manually command to 100% open and verify damper physically opens

### Fan System

**Belt-drive (RQ 2–6 ton, some RN models):**
- V-belt tension: 1/2" deflection per foot of span at manufacturer-specified force
- Pulley alignment: use laser alignment tool or straightedge — misalignment > 1° causes rapid belt wear
- Belt replacement: use Gates or equivalent OEM-spec belt; AAON nameplate lists belt part number
- Bearing lubrication: NLGI #2 grease, 2–3 pumps per bearing per season

**Direct-drive / VFD (RN Series, larger RQ):**
- VFD faults: navigate to MCS → Diagnostics → VFD Status for drive fault codes
- VFD common faults: overcurrent (OC), overvoltage (OV), input phase loss (IPL)
- VFD reset: MCS menu → Reset Lockouts or cycle 24VAC control power to VFD
- Minimum VFD speed: 20 Hz default (do not reduce below 15 Hz — motor overheating risk)

### Gas Heat Section

- Modulating gas valve (0–100%) or staged (two-position: low/high fire) depending on model
- Ignition: direct-spark igniter or hot surface igniter (HSI) — see unit nameplate
- Flame sensor: microamp flame current — minimum 1.0µA to hold; typical 2–4µA
- B11 lockout (failed ignition): verify gas supply pressure (3.5" WC min for natural gas at manifold), check igniter gap (1/8" for spark, 1/4–3/8" for HSI), verify flame sensor rod is clean and positioned correctly
- Heat exchanger inspection: AAON uses stainless steel or aluminized steel — inspect annually with mirror and light; cracked HX = unit shutdown, tag out

### Seasonal Startup Checklist (AAON RTU)

1. Check and replace filters (1" MERV-8 standard, 2" optional)
2. Inspect and clean evaporator and condenser coils — use coil cleaner, low-pressure rinse
3. Belt inspection and tension (belt-drive models)
4. Verify refrigerant pressures match expected values at current ambient
5. Test economizer full-stroke (0→100%→0) via MCS menu
6. Verify MCS setpoints match current building schedule
7. Test heat sequence: command heat call via MCS, verify flame establishment within 3 ignition attempts
8. Check all electrical connections for tightness (torque spec per terminal label)
9. Verify condensate drain is clear and draining

### CES / Flo RTU Notes

- **CES (Climate Equipment Solutions)**: Regional distributor of AAON units in certain US markets. Units are AAON-manufactured with CES branding on the label. Service procedures, parts, and controls are identical to AAON RN/RQ. CES part numbers cross-reference directly to AAON part numbers.
- **Flo RTU**: AAON-based units distributed under the Flo brand in select markets. Same platform — MCS controls, AAON compressors, identical service access and wiring. When troubleshooting Flo units, reference AAON RN or RQ IOM for the equivalent tonnage.
- Parts ordering: Order directly from AAON (1-918-583-2266) or through local AAON rep — AAON controls boards and compressors are not stocked at most distributors; lead times 3–10 days typical.
`

export const TRANE_RAUC_KNOWLEDGE = `
# Trane RAUC / RAUCC Split-System Air-Cooled Condensing Units

![Trane Technologies logo](https://upload.wikimedia.org/wikipedia/commons/9/9b/TraneTechnologieslogo.svg)

The Trane RAUC and RAUCC series are **commercial air-cooled condensing units** used in split-system configurations. Unlike packaged RTUs, these units contain only the compressor(s) and condenser coil — they mount outdoors and connect to a separate indoor evaporator coil or air handler. Common in supermarkets, big-box retail, and light-industrial applications.

**Specific model RAUCC405BX03:**
- R = Remote (split system condensing unit)
- A = Air-cooled
- U = Unit cooler / commercial
- C = Commercial grade
- C = Scroll compressors (second C distinguishes from reciprocating-compressor RAUC)
- 40 = 40 nominal tons
- 5 = Design series 5
- BX03 = Factory option codes and minor revision

### Model Series Overview

| Series | Compressor Type | Tonnage Range | Notes |
|--------|----------------|---------------|-------|
| RAUC   | Reciprocating  | 20–60 ton     | Older/legacy; R-22 or R-407C |
| RAUCC  | Scroll         | 20–60 ton     | R-22 or R-410A; most common in field |
| RAUJ   | Scroll         | 20–120 ton    | Current production; R-410A or R-513A |

**RAUCC40 (40 ton) refrigerant circuits:**
- Two independent refrigerant circuits (circuit A and circuit B), each ~20 tons
- Compressors: typically two Copeland Discus or scroll compressors per circuit (four compressors total on 40-ton unit)
- Each circuit has its own TXV, filter-drier, sight glass, service valves, and pressure controls

### Refrigerant & Charging

**R-410A units (RAUCC — series 5 and later):**
- Circuit A and Circuit B charged independently
- Subcooling method at liquid service valve:
  - Target: 10–15°F subcooling
  - Measure liquid line temperature at service valve and compare to saturation temperature at measured liquid pressure
- Suction superheat at suction service valve: 8–12°F
- Low ambient charging: at ambients below 65°F, head pressure will be low — use subcooling only, not superheat
- Sight glass: clear with no bubbles at steady-state = correct charge or overcharge; bubbles = low refrigerant or restriction

**R-22 units (older RAUCC, RAUC):**
- Same superheat/subcooling method applies
- Do NOT top off R-22 with R-410A or blended refrigerants without full system retrofit
- Polyol ester (POE) oil required if converting from mineral oil to R-410A — full flush required

### Compressor Service

**Scroll compressor (RAUCC):**
- Minimum off time: 5 minutes before restart (allow crankcase equalisation)
- Rotation check on new installation: briefly energise — correct rotation = rapid pressure differential buildup; reverse rotation = little to no pressure differential, loud rattling
- Copeland scroll: crankcase heater standard — heater must be energised 8 hours minimum before start after extended off period
- Oil level: visible in sight glass at bottom of compressor; add Copeland Ultra 32-3MAF POE if low
- Scroll compressor failure indication: suction and discharge pressures equalise rapidly, compressor draws high amps briefly then trips on internal overload

**Tandem compressors (circuit A or B on 40-ton):**
- Two compressors piped in parallel on one suction/discharge manifold
- If one compressor fails, the circuit loses ~50% capacity and may still operate on remaining compressor
- Tandem equalisation line: must be level and unobstructed — oil migration causes failure of lead compressor

### Controls — ReliaTel (RTOM/RTRM)

Older RAUCC units use Trane's ReliaTel control module (same platform as Precedent RTUs). Newer RAUJ uses Tracer controls or optional DDC.

**ReliaTel on RAUCC:**
- RTOM (ReliaTel Options Module) handles compressor staging and alarms
- LED flash codes at RTOM board — same 11-code DIP table as Precedent series:
  - 2 flashes: Low refrigerant charge lockout
  - 3 flashes: Low ambient lockout
  - 4 flashes: High pressure lockout (manual reset)
  - 5 flashes: Low pressure lockout (auto reset after 3 → manual)
  - 7 flashes: Compressor overload
  - 11 flashes: High discharge temperature
- Jumper JP6 on RTOM enables/disables low ambient lockout (factory default enabled at 25°F)

**Tracer BACnet / DDC option (RAUJ and newer RAUCC):**
- BACnet MS/TP standard; BACnet IP via optional gateway
- DDC controller (SS-SVX007A) replaces RTOM for building automation integration
- All compressor staging, alarms, and setpoints accessible via Tracer TU software

### Condenser Fan System

- Propeller fans, belt-drive or direct-drive depending on model
- Fan cycling: multiple fans with pressure-actuated cycling for low-ambient head pressure control
- Fan sequencing: fans cycle in/out based on head pressure — verify all fans are operational before diagnosing head pressure faults
- Common fan issues: motor failure (check amps vs. nameplate), blade pitch incorrect (RAUCC uses fixed pitch — verify blade angle if fans were removed)
- RAUCC40 typical condenser fan count: 4–6 fans depending on configuration

**Head pressure control:**
- High head pressure fault (4 flash): check all fans operational, check condenser coil for fouling, check ambient temp vs. design limits (unit rated to 115°F ambient max)
- Low head pressure in cold weather: normal — fans will cycle off to maintain minimum head pressure; LP fault in cold weather is usually not a charge issue

### Condenser Coil Maintenance

- Clean at minimum annually — coil fouling is the leading cause of high head pressure and compressor failure
- Cleaning: apply Coil Safe or Nu-Brite with low-pressure spray (20–30 PSI max on aluminium fin) — flush from air side out (inside-out direction)
- Fin damage: bent fins reduce airflow — use fin comb to straighten; replace coil section if damage is severe
- Coil replacement: RAUCC40 uses factory-specific coil geometry — order via Trane part number from nameplate; aftermarket coils available from Emergent Coils, Colmac

### Common Field Issues — RAUCC

| Symptom | Likely Cause | Check |
|---------|-------------|-------|
| High head pressure | Dirty condenser coil, fan not running, overcharge | Clean coil, verify all fans, check subcooling |
| Low suction both circuits | Low refrigerant charge | Check subcooling/superheat each circuit independently |
| Low suction one circuit only | TXV restriction, suction filter-drier plugged, low charge circuit B | Check each circuit's filter-drier delta-T |
| Compressor short-cycling | Low pressure lockout, high pressure lockout, low ambient | Read RTOM flash codes, check LP/HP setpoints |
| Liquid slugging on startup | Liquid migration during off cycle | Verify crankcase heater operational 8+ hours before start |
| Tandem oil migration | Oil equalisation line blocked/pitched wrong | Verify equalisation line is level, remove any traps |
`

export const TEMPRITE_KNOWLEDGE = `
# Temprite Oil Management Products — Supermarket Rack Reference

Temprite (Schaumburg, IL) manufactures oil separators, oil reservoirs, oil level controls, and related refrigeration accessories. On a supermarket rack, Temprite products are the primary line of defence against oil migration — oil that leaves the compressor crankcase in the discharge gas and does not return causes compressor failure and oil-logged evaporators.

## Why Oil Management Matters on Racks

Compressor discharge gas carries oil droplets and aerosol. In a supermarket rack with long pipe runs and multiple evaporators, oil can:
- Accumulate in evaporator coils → reduces heat transfer, eventually causes liquid slugging on defrost
- Deplete compressor crankcases → loss of lubrication, bearing failure
- Collect in suction accumulators and liquid receivers → intermittent slugging

Temprite oil separators intercept oil at the discharge of each compressor (or on a common discharge header) and return it to the crankcase or an oil reservoir before it can migrate into the system.

## Product Families — Supermarket Rack Applications

### 500 Series — Conventional (Impingement Screen) Oil Separators

The most widely installed Temprite separator on North American supermarket racks.

**How it works:** Discharge gas enters the separator shell, velocity drops, larger oil droplets fall to the sump by gravity/impingement against a screen. A float valve opens and returns collected oil to the compressor crankcase when the oil level rises above the float.

**Models (common supermarket sizes):**
| Model | Connection Size | Typical Rack Use |
|-------|----------------|-----------------|
| 504   | 1/2" ODS       | Single small compressor (< 5 HP) |
| 507   | 3/4" ODS       | 5–10 HP compressor |
| 510   | 1" ODS / 1-1/8" ODS | 10–20 HP, medium rack |
| 514   | 1-1/8" / 1-3/8" ODS | 15–30 HP |
| 520   | 1-3/8" / 1-5/8" ODS | 25–50 HP, common on medium rack |
| 528   | 1-5/8" / 2-1/8" ODS | 50–75 HP, large rack compressor |

**Installation:**
- Mount vertically, upright (oil sump at bottom) — do NOT install sideways or inverted
- Install in the hot gas discharge line between compressor discharge service valve and condenser header
- Insulate discharge connection above separator to prevent condensation on shell
- Oil return line (small copper tube) runs from the separator float valve connection back to the compressor crankcase equaliser fitting — typically 1/4" ODS
- Minimum oil return line pitch: 1/4" per foot downward toward compressor

**Float valve check:**
- If compressor oil level is low but separator is full: float valve is stuck closed or plugged — remove and clean with solvent, replace if damaged
- Float valve opens at approximately 1/4" oil depth in sump
- Replace float/needle assembly every 5 years on high-run compressors

### 900 Series — Hermetic Coalescent Oil Separators

High-efficiency coalescent separators used on modern racks and retrofits. Capture oil aerosol that impingement separators miss (submicron droplets).

**How it works:** Discharge gas passes through a coalescing filter element (fibreglass media). Sub-micron oil aerosol collects on the fibres, coalesces into larger drops, and drains to the sump. Efficiency > 99.9% vs. ~80–90% for conventional separators.

**Common supermarket models:**
| Model | Connection | Notes |
|-------|-----------|-------|
| 900   | 3/4" ODS  | Small compressors, medium-temp |
| 902   | 7/8" / 1-1/8" ODS | Most common rack size |
| 903   | 1-3/8" ODS | Medium-large compressors |
| 904   | 1-5/8" ODS | Large compressors, low-temp rack |
| 920   | 1-1/8" ODS | Horizontal-inlet variant |
| 920R  | Rotalock  | Refrigeration rack screw-compressor use |

**When to specify coalescent over conventional:**
- R-410A systems (lower oil viscosity at operating pressures — conventional separators less effective)
- R-744 (CO2) systems — conventional separators ineffective at transcritical pressures
- Parallel rack with long evaporator circuits (> 100 ft equivalent)
- After compressor rebuild where residual metallic contamination risk is elevated

**Coalescing element replacement:**
- Temprite recommends element replacement every 2 years or when pressure drop across separator exceeds 3 PSI at rated flow
- Field indicator: higher than normal compressor head pressure with clean condenser coil and correct refrigerant charge → check separator pressure drop
- Replacement elements available as kits (900-series kit number matches model)

### 300 Series — Coalescent (Open-Top/Serviceable)

Similar coalescent technology to 900 series but with a removable top cap for element servicing without removing the separator from the line.

- Common sizes: 300, 302, 303, 304
- Used in retrofit situations where line access is limited
- Element replacement interval: same as 900 series

### 600 Series — Conventional (Larger Commercial)

Larger conventional separators for high-tonnage racks (> 75 HP per circuit):
- Models 604, 606, 610, 614
- Same float valve and oil return as 500 series
- Used on large parallel rack compressor banks

## Oil Reservoirs

On large parallel racks with multiple compressors, Temprite oil reservoirs centralise oil collection rather than returning oil individually from each separator.

**Function:** Multiple separator oil returns feed into a single reservoir. An oil level control (mechanical float or electronic) on each compressor crankcase then draws oil from the reservoir as needed.

**Common Temprite reservoir models:**
- 47058 (small rack, 4 compressors)
- 47080 (medium rack, 5–6 compressors)
- 47115 (large rack, 6–8 compressors)
- 47154 (extra-large / dual-rack)

**Installation checklist:**
- Mount reservoir below the compressors and below the oil separator sump outlets
- Oil supply lines from reservoir to compressors: 3/8" ODS, pitched continuously downward from reservoir to crankcase equaliser
- No traps in oil supply lines — oil is gravity-fed, traps cause oil starvation
- Sight glass on reservoir: level should be visible mid-glass at steady state; empty glass = separator or float valve issue, full glass overflowing = excessive oil in system

## Oil Level Controls

### Mechanical (Float-Valve Type)
- Temprite mechanical oil level controls mount on the compressor crankcase equaliser fitting
- Float maintains oil at a constant level: when oil drops, float drops, valve opens, oil flows from reservoir
- Service: clean strainer screen annually; replace entire float assembly if compressor repeatedly runs low on oil with reservoir full

### TraxOil Electronic Oil Level Control
- Electronic sensor replaces mechanical float — no moving parts, more reliable in contaminated oil
- LED indicator on unit: green = oil level OK, red flashing = low oil, red steady = fault/sensor error
- Wires to compressor safety control circuit: trips compressor on low oil condition (adjustable delay: 30 seconds default)
- Calibration: TraxOil self-calibrates on first startup — do not power it during compressor off cycle calibration period (30 seconds after energising)
- Common issue: sensor contaminated with black sludge (acid burnout residue) — clean with solvent and dry before recalibrating

## Common Rack Oil Management Troubleshooting

| Symptom | Likely Cause | Action |
|---------|-------------|--------|
| Compressor(s) low on oil, separator full | Float valve stuck closed | Remove, clean or replace float/needle |
| Compressor(s) low on oil, separator empty | Separator float valve open but reservoir empty; or no oil returning from circuit | Check separator inlet — possible bypass (hole in screen) |
| Oil in evaporators (oil logging) | Separator efficiency low, or separator bypass | Check separator pressure drop; replace coalescent element or 500-series screen |
| Reservoir overflowing | System oil charge is excessive | Remove oil from system; verify original factory charge |
| Black sludge in oil reservoir | Acid burnout contamination | Flush system, replace driers, change oil charge; clean TraxOil sensor |
| High separator pressure drop (>3 PSI) | Coalescent element saturated | Replace element |
| Compressor oil foaming on startup | Refrigerant migration into oil during off-cycle | Verify crankcase heaters on; consider crankcase heater upgrade |

## Sizing Quick Reference

Temprite sizing is based on refrigerant type and system capacity (tons or kW). Always use Temprite's online sizing tool or printed chart for final selection.

**General guideline (500 series, R-404A / R-448A):**
- Up to 10 tons per compressor: Model 507–510
- 10–20 tons: Model 510–514
- 20–35 tons: Model 520
- 35–60 tons: Model 528

**For R-410A or CO2:** Move up one model size from the above table, or specify 900/300-series coalescent.

## Refrigerant Compatibility Notes

- All current Temprite separators rated for HFCs (R-404A, R-448A, R-449A, R-134a, R-410A) and natural refrigerants (R-744/CO2, R-290/propane)
- POE oil compatible with all current Temprite internal components
- Mineral oil: acceptable in 500/600 series; NOT recommended in 900/300 series coalescent (clogs element media faster)
- Alkylbenzene (AB) oil: compatible
`

export const DIXELL_KNOWLEDGE = `
# Dixell Controllers — Supermarket Refrigeration Reference

## Overview
Dixell (a Schneider Electric brand) manufactures electronic controllers widely used in supermarket display cases, walk-in coolers/freezers, and condensing units. Three main families appear in field service:
- **XR series** — single- and dual-probe temperature controllers; most common on reach-in cases and condensing units
- **XC series** — advanced case controllers with multi-probe inputs, EEV support, and Modbus/RS-485
- **XW series** — rack-level and system controllers for condensing units and small systems

### XR Series — Common Models

| Model | Probes | Relays | Key Use |
|-------|--------|--------|---------|
| XR02CX | 1 | 1 comp | Simple temp control, no defrost relay |
| XR20C | 1 (+ alarm) | 2 | Basic reach-in; alarm relay for door/temp |
| XR30C | 2 (air + evap) | 3 | Display case; defrost termination by evap temp |
| XR40C | 4 | 3 | Full case control; separate fan, defrost, comp relays |
| XR60C | 2 | 4 | Enhanced alarm + anti-condensate heater relay |
| XR70C | 2 (+ optional) | 3 | Condensing unit control; pressure input capable |

### XC Series — Advanced Case Controllers

| Model | Description |
|-------|-------------|
| XC440C | Plug-in refrigeration controller; reach-in and self-contained |
| XC460H | Self-contained heated/cooled cabinets |
| XC560D | Display case with EEV driver; Modbus RS-485 |
| XC660C | Full case control; glass heat, door switch, lighting relay |
| XC1008D | Multi-circuit; controls up to 8 cases from one controller |

### Parameter Navigation

**Entering programming mode (most XR/XC models):**
- Hold **SET** for 5 seconds → enters first parameter
- Or simultaneously press **SET + UP** for 5 seconds
- Some models: hold **SET + DOWN** to enter protected parameters (Pr2 set)

**Navigating:**
- **UP / DOWN** — scroll through parameter values
- **SET** — confirm and advance to next parameter
- **DEF** button (if present) — manually trigger defrost cycle
- Display returns to normal after ~30 seconds of inactivity

### Key Parameters (XR Series)

| Code | Description | Typical Range |
|------|-------------|---------------|
| St | Temperature setpoint | −40 to +50°C |
| LS | Minimum setpoint limit | −50°C |
| US | Maximum setpoint limit | +50°C |
| Hy | Compressor differential (hysteresis) | 0.5–10°C |
| OdS | Setpoint offset (display correction) | ±20°C |
| AC | Anti-sweat heater ON above cabinet temp | −20 to +15°C |
| rES | Resolution (0 = 1°, 1 = 0.1°) | 0 or 1 |
| Con | Compressor restart delay on power-up | 0–15 min |
| COn | Minimum compressor ON time | 0–15 min |
| COF | Minimum compressor OFF time | 0–15 min |
| dFt | Defrost type: 0=EL (electric), 1=hot gas, 2=natural off-cycle | 0, 1, or 2 |
| dI | Defrost interval (hours between defrosts) | 1–24 h |
| dt | Maximum defrost duration | 1–99 min |
| d8 | Defrost end temperature (evap probe terminates defrost) | −30 to +40°C |
| dd | Drain/drip time after defrost ends (fans off, heaters off) | 0–15 min |
| Fdt | Fan delay after defrost (fans hold off until cabinet recovers) | 0–30 min |
| FAd | Fan differential — fans cut off when evap temp drops below setpoint by this amount | 0–10°C |
| AH | High temp alarm offset above setpoint | 1–20°C |
| AL | Low temp alarm offset below setpoint | 1–20°C |
| Ad | Alarm delay after startup or door open | 0–240 min |
| PbC | Probe type: 0=NTC, 1=PT100, 2=PT1000 | 0, 1, or 2 |

### Alarm and Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| E1 | Probe 1 (cabinet air) fault — open or short | Check probe connector, measure resistance (NTC: 10kΩ at 25°C; PT1000: ~1000Ω at 0°C) |
| E2 | Probe 2 (evaporator) fault | Same as E1; check for moisture/ice on probe tip |
| E3 | Probe 3 fault (model-dependent) | Probe 3 wiring or sensor |
| E4 | Probe 4 fault (model-dependent) | Probe 4 wiring or sensor |
| HA | High temperature alarm | Cabinet temp exceeded setpoint + AH for longer than Ad delay |
| LA | Low temperature alarm | Cabinet temp below setpoint − AL for longer than Ad delay |
| dEF | Defrost in progress (status, not fault) | Normal; shows until defrost terminates |
| drd | Drain time active after defrost (status) | Normal; fans off during this period |
| oFF | Controller output disabled | Check if manually disabled; verify On/Off input wiring |
| Err | Parameter checksum error | Reset to factory defaults; re-program |
| EEr | EEPROM write error | Power cycle; if persists, replace controller |

**Probe resistance quick check (NTC 10kΩ type):**
- −20°C ≈ 97kΩ
- 0°C ≈ 32kΩ
- 10°C ≈ 20kΩ
- 25°C ≈ 10kΩ
- 40°C ≈ 5.7kΩ
Infinite resistance = open (wiring break or probe failed open). Near-zero = short (probe shorted or wrong probe type).

**PT1000 probe:**
- 0°C = 1000Ω, increases ~3.85Ω per °C. At −20°C ≈ 923Ω; at 20°C ≈ 1078Ω.

### Defrost Configuration

**Electric defrost (dFt = 0):**
- Compressor off, electric heater relay ON
- Terminates when evap probe (Pb2) reaches d8 temperature OR dt time expires (whichever first)
- Drain time dd runs after termination; then Fdt fan delay before fans restart
- If Pb2 (evap probe) is failed/absent, defrost runs full dt minutes — common cause of over-defrost flooding

**Hot gas defrost (dFt = 1):**
- Compressor stays ON, hot gas solenoid opens (via defrost relay)
- Evap probe (Pb2) terminates defrost at d8 temp
- Typical d8 for hot gas: +15 to +25°C on evap
- After termination: dd drain time, Fdt fan delay — fans must wait for evap to cool below case setpoint or frost re-forms

**Natural/off-cycle defrost (dFt = 2):**
- Compressor off, no heaters — case ambient melts frost
- Only suitable for MT (medium temp) cases, typically ≥0°C setpoint
- d8 and dt still apply as safety limits

### Manual Defrost
Press **DEF** button (if equipped) to start a defrost cycle immediately.
On models without a DEF button: enter parameters and toggle a manual-start parameter (typically \`Mn\` or \`MdF\` = 1).

### Communication (RS-485 / Modbus)
- Most XC series and XR60C/XR70C support RS-485 Modbus RTU
- Default baud rate: **9600 bps**, 8-N-1
- Address set via \`Add\` parameter (1–247)
- Wired daisy-chain: A+ to A+, B− to B−, common ground; terminate last device with 120Ω resistor
- Controllers appear as Modbus slave nodes on Xweb500 / third-party BMS

### Wiring Notes

**Probe inputs (2-wire NTC or PT1000):**
- Polarity-insensitive; any order on terminals
- Maximum cable run: ~50 m for NTC; ~100 m for PT1000 (lower impedance)
- Use shielded cable near VFDs or neon lighting; float shield at controller end

**Relay outputs:**
- All relays are volt-free contacts (SPDT or SPST — check data sheet)
- Controller does NOT supply load voltage; wire external 240V or 24V circuits through the contacts
- Relay ratings typically 8A resistive, 2A inductive — do not switch large fan/heater loads directly without contactors

**Power supply:**
- Most XR series: 115/230 VAC ±10%, 50/60 Hz
- Some XC series: 24 VAC/DC option — verify label before wiring

### Firmware / Reset Procedures

**Factory reset (most models):**
1. Enter programming mode (hold SET 5 sec)
2. Navigate to parameter \`rE\` or \`rES\` (model-dependent)
3. Set to 1 (or press SET to confirm)
4. Controller reloads factory defaults — all setpoints and defrost programming reset

**If display shows garbage or locked up:**
- Power cycle with 5-minute wait (capacitors discharge)
- Check supply voltage; Dixell controllers are sensitive to voltage brownouts and spikes
- A suppressor (MOV) across the supply is recommended on noisy circuits

### Troubleshooting Table

| Symptom | Likely Cause | Check |
|---------|-------------|-------|
| E1/E2 alarm, display shows dashes | Probe open or disconnected | Disconnect probe, measure resistance at controller terminals |
| HA alarm, product warm, compressor OFF | Compressor relay welded OFF, or Con/COF lockout | Check relay output with DMM; shorten Con/COF; check for manual oFF |
| HA alarm, compressor running | Insufficient cooling — not a controller fault | Check refrigerant, TXV/EEV, condenser, fan motors |
| Defrost never terminates — full dt runs each time | Evap probe (E2) failed or unconnected | Measure Pb2 resistance; confirm probe is mounted on evap coil, not air stream |
| Case over-defrosts, floods after every defrost | d8 set too high (evap never reaches it) or dt too long | Lower dt; verify Pb2 location; lower d8 to +18°C for medium-temp |
| Fans not running after defrost | Fdt delay still active, or fan relay failed | Wait Fdt minutes; if fans still off, check fan relay with DMM |
| Controller shows correct temp but product freezes | Setpoint offset OdS incorrect; probe mounted in air stream, not product level | Check OdS; reposition probe away from evap discharge |
| No display | No power or blown internal fuse | Check voltage at terminals; check internal fuse (if accessible) |
| Relay chattering (rapid ON/OFF) | Hysteresis Hy set too low | Increase Hy to at least 1°C to prevent short-cycling |
`

export const KYSOR_WARREN_KNOWLEDGE = `
# Kysor Warren Display Cases — Supermarket Refrigeration Reference

![Supermarket refrigerated display cases](https://upload.wikimedia.org/wikipedia/commons/a/af/Cold_Storage_Cabinets.jpg "Supermarket refrigerated display cases — Kysor Warren EcoFlex and C-Series cases are installed in configurations like this")

## Overview
Kysor Warren is a major supermarket display case manufacturer, now a brand under Daikin Applied. Cases are found in stores across North America under the Kysor Warren name and occasionally under earlier GE Commercial Food Service branding. Product lines span medium-temperature (MT) and low-temperature (LT) applications: open multi-deck merchandisers, coffin/island cases, reach-in glass-door cases, and service counter cases.

### Product Line Summary

| Series | Type | Temp Class | Typical Application |
|--------|------|-----------|---------------------|
| EcoFlex multi-deck | Open multi-deck | MT | Produce, dairy, deli, beverages |
| C-Series coffin / island | Low-profile island | LT / MT | Frozen foods, ice cream |
| G-Series / Vision | Glass door reach-in | MT or LT | Beverages, frozen meals |
| EcoShine LED | Retrofit LED lighting | — | Energy upgrade for older cases |
| Service/Specialty | Service counter | MT | Meat, deli, seafood, bakery |

**Typical operating setpoints:**
- MT multi-deck (produce, dairy): 34–38°F (1–3°C) discharge air
- MT service case (meat, deli): 34–38°F
- LT coffin / island (frozen): −10 to 0°F (−23 to −18°C)
- LT reach-in glass door (frozen): −10 to 0°F
- Beverage reach-in (MT): 34–40°F

## Fan Motors

**Older cases — shaded-pole motors:**
- Common sizes: 1/15 HP, 1/20 HP, 1/30 HP
- Wiring: 2-wire, line voltage (115V or 208/230V)
- High failure rate; replace like-for-like — match HP, RPM, frame, and voltage
- Shaded-pole motors run hot by design; check for adequate clearance and no coil ice blocking airflow

**Newer EcoFlex / energy-upgrade cases — EC (electronically commutated) motors:**
- 3-wire (or 4-wire): L, N, and a control wire (0–10V DC signal or switched 24V)
- Speed controlled by case controller or store controller (Emerson E2/E3 fan output)
- Common fault: no control signal → motor runs at default speed or stops; verify control wire voltage
- EC motor replacement: match manufacturer, frame, and control input type (0–10V vs. PWM vs. on/off)
- EC motors are polarity-sensitive on the DC control wire — reversed control wire = no speed control

**Fan cycling:**
- Most MT cases: fans run continuously (except defrost)
- LT cases: fans typically off during electric defrost; delay 3–10 min after defrost before restart
- Evaporator fan delay relay or controller parameter (Fdt on Dixell) prevents blowing warm air into case after defrost

### Anti-Condensate (Anti-Sweat) Heaters

Heaters prevent moisture condensing on glass doors, mullions (stiles), and case rails in humid store environments.

**Types present on Kysor Warren cases:**
- **Glass door edge heaters** — embedded in door frame; 24V or 120V; run continuously or switched
- **Mullion / stile heaters** — vertical frame heaters between doors; 120V or 240V resistance wire
- **Top rail heaters** — prevent dripping from case top
- **Bottom rail / front rail heaters** — prevent moisture pooling

**Control:**
- Simple on/off via store humidity switch or timer (older stores)
- Modern cases: anti-sweat controller (Paragon, Intermatic timer, or store controller ASH output)
- Dixell XR60C/XC series: \`AC\` parameter — heaters switch on when cabinet air exceeds AC setpoint (high humidity condition)
- Energy-saving mode: cycle heaters on timed intervals rather than continuous — reduces energy 40–60%

**Troubleshooting heater faults:**
- Sweating glass/mullions: heater open-circuited or not powered; measure resistance and verify supply voltage
- Heater wire resistance (typical): 50–200Ω per heater element depending on wattage
- Open heater: infinite resistance → replace element or door assembly
- Tripped breaker on heater circuit: check for moisture in wire connections; individual heaters shorted

### Defrost Systems

**MT cases (multi-deck, service):**
- Most run off-cycle (natural) defrost — compressor cycles, fan continues, frost melts at ambient
- Some high-humidity applications: electric defrost 1–2× per day
- Drain temperature termination common: defrost ends when drain pan temp reaches 45–55°F

**LT cases (coffin, reach-in):**
- Electric defrost standard; 2–4 defrosts per day typical
- Heaters on evaporator coil + drain pan heater
- Termination: evap coil probe at +50 to +60°F (10–15°C), or time backup
- Drain pan heater: 30–60W; runs during defrost and drip time; check for continuity if case floods from incomplete defrost

**Drain system:**
- Gravity drain to floor drain or drain trough
- Heat tape on drain line (especially LT): verify continuity; failed heat tape → ice blockage → flooding
- Drain pan slope: should pitch toward drain outlet; improperly installed cases can pool water and leak to floor
- Condensate evaporator tray (some MT cases): small tray under evaporator evaporates water passively — clean periodically to prevent mold/odor

### Case Controllers

Kysor Warren cases use a range of controllers depending on model year and configuration:

**Dixell XR series** (most common on stand-alone and small cases):
- XR30C, XR40C — most prevalent; see Dixell knowledge section for full parameter reference
- Probe 1 (Pb1): cabinet air temperature
- Probe 2 (Pb2): evaporator coil temperature (defrost termination)

**Dixell XC series** (newer multi-case and glass-door lines):
- XC440C, XC560D — glass-door cases with EEV capability
- RS-485 Modbus for connection to store controller

**Emerson CC-100 / CCB** (older store-controller-integrated cases):
- Case controllers networked to Emerson E2/E3 via LonWorks
- No standalone setpoint display — all programming through E2 store controller

**Proprietary Kysor Warren controller** (some models):
- Simple 7-segment display, limited external programming
- Factory-set defrosts; contact Daikin/Kysor Warren tech support for parameter access

### Refrigerant Connections

**Liquid line connection:**
- Located at back of case (most models) or bottom-rear access panel
- Ball valve or hand valve at case inlet — ensure open before startup
- Filter-drier at case inlet: replace after any burnout or when moisture indicator shows wet

**Suction line connection:**
- Insulated suction line back to rack; verify insulation is intact and not saturated (ice inside insulation = moisture problem)
- Suction line should pitch slightly toward rack for oil return

**Distributor and TXV/EEV:**
- Most cases use a distributor nozzle + TXV (Sporlan or Danfoss)
- TXV sensing bulb clamped to suction outlet of evaporator coil; ensure good contact and insulated
- EEV cases (newer): Dixell XC560D controller drives stepper motor valve

### Common Faults and Diagnosis

| Symptom | Likely Cause | Check |
|---------|-------------|-------|
| Case warm, fans running, no defrost active | Liquid feed issue — TXV, solenoid, or refrigerant shortage | Check suction superheat at case; inspect TXV bulb contact; verify solenoid opens |
| Ice build-up front of evap, not melting | Defrost not running or terminating early | Verify defrost schedule; check Pb2 probe — if failed open, defrost terminates instantly |
| Case floods after defrost (water on floor) | Drain blocked or drain heater failed | Clear drain; check drain heat tape continuity; verify drain pitch |
| Sweating/condensation on glass or mullions | Anti-sweat heaters off or failed | Check heater circuit voltage and resistance; verify controller ASH output |
| Fan not running (shaded pole) | Motor burned out or capacitor failed (if 3-phase PSC) | Measure winding resistance; check for locked rotor (ice on blade) |
| EC fan not running | No control signal | Measure 0–10V control wire; verify controller fan output setting |
| Case cycles on high temp alarm | Low refrigerant, solenoid stuck closed, TXV hunting | Log suction superheat; check for TXV hunting (fluctuating superheat ±10°F) |
| Ice at back of case, warm at front | Poor airflow pattern — coil iced unevenly | Check fan blades for ice or obstruction; confirm all fans running; check defrost completeness |
| Compressor short-cycling on rack | Case solenoid valve chattering or TXV hunting causing suction pressure swings | Inspect solenoid coil; check TXV superheat stability |
| Noisy fan (rattling) | Ice on fan blade, failed bearing, blade rubbing shroud | Inspect during run; case may need early defrost to clear ice |

### Energy and Maintenance Notes

- **Night covers / anti-condensate curtains**: Roll-down or rigid covers reduce refrigeration load 25–40% overnight. Check track condition; torn or missing covers significantly increase energy use and morning pull-down time
- **LED lighting**: Newer EcoShine LED retrofits run cooler than fluorescent T8/T12 — reduces heat load in case. Ballast removal required for direct-wire LED; confirm wiring type before replacement
- **Evaporator cleaning**: Annual coil cleaning with approved coil cleaner. Rinse thoroughly — chemical residue causes copper corrosion. Never use wire brushes on aluminium fins
- **Gasket inspection**: Door gaskets on glass-door cases degrade and allow warm humid air infiltration. Replace when cracked or when a dollar bill slides out without resistance from the closed door
- **Case levelling**: Cases must be level side-to-side; front-to-back slight tilt toward drain. Out-of-level cases cause uneven defrost melt-off and floor flooding
`

export const HEAT_RECLAIM_KNOWLEDGE = `
# Heat Reclaim Systems — Supermarket Refrigeration Reference

![Shell-and-tube heat exchanger](https://upload.wikimedia.org/wikipedia/commons/c/cc/Shell_heat_exchanger_LS.JPG "Shell-and-tube heat exchanger — used as desuperheater and heat reclaim coil in supermarket refrigeration systems")

## Overview
Heat reclaim captures the heat normally rejected by the refrigeration system's condenser and redirects it for useful purposes — most commonly space heating and domestic hot water. A typical supermarket rack system rejects 150–300 kW of heat to atmosphere; heat reclaim can recover 30–80% of that, dramatically reducing gas/electric heating costs in colder climates.

**Heat available from common rack configurations:**
- MT rack (3–6 compressors, R-448A): ~15–25 kW per compressor at design conditions
- LT booster rack: ~8–15 kW per compressor
- CO₂ transcritical booster (full store): 80–200 kW total rejection at peak

## Types of Heat Reclaim

### 1. Desuperheater (most common)
A heat exchanger placed in the discharge line **before** the condenser. Hot discharge gas passes through the exchanger and heats water (or glycol), then continues to the condenser.

- Captures the **superheat** portion of discharge gas — typically 20–50°F of cooling before condensing begins
- Discharge gas enters at 200–280°F (HFC systems) or 180–260°F (CO₂); leaves desuperheater at 120–160°F and continues to condenser
- Water outlet temp achievable: 120–160°F for domestic hot water or floor heating
- Heat exchanger types: **brazed plate (BPHE)** most common (Alfa Laval, SWEP, Danfoss); tube-in-tube for higher pressure CO₂ applications

**Key point:** The desuperheater does NOT replace the condenser — the refrigerant must still condense normally downstream. The desuperheater only captures superheat energy.

### 2. Heat Reclaim Condenser (total / partial heat reclaim)
A dedicated refrigerant-to-air coil installed in the store's HVAC air handler. Discharge gas is **diverted** to this coil first; the refrigerant condenses inside the store coil, rejecting heat into the store air stream.

- More heat available than desuperheater alone (full latent heat of condensation)
- Requires a **condensing pressure control valve** (CPC / head pressure hold-back valve) — the reclaim coil may be too small to condense all gas alone, so the condenser acts as backup
- When reclaim coil satisfies the store heating thermostat, a 3-way valve or solenoid redirects gas back to the outdoor condenser
- If outdoor condenser is fully bypassed in cold weather, ensure minimum head pressure is maintained (typically ≥ 120 psig on R-448A systems)

### 3. Liquid Line Subcooler (heat reclaim via subcooling)
A water-cooled or glycol-cooled heat exchanger in the rack liquid line. Subcools liquid refrigerant before it reaches the expansion valves, improving system capacity and COP.

- Subcooling gain: every 1°F of subcooling adds ~0.5% capacity on R-448A
- Typical subcooler target: 10–20°F of subcooling above normal condenser subcooling
- Water or glycol loop connects to heat dump (cooling tower, boiler pre-heat, domestic hot water pre-heat)
- Often run year-round for efficiency; heat dump to domestic hot water pre-heat makes economic sense even in summer

### 4. CO₂ Heat Reclaim (Transcritical Systems)
CO₂ transcritical systems are especially well-suited to heat reclaim due to high discharge temperatures and the gliding temperature characteristic in the gas cooler.

- Discharge gas exits CO₂ compressor at 180–280°F (82–138°C) at transcritical pressure (1,100–1,600 psi / 75–110 bar)
- Gas cooler can be configured as a heat reclaim coil — water or glycol heated to 50–60°C (122–140°F) for floor heating, domestic hot water, or snow-melt circuits
- **Wet heat reclaim** (common in Hussmann, Carnot, Advansor systems): dedicated water-cooled gas cooler operates in heat reclaim mode; automatic bypass to dry air-cooled gas cooler when heat not needed
- Heat reclaim improves CO₂ system COP by reducing gas cooler outlet temperature → higher gas cooler efficiency

## Key System Components

### Discharge Line Diverting / Heat Reclaim Solenoid Valve
- Normally-closed solenoid opens to allow discharge gas to flow to the reclaim circuit
- Sized for full discharge mass flow rate at maximum operating conditions
- **Failure mode (stuck open):** reclaim circuit absorbs heat in summer when store doesn't need it → abnormally high condensing temperature → high head pressure alarm
- **Failure mode (stuck closed):** heat reclaim never activates → heating bills not reduced; no other refrigeration symptom

### Head Pressure Hold-Back / Condensing Pressure Control (CPC)
- Modulating valve (electronic or mechanical) that maintains a minimum condensing pressure on the rack when the outdoor condenser is bypassed or ambient is very cold
- Set to maintain minimum ~120–150 psig (R-448A) or 200–250 psig (R-404A) condensing pressure
- Without it: liquid refrigerant can flood back in cold weather when compressor head pressure collapses
- Brands: Sporlan ORI/OREO series, Danfoss ICS, Emerson Alco

### Desuperheater Heat Exchanger
- Brazed plate HX (BPHE): compact, high efficiency; common sizes 10–80 plates for rack applications
- Refrigerant side: typically 400–800 psi operating pressure; CO₂ service requires special high-pressure rated BPHE (up to 1,450 psi / 100 bar)
- Waterside: 30–150 psi domestic water or glycol loop pressure
- **Maintenance:** waterside fouling is the primary failure — scale deposits from hard water reduce heat transfer. Descale annually with citric acid or commercial descaler (flush and neutralize after)
- Refrigerant-side leak into waterside: loss of refrigerant pressure OR bubbles in hot water system. Isolate and pressure-test each side independently to locate

### 3-Way Diverting Valve (discharge gas diversion)
- Motorized ball valve or globe valve body; directs discharge gas to reclaim circuit, outdoor condenser, or both simultaneously (partial bypass)
- Electronic modulating variants used for continuous capacity control
- Spring-return actuator: fails to outdoor condenser (safe position) on power or actuator failure — verify this on commissioning

### Store Heating Coils (air-side reclaim)
- Finned-tube coils in HVAC air handler; refrigerant condenses inside, heating store air
- Must be rated for refrigerant operating pressure
- Refrigerant trap / drain leg required at bottom for oil return when coil is used intermittently
- Defrost consideration: if store heating coil is de-energised in summer, any residual liquid refrigerant must be able to drain back to the system

## Control Sequences

### Typical Heating Season (winter) — HFC rack:
1. Store thermostat calls for heat → heat reclaim control board (Emerson E2/E3 or Danfoss AK-SM) opens heat reclaim solenoid
2. Discharge gas diverts to store HVAC coil or desuperheater
3. If condensing pressure drops below minimum setpoint → CPC valve modulates to maintain pressure
4. When store heating satisfied (thermostat opens) → solenoid closes, gas returns to outdoor condenser

### Desuperheater water control:
- Motorised 3-way water valve bypasses desuperheater when hot water tank is at setpoint (typically 140°F / 60°C)
- Aquastat on tank controls valve; simple on/off or modulating
- Low water flow alarm: differential pressure switch across desuperheater → alert if flow drops (pump failure, valve failed closed, filter blocked)

### CO₂ gas cooler heat reclaim:
- Electronic controller (Emerson E2, Danfoss AK-SM, or OEM Hussmann/Carnot controller) monitors gas cooler water outlet temp and store heat demand
- At low ambient: gas cooler operates fully in reclaim mode (water-cooled); air-cooled gas cooler fans off
- At high ambient or when heat not needed: bypass valve opens, air-cooled gas cooler takes full load
- Dual-mode gas cooler commissioning requires careful setpoint of bypass valve opening pressure (typically HP set-point − 50 psi)

## Common Faults and Diagnosis

| Symptom | Likely Cause | Check |
|---------|-------------|-------|
| High head pressure, heat reclaim active | Reclaim circuit can't reject enough heat; CPC valve not opening | Check store heating coil airflow; verify CPC valve opens under pressure; check solenoid modulation |
| High head pressure, reclaim solenoid stuck open in summer | Solenoid coil failed energised | Measure solenoid coil voltage; de-energise manually; check control wiring |
| No heat reclaim (reclaim never activates) | Solenoid stuck closed, control board output failed, thermostat not calling | Verify control board output voltage; check thermostat setpoint; manual force test solenoid |
| Hot water not reaching setpoint | Desuperheater fouled, low refrigerant flow, water pump issue | Check ΔT across BPHE (water side); descale if ΔT collapsed; verify water flow rate |
| Refrigerant loss, hot water smells like oil | Desuperheater plate cracked — refrigerant leaking to waterside | Isolate; pressure-test refrigerant side with water side open; replace BPHE |
| Low head pressure in cold weather despite reclaim off | CPC valve failed open or set too low | Verify CPC setpoint; measure HP at rack |
| CO₂ system: poor heat reclaim output | Gas cooler bypass valve leaking by | Check valve seat; verify actuator position with controller display |
| Oil logging in reclaim coil | Trap/drain leg absent or blocked | Inspect oil trap at bottom of store heating coil; clear blockage |

## Sizing Reference

**Desuperheater capacity rule of thumb:**
- Superheat entering desuperheater: typically 30–60°F above saturated condensing temp
- For HFC racks: heat available in desuperheater = approximately 10–15% of total system heat rejection
- Example: 200 kW rack rejection → ~20–30 kW recoverable in desuperheater

**Total heat rejection from rack (approximation):**
- Heat rejection ≈ System capacity × (1 + 1/COP)
- At COP 2.0: heat rejection ≈ 1.5 × refrigeration capacity
- A 100 kW refrigeration rack rejects ≈ 150 kW at COP 2.0

**Desuperheater BPHE selection:**
- Refrigerant-side ΔT: typically 40–80°F (discharge → saturated condensing temp)
- Water-side ΔT: typically 20–40°F rise (inlet 80°F, outlet 120–140°F)
- LMTD calculation required for exact plate count; consult Alfa Laval / SWEP selection software
`

const MODE_INSTRUCTIONS: Record<ChatMode, string> = {
  EXPERT: `MODE: Expert Assistant — Coaching a tech through a live service call

You are working a call alongside an apprentice or journeyman the way a senior tech would if you
were standing next to them — NOT writing them a diagnostic report. Default to a short, guided,
back-and-forth. Most replies should be a few sentences: a quick read on what they just told you,
plus ONE next check or question. Then stop and wait for their reply.

When a technician describes a symptom, fault, or alarm:
1. Give a brief (1–2 sentence) read on what the symptom suggests — your working theory so far.
2. Apply the Big Picture First approach to choose what to check next: Airflow → Electrical &
   Power → Refrigerant Flow → system/equipment-specific detail. Pick the single highest-value
   check given what's already known (skip layers already ruled out by what the tech told you).
3. Ask for ONE specific reading, observation, or test — tell them exactly what to look at and,
   where useful, what value would point which direction (e.g. "what's your suction pressure
   reading — if it's pulling down near 0 psi that points to a restriction, if it's holding high
   that points to the compressor not loading").
4. When their answer narrows it down, say so plainly ("OK, that rules out X — sounds like Y"),
   then move to the next check or to the fix. Don't re-explain the whole picture each turn.
5. Once the cause is confirmed (or close enough to act on), give the fix as clear steps and
   what to watch after the repair.

Keep it conversational — short turns, one thing at a time, like a phone call with a mentor.
Avoid front-loading every possible cause or every layer of checks in one message.

FULL WRITE-UP ON REQUEST:
If the technician asks for a summary, write-up, full report, or something to put in a service
log (or after a diagnosis is fully confirmed and they ask "can you summarize that"), THEN provide
the structured format:
## What's Happening
## Big Picture Checks
## Most Likely Cause
## How to Confirm
## Fix
## Watch For After

For other message types:
• General/reference question (no active fault) → answer directly and concisely, cite sources, use numbered steps for procedures. No need for the step-by-step coaching format here.
• Alarm code lookup with no other context → explain the code in plain English and ask what the unit is doing right now before diagnosing further; if the tech gives enough detail already, go straight into the guided checks above.
• Conversation shifts mid-thread → follow naturally, never ask the technician to switch modes.

Ask one focused clarifying question whenever it would change what you tell them to check next —
this is the normal flow of a coached call, not a last resort.`,

  MAINTENANCE: `MODE: Maintenance Assistant
Help the technician with maintenance documentation and planning:
- Structure service log entries from work described
- Provide scheduled maintenance checklists for this equipment type
- Flag overdue maintenance based on equipment age and history
- Help interpret past logs to identify recurring issues
- Draft service report summaries

Reference ASHRAE guidelines and manufacturer recommendations for maintenance intervals.`,

}

const FORMAT_INSTRUCTIONS = `
RESPONSE FORMAT:
- Use clear markdown: headers (##), numbered steps for procedures, bullets for options
- Safety warnings: ⚠️ **Safety:** {warning text}
- When you draw a fact or procedure from a retrieved manual chunk, place [Doc N] at the end of the relevant sentence — for example [Doc 1] or [Doc 3]. Use ONLY the number (e.g. [Doc 2]), never include the title or page in the inline marker. N must match the number in the [Doc N: title] label for that chunk. Only cite sources for content genuinely taken from that chunk — do not add citations to general knowledge statements.
- Keep responses focused and actionable — technicians are on the floor
- Never pad responses with generic disclaimers — if something is safe and routine, just explain it
`

const MANUAL_SEARCH_TOOL_INSTRUCTIONS = `
MANUAL SEARCH TOOL:
You have a \`search_manuals\` tool that searches this company's uploaded equipment manuals and
documentation (install/service manuals, wiring diagrams, parts lists, controller programming
guides). Use it when:
- The technician names a specific manufacturer/model and you need exact specs, part numbers,
  wiring, fault-code tables, or setpoint procedures for that unit
- The selected equipment's retrieved context doesn't cover what's being asked but a manual
  likely would
- You're about to recommend a specific procedure (e.g. controller menu navigation, defrost
  programming steps) where getting it exactly right matters

Don't call it for general conceptual questions your built-in knowledge already covers well, and
don't call it more than 2 times in a single reply — pick your queries carefully (specific
component/model + topic, e.g. "Copeland Discus compressor oil failure diagnosis"). If results
come back empty or irrelevant, say so and answer from general knowledge instead of retrying
endlessly. Cite results using [Doc N] as described in RESPONSE FORMAT.
`

export const RACK_SEQUENCE_KNOWLEDGE = `
# Parallel Rack — Sequence of Events

Understanding the sequence of events through a parallel rack — in every operating mode — is what separates a technician who can diagnose quickly from one who chases symptoms. This guide walks through each operating mode step by step for both rack styles: the standard **receiver-based rack** and the **Tyler Enviroguard (receiver-bypass / floating head) rack**, with notes on variants like subcooled racks and racks with hot gas defrost.

---

## Rack Styles Overview

| Feature | Receiver Rack | Enviroguard Rack (Tyler/Carrier) |
|---------|--------------|----------------------------------|
| Liquid storage | Full liquid receiver (flooded with subcooled liquid) | Receiver is **bypassed** — not in main circuit; serves as seasonal charge buffer only |
| Subcooling | From condenser + receiver; typically 10–15°F | Very high in winter (cold condenser liquid delivered directly to cases); lower in summer |
| Flash gas risk | Moderate (pressure drop in long liquid lines) | Low in cool weather; liquid lines must be **fully insulated** to preserve subcooling |
| Refrigerant feed | Single-phase liquid via TXV/EEV | Single-phase liquid direct from condenser via TXV/EEV — same metering, different source |
| Head pressure control | OPR or headmaster valve (holds fixed minimum) | SPR pilot-controlled by ambient sensor; tracks ambient dynamically |
| Common on | HFC racks (most common) | Tyler/Carrier parallel rack installations (Canada and US); floating head pressure systems |
| Complexity | Standard | Higher — SPR setpoint, ambient sensor calibration, bleed circuit maintenance |

---

## Rack Style 1 — Receiver-Based HFC Rack (Standard)

This is the rack found in the majority of North American supermarkets. Refrigerant flows as single-phase subcooled liquid from the receiver to every circuit.

### Component Flow Path (follow the refrigerant)

**Compressors** → Discharge Header → Oil Separator
→ Condenser → **Liquid Receiver** → Liquid Line Service Valve
→ Liquid Line Filter-Drier → Sight Glass / Moisture Indicator
→ **Liquid Header** → (to each circuit)
  → Liquid Line Solenoid (LLS) → TXV or EEV
  → Evaporator Coil → Suction Line
  → EPR Valve (MT circuits only) → **Suction Header**
→ **Compressors** (cycle repeats)

---

### Sequence 1A — Normal Refrigeration (Cooling)

**Step 1 — Thermostat / controller calls for cooling**
- Case temperature rises above setpoint
- Case controller (Dixell, Carel, Sporlan S3C) or thermostat energises the liquid line solenoid coil
- Liquid line solenoid (NC normally closed) opens — high-pressure subcooled liquid enters the circuit

**Step 2 — Liquid feed and metering**
- Subcooled liquid travels through the liquid line to the TXV or EEV
- TXV: senses suction line temperature at the bulb; adjusts orifice to maintain superheat setpoint (typically 6–10°F)
- EEV: controller reads suction pressure transducer + suction temperature sensor; steps motor to maintain superheat
- Refrigerant enters evaporator at ~10–20% quality (mostly liquid)

**Step 3 — Heat absorption in the evaporator**
- Liquid refrigerant evaporates, absorbing heat from the case air or product
- At the evaporator outlet: dry saturated vapour + target superheat (6–10°F typical for MT; 10–15°F for LT)
- Evaporator fan(s) circulate air continuously across the coil

**Step 4 — EPR valve (MT circuits only)**
- On medium-temp circuits sharing a rack with LT circuits, an EPR (evaporator pressure regulator) holds the evaporator pressure at a minimum setpoint
- Example: MT case set at +20°F SST runs on a rack with −20°F LT suction setpoint; without EPR, MT evaporator would pull down to −20°F, freezing the case
- EPR maintains MT evaporator at +20°F; excess pressure differential is throttled across the valve
- LT circuits have no EPR — they connect directly to suction header

**Step 5 — Suction header and rack controller response**
- Refrigerant vapour enters the common suction header
- Suction pressure rises as load from open circuits increases
- Rack controller (E2, AK-PC, MT-Alliance) compares suction pressure to setpoint
- If suction pressure > setpoint + deadband (typically 2–3 psig): rack stages on additional compressor capacity
- If suction pressure < setpoint − deadband: rack stages off capacity

**Step 6 — Compression**
- Compressor(s) draw suction vapour from the header
- Gas is compressed from suction pressure (~50–60 psig for R-448A MT) to discharge pressure (~200–250 psig)
- Discharge gas temperature: typically 150–200°F depending on compression ratio and superheat
- Scroll compressors: liquid injection solenoid opens when discharge temp exceeds setpoint (~220°F) to cool the scrolls
- Reciprocating: cylinder unloaders modulate capacity on some compressors

**Step 7 — Discharge header and oil separator**
- Hot discharge gas travels through the discharge check valve on each compressor (prevents reverse flow through idle compressors)
- Gas enters the common discharge header
- Oil separator (coalescing or centrifugal) removes entrained oil droplets
- Oil returns via float valve or solenoid to the compressor crankcases / oil sump
- Oil-lean gas continues to the condenser

**Step 8 — Condensing**
- Hot gas enters the condenser coil (typically air-cooled, rooftop-mounted)
- Condenser fans (cycling or VFD-controlled) remove heat; gas condenses to liquid
- Head pressure controller targets: ~200–220 psig for R-448A; ~230–250 psig for R-404A
- Floating head pressure: controller reduces fan speed / head pressure setpoint as ambient temperature drops

**Step 9 — Liquid receiver**
- Condensed liquid drains by gravity into the liquid receiver
- Receiver stores a buffer of subcooled liquid (25–35% of system charge); decouples condenser and evaporator load variations
- Liquid level should show 30–60% in the receiver sight glass under normal load
- Receiver outlet: subcooled liquid (typically 10–15°F subcooling) exits through the liquid line service valve

**Step 10 — Return to liquid header**
- Liquid passes through the main liquid line filter-drier and sight glass
- Sight glass: green = dry; yellow = replace drier; bubbles = flash gas (low charge or drier restriction)
- Liquid distributes to all circuits via the liquid header
- Cycle continues

---

### Sequence 1B — Pump-Down Cycle

The pump-down cycle is how a circuit safely shuts off at end of cooling — it evacuates liquid refrigerant from the evaporator before the compressor stops, preventing liquid migration and floodback at the next restart.

**Step 1 — Thermostat satisfied**
- Case temperature reaches setpoint; controller de-energises liquid line solenoid coil
- LLS closes (spring-return) — liquid feed to evaporator stops immediately

**Step 2 — Compressor pumps down the circuit**
- Suction pressure from that circuit begins to fall as remaining vapour is pumped out
- Compressor continues running — pulls vapour from the evaporator and suction line
- Evaporator gradually clears of liquid; only vapour remains

**Step 3 — LP cutout or rack controller stops compressor**
- On a single-circuit system (condensing unit): LP pressure switch cuts compressor when suction reaches pump-down pressure (set ~5 psig above LPCO)
- On a parallel rack: the rack controller sees suction pressure drop on that suction group; when total suction group pressure falls below setpoint − deadband, it stages off the last compressor
- Individual circuit pump-down to LP cutout is less common on multiplex racks (the whole group stages together)

**Step 4 — System off**
- Liquid refrigerant is in the condenser and receiver, not in the evaporators
- Low side (evaporators + suction lines) holds refrigerant vapour at ambient temperature equilibrium
- Crankcase heaters remain energised to drive refrigerant out of compressor oil during off period

**Step 5 — Next cooling call**
- Thermostat opens LLS → liquid rushes to evaporator → suction pressure rises → rack stages compressor(s) back on
- Evaporator coil floods with liquid quickly (< 1 min on properly sized circuits)

---

### Sequence 1C — Hot Gas Defrost (2-Pipe System)

The most common defrost method on HFC parallel racks in supermarkets. Hot discharge gas is diverted to the evaporator coil to melt frost.

**Step 1 — Defrost initiated**
- Defrost timer (time-initiated) or demand defrost (temperature-initiated) triggers
- Rack controller or case controller starts defrost sequence for that circuit/group of circuits

**Step 2 — Liquid feed shut off**
- Liquid line solenoid (LLS) closes — stops liquid refrigerant from entering
- Evaporator fan(s) shut off (prevents warm air from being blown on product)
- On some installations: a time delay of 2–5 minutes allows the evaporator to "pump down" before hot gas flows

**Step 3 — Hot gas solenoid opens**
- Hot gas defrost solenoid (HGDS) energises — opens
- HGDS is connected from the rack discharge header (after the oil separator) to the defrost inlet on the circuit
- Hot discharge gas (~180–200°F) enters the evaporator from the outlet end (reverse flow through the coil on 2-pipe systems) or from a dedicated defrost port (3-pipe systems)

**Step 4 — Frost melts, condensate drains**
- Hot gas gives up heat to the frost; gas condenses inside the coil
- Condensate (now liquid refrigerant) drains to the suction line via a check valve (2-pipe) or a dedicated defrost return line (3-pipe)
- Drain pan heater energised to melt pan ice and keep drain line clear
- Defrost suction check valve: allows liquid/vapour mix to return to suction header during defrost without back-flowing into other circuits

**Step 5 — Termination**
- Temperature-terminated: termination sensor on coil fin reaches setpoint (typically +55–65°F); defrost ends
- Time-terminated (backup): if temp termination doesn't occur within max defrost time (e.g., 30 min), defrost ends on time
- Both conditions tripping = defrost ends on whichever comes first

**Step 6 — Drip cycle (drain and equalize)**
- HGDS closes; evaporator allowed to drain for 2–5 minutes (drip time)
- On racks with an EPR bypass solenoid (Hussmann design): bypass solenoid energises during drip to control refrigerant return rate and prevent flooding the suction header
- Evaporator fan(s) remain off during drip

**Step 7 — Fan restart and return to cooling**
- Evaporator fan(s) restart
- LLS opens; rack stages on compressor capacity; circuit returns to normal refrigeration
- Case controller may delay alarming for 30–60 minutes post-defrost to allow case temperature to recover

---

### Sequence 1D — Rack Startup After Power Restoration

**Before starting:**
- Verify crankcase heaters have been on for at least 2–4 hours (drive refrigerant out of oil)
- Check oil sight glass levels: oil should be at ½–¾ on all compressors
- Verify head pressure control valves and fan contactors are functional

**Step 1 — Power restoration**
- Rack controller boots and runs self-diagnostic
- Control voltage applied to solenoids, contactors, safety switches
- LP and HP pressure switches checked: if either is tripped manually-reset, compressor won't start

**Step 2 — First compressor stages on (lead)**
- Rack controller reads suction pressure — after a long off period, suction pressure will be at ambient equilibrium (high)
- Lead compressor starts; suction pressure begins to fall
- Discharge check valves on idle compressors prevent reverse flow

**Step 3 — Compressor protections active**
- Scroll: minimum off time (3 min) enforced before restart; high discharge temperature protection active
- Reciprocating: motor protector (INT69 or Kriwan) monitors motor temperature; delays restart if overtemperature
- Oil level controller: opens to feed oil as crankcase level stabilises

**Step 4 — Head pressure rises to operating range**
- Condenser fans start; head pressure climbs from ambient equilibrium to operating setpoint
- Head pressure control modulates fan speed or stages fans to reach target

**Step 5 — Additional compressors stage on**
- As suction pressure stabilises at setpoint, additional compressors stage on sequentially
- Run hour rotation assigns lead/lag based on accumulated hours
- Case temperatures may be elevated after outage — expect increased staging until cases recover

**Step 6 — System reaches steady state**
- All circuits cycling on thermostat calls
- Floating suction and floating head pressure active (verify in controller)
- Normal operating parameters: suction at setpoint, discharge 170–200°F, subcooling 10–15°F, superheats 6–12°F

---

## Rack Style 2 — Tyler Enviroguard (Receiver-Bypass / Floating Head) Rack

**Reference: Tyler Refrigeration — Parallel Compressors & Enviroguard Installation & Service Manual (Part No. 5806448 Rev. D, June 2007)**

The Enviroguard system (Tyler/Carrier) is fundamentally different from a standard receiver rack. The key distinction: **the receiver is taken OUT of the main refrigeration circuit**. Liquid refrigerant flows directly from the condenser to the liquid manifold that feeds the branch circuits — the receiver is not in the normal flow path.

The receiver serves only as a **seasonal charge buffer** — it stores refrigerant in summer (when the condenser charge is lower due to flooding) and releases it in winter. It is NOT a surge drum and NOT a liquid recirculating vessel.

### The SPR (System Pressure Regulator) — The Core Component

The SPR is the key valve that makes Enviroguard work. It has two functions:
1. **Bypass to receiver**: When head pressure rises too high relative to ambient, the SPR diverts liquid refrigerant into the receiver — removing it from the active circuit
2. **Pilot-controlled setpoint**: The SPR is controlled by a pilot line connected to an ambient air sensor (a small charged tube mounted under the condenser fans)

**How the pilot works:** The ambient air sensor contains the same refrigerant as the system. As outdoor temperature changes, the pressure inside the sensor changes proportionally. This pilot pressure sets the SPR opening point automatically — the SPR always tracks ambient conditions.

**SPR differential settings (R-22):**
- Low temperature systems: ~45 psig above ambient saturation pressure
- Medium temperature systems: ~61 psig above ambient saturation pressure
- R-404A and R-448A systems: different differentials — refer to the SPR bleed pressure charts in the Tyler manual

Whenever condensing pressure exceeds ambient saturation pressure by the set differential, the SPR opens and bypasses liquid refrigerant into the receiver. This prevents over-condensing in cold weather while allowing maximum subcooling in warm weather.

### Correct Component Flow Path

**Normal refrigeration (liquid bypasses receiver):**
Compressors → Discharge Header → Oil Separator → Condenser → **Liquid Dropleg** → SPR (closed) → **Liquid Manifold** → Branch circuits (TXV → Evaporator → Suction return) → Suction Header → Compressors

**When head pressure is too high (SPR opens):**
Condenser → Liquid Dropleg → **SPR opens** → Receiver (excess liquid stored temporarily)
- Receiver acts as buffer; liquid is removed from active circuit
- Branch circuits see reduced liquid supply — case temperatures rise as a diagnostic signal of SPR overcorrection or condenser fouling

**Receiver bleed circuit (always active when compressors run):**
Receiver → Hand valve → Strainer → Solenoid valve → Sightglass → Capillary tube → 1/4" O.D. heat exchanger → Suction manifold
- A small, controlled bleed of liquid from the receiver evaporates before entering the suction manifold
- Ensures oil return from the receiver and prevents receiver from overfilling
- The heat exchanger ensures liquid is fully evaporated before entering suction — liquid floodback through this circuit would cause compressor failure

### Sequence 2A — Normal Refrigeration on an Enviroguard Rack (Cool Weather)

**Step 1 — Thermostat calls for cooling**
- Circuit liquid line solenoid or suction stop EPR opens
- Subcooled liquid from the condenser dropleg flows directly to the TXV — bypassing the receiver entirely

**Step 2 — Expansion at the circuit**
- TXV meters liquid at the evaporator inlet; suction bulb maintains 6–12°F superheat (same as standard receiver rack)
- Liquid arrives at the TXV at condenser liquid temperature — in cool weather, this can be extremely subcooled (20–40°F+), significantly more than a conventional receiver rack

**Step 3 — Suction return (standard)**
- Dry superheated vapour returns to suction manifold — same as any receiver rack
- No wet return, no overfeed, no recirculating pump

**Step 4 — SPR monitoring**
- SPR continuously compares condensing pressure to ambient sensor pressure + differential
- Cool weather: head pressure is low; SPR stays closed; all liquid flows to cases — maximum subcooling delivered
- Warm day or defrost surge: head pressure rises above set differential; SPR opens; excess liquid diverted to receiver temporarily

**Step 5 — Receiver bleed**
- Whenever any compressor runs, the bleed circuit solenoid is energized (open)
- Metered liquid from the receiver passes through capillary tube and heat exchanger, evaporating into the suction manifold
- Returns oil that migrated to the receiver; prevents receiver overfill

### Critical Service Notes (from Tyler Manual)

**Liquid line insulation is mandatory on all Enviroguard systems**: All liquid lines from rack to cases must be fully insulated. The entire energy savings of Enviroguard comes from delivering cold condenser liquid directly to cases. Uninsulated lines absorb heat, raise liquid temperature, cause flash gas at the TXV, and completely eliminate the subcooling benefit.

**Condenser fan control must use a pressure transducer — never temperature**: Temperature sensors respond too slowly to sudden head pressure surges from defrost termination or compressor cycling. A surge with temperature-based control causes the SPR to dump liquid into the receiver, starving branch circuits until refrigerant transfers back. Use an electronic pressure controller with a pressure transducer on the condenser liquid dropleg.

**A full receiver is abnormal**: In a conventional rack, a full receiver is normal. In an Enviroguard system, a full receiver means the SPR has been dumping liquid — indicating elevated head pressure, a fouled condenser, or an SPR setpoint error. Investigate the cause.

**SPR tracks ambient, not a fixed pressure**: Unlike an OPR/headmaster that holds a minimum fixed receiver pressure, the SPR setpoint floats with outdoor ambient temperature. Setting the SPR differential incorrectly for the refrigerant or ambient range causes chronic receiver dumping (system starved) or no bypass (receiver floods in winter).

**Existing system retrofits require factory approval**: Tyler explicitly states retrofitting Enviroguard onto an existing conventional rack is not supported without factory sign-off.

### Enviroguard Variants

| Variant | Key Feature |
|---|---|
| Enviroguard (original) | SPR + ambient air sensor; mechanical pilot control |
| Enviroguard II | Contact Tyler service department for documentation |
| Enviroguard III | Electronic control integration (Comtrol MCS-4000, CPC RMCC, Danfoss AKC-55); liquid return piping; SPR solenoid valve for controller |

### Comparison: Enviroguard vs Standard Receiver Rack

| Parameter | Standard Receiver Rack | Enviroguard Rack |
|---|---|---|
| Receiver in main circuit | Yes — all liquid passes through receiver | No — receiver is bypassed; liquid flows direct to cases |
| Receiver function | Liquid storage and pressure buffer | Seasonal charge buffer only |
| Head pressure control | OPR/headmaster holds minimum fixed pressure | SPR tracks ambient dynamically |
| Subcooling at liquid manifold | 10–15°F (receiver + condenser) | Varies with ambient — much higher in winter |
| Expansion device | TXV or EEV (standard) | TXV (standard — unchanged) |
| Liquid line insulation | Recommended | Mandatory — subcooling benefit is lost without it |
| Condenser fan control | Temperature or pressure | Must be pressure-based |
| Oil return from receiver | Handled through receiver level | Dedicated bleed circuit (capillary tube + heat exchanger) required |
| Full receiver = normal? | Yes | No — indicates SPR overcorrection or fouled condenser |

---

## Rack Style 3 — Receiver Rack with Mechanical Subcooler

An add-on to the standard receiver rack: a liquid-suction heat exchanger (LSHX) or dedicated subcooler coil is installed between the receiver outlet and the liquid header.

### How It Changes the Sequence

After Step 9 (receiver) in the standard sequence, liquid passes through the subcooler:

**Subcooler step:**
- Warm liquid from receiver (10–15°F subcooling) passes through one side of the heat exchanger
- Cold suction gas returning from circuits (or a dedicated cold evaporator) passes through the other side
- Liquid gains additional subcooling: 15–30°F total subcooling at liquid header is typical
- Suction gas gains a few degrees of superheat (acceptable trade-off)

**Benefits:**
- More subcooling → less flash gas → TXVs receive denser liquid → more capacity per lb of refrigerant
- Particularly valuable on long liquid line runs where flash gas would otherwise form from pressure drop

**Watch out for:**
- If suction gas inlet to the LSHX is too warm (high superheat from poor expansion device control), subcooling effect is reduced
- LSHX pressure drop on suction side is a capacity penalty — keep velocity low

---

## Rack Style 4 — Receiver Rack with Hot Gas Bypass (Light-Load Anti-Short-Cycle)

At very low loads (night, closed store), the rack may have more compressor capacity than the minimum load requires. Hot gas bypass (HGBP) prevents the last compressor from short-cycling.

### How It Changes the Sequence

When suction pressure falls below the HGBP setpoint (typically 5–8 psig below the suction setpoint):

**Hot gas bypass step:**
- HGBP valve opens — diverts a small amount of hot discharge gas back to the suction header (or directly to the suction of the last compressor)
- Artificially raises suction pressure by adding load
- Last compressor keeps running steadily; no short-cycling
- Some HGBP systems inject to the suction header with a desuperheating liquid injection simultaneously (prevents discharge temperature from rising due to the hot gas recirculation)

**When to suspect HGBP fault:**
- Suction pressure abnormally low at night but normal during day: HGBP valve stuck closed → last compressor short-cycles
- Suction pressure never drops to setpoint at any load: HGBP valve stuck open → adding artificial load at all times → wasting energy

---

## Side-by-Side: What Changes Between Rack Styles at Each Mode

| Operating Mode | Receiver Rack | Enviroguard Rack (Tyler/Carrier) |
|---------------|--------------|----------------------------------|
| Normal cooling | Single-phase liquid feed via TXV/EEV; liquid flows condenser → receiver → liquid header | Single-phase liquid feed via TXV/EEV; liquid flows condenser → **directly to liquid manifold** (receiver bypassed); SPR closed |
| Cool ambient | Head pressure held by OPR/headmaster at fixed minimum | Head pressure floats low; SPR closed (head pressure below ambient saturation + differential); maximum subcooling at cases |
| Warm ambient / high head pressure | OPR/headmaster opens to relieve pressure | SPR opens → diverts liquid into receiver; removes refrigerant from active circuit; head pressure drops |
| Thermostat satisfied | LLS closes; suction pumps down; compressor stages off | Same — LLS closes; compressor stages off; bleed circuit continues returning small liquid volume from receiver to suction |
| Hot gas defrost | HGDS opens; hot gas reverses through coil; condensate drains to suction | Same sequence — Enviroguard does not change defrost logic; condensate drains to suction header normally |
| Startup | Crankcase heater warmup; LP reset; sequential staging | Same + confirm bleed circuit hand valve is open; confirm SPR ambient sensor tube is intact and positioned under condenser fans |
| Low load / overnight | HGBP or compressor staging; floating suction raises | Same; as ambient drops, head pressure drops; SPR stays closed; receiver gradually drains via bleed circuit back to active charge |
| Power outage recovery | Check crankcase heaters; receiver full (liquid migrated during off) | Check receiver sight glass — if full, bleed circuit will take time to redistribute; restart normally; do not manually open SPR |

---

## Technician Reference: Pressure Checkpoints at Each Stage

Use these pressure reference points to confirm the sequence is working:

| Location | Expected Reading (R-448A) | What High Means | What Low Means |
|----------|--------------------------|-----------------|----------------|
| MT suction header | +18 to +28°F SST (≈30–42 psig) | Overcapacity / EPR too high | Undercapacity / EP too low / restriction |
| LT suction header | −20 to −15°F SST (≈6–8 psig) | LT compressor undercapacity / LT EPR fault | LT compressor oversized / circuit starved |
| Discharge header | 175–235 psig | Condenser fouled / fans failed / overcharge | Head pressure too low / head pressure valve fault |
| Liquid header (subcooling) | 10–20°F | Overcharge | Low charge / condenser underperforming |
| Across filter-drier | < 2 psig drop | Drier plugged | — |
| Individual circuit EPR outlet | At setpoint SST ± 2°F | EPR stuck open | EPR stuck closed |
| Compressor suction vs header | Should match within 1–2 psig | Suction valve failure (high) | Suction check valve stuck open (low) |
`

export const FILTER_DRIER_KNOWLEDGE = `
# Filter-Drier Selection, Sizing & Burnout Cleanup

Filter-driers are the most underrated component on a refrigeration system. A restricted or saturated drier causes more unnecessary compressor replacements and callbacks than almost any other component failure. This guide covers cross-brand selection (Parker Sporlan Catch-All and Henry Technologies), sizing methodology, post-burnout cleanup protocol, and acid test interpretation.

---

## What a Filter-Drier Does

A filter-drier performs three jobs simultaneously:
1. **Moisture removal** — desiccant adsorbs water vapor from the refrigerant; prevents ice formation at the expansion device and acid formation in the oil
2. **Acid neutralisation** — activated alumina chemically neutralises refrigerant acids (HF, HCl) before they attack copper, steel, and polymer components
3. **Particulate filtration** — metal shavings, copper oxide, carbon, rubber fragments, and compressor wear debris are trapped in the filter element

A drier that has reached capacity for any one of these does nothing for the others — it is not a passive component that merely degrades gracefully.

---

## Desiccant Types

### Activated Alumina (AA)
- High moisture capacity; also neutralises acid
- Used in standard HFC systems (R-404A, R-448A, R-407A, R-134a)
- Loses effectiveness at very high moisture loads — can release moisture back into the system if oversaturated

### Molecular Sieve (3Å or 4Å)
- Very high selectivity for water molecules; does not release moisture once adsorbed
- Lower acid capacity than alumina
- 3Å preferred for HFO refrigerants (R-448A, R-449A, R-452A) — smaller pore size prevents HFO molecules from being adsorbed and degraded

### Blended (Alumina + Molecular Sieve)
- Most common in standard HFC liquid line driers
- Sporlan "HH" core and Henry standard core: blended alumina + sieve
- Best overall performance for typical HFC systems

### Core Designations by Brand

| Application | Sporlan (Catch-All) | Henry Technologies | Notes |
|------------|--------------------|--------------------|-------|
| Standard HFC liquid line | HH core | Standard / H series | Blended alumina + sieve |
| HFO retrofit (R-448A/R-449A) | XH core | XH or "Dryness Plus" | Molecular sieve; required for low-GWP HFO blends |
| High moisture / open-system cleanup | XH core | XH core | Sieve only; maximise adsorption |
| Suction line post-burnout | RSF (Sporlan) / SLD (Henry) | SLD series | Temporary (72 hr max); remove after cleanup |

---

## Product Lines

### Parker Sporlan Catch-All

**C series (solid core):**
- Available 032 through 715 nominal ARI tons (R-22 basis)
- Solid desiccant cylinder; entire drier replaced when spent
- Most economical for smaller liquid lines (1/4"–7/8")

**RC series (replaceable core, also called "Core-Dri"):**
- Shell permanently brazed in line; only desiccant core replaced
- Reduces downtime: no need to recover refrigerant to change a drier after the initial installation
- Available in larger sizes (up to 2-1/8" ODS)
- Core types: HH (standard), XH (HFO/high moisture)

**RSF series (suction line, post-burnout):**
- Large-bore suction line filter-drier; high acid and carbon capacity
- For post-burnout cleanup ONLY — 72-hour maximum in-line time
- Excessive pressure drop (5–15 psi) causes capacity loss on suction side if left in
- After 72 hours: remove and install a standard suction filter (no desiccant)

### Henry Technologies

**BD series (standard liquid line, solid core):**
- Functionally equivalent to Sporlan C series
- Available 032 through 715 (same ARI sizing basis)
- ODS sweat connections, standard
- Henry uses the same 3/8", 1/2", 5/8", 7/8", 1-1/8", 1-3/8", 1-5/8", 2-1/8" connection sizes as Sporlan

**HBR series (replaceable core):**
- Henry's equivalent to Sporlan RC
- Core types: standard (alumina+sieve) and XH (sieve only)

**SLD series (suction line, post-burnout):**
- Henry's equivalent to Sporlan RSF
- Same 72-hour maximum rule applies

**Connection types (both brands):**
- **ODS sweat (brazed)** — most common; sizes match copper tube OD
- **SAE flare** — field-fittable; used where brazing is not available (rare in commercial refrigeration)
- **Rotalock / access fitting** — used on some condensing unit factory-installed driers; requires rotalock wrench

---

## Sizing Methodology

Filter-driers are sized on **nominal refrigerating capacity (ARI tons)** at standard ARI conditions:
- Liquid entering at 100°F (38°C) with 10°F (5.5°C) subcooling
- Evaporating at +5°F (-15°C) SST
- Rated on R-22 basis; correction factors apply for other refrigerants

### Step 1 — Determine system capacity and refrigerant
Use the rack nameplate or engineering drawings for total connected case load.

### Step 2 — Apply refrigerant correction factor
Different refrigerants have different densities and mass flow rates at the same tonnage:

| Refrigerant | Approx. Correction Factor vs R-22 |
|-------------|----------------------------------|
| R-404A | 0.85 (slightly undersized at same ton rating — use next size up) |
| R-448A / R-449A | 0.90 |
| R-134a | 0.75 (needs larger drier for same capacity) |
| R-22 | 1.00 (baseline) |
| R-410A | 1.10 (use same or one size smaller) |

### Step 3 — Apply subcooling correction
More subcooling = denser liquid = higher mass flow = slightly larger drier needed:
- Standard: 10°F subcooling (baseline)
- High subcooling (20–30°F from subcooler): multiply capacity by 0.90 → use next size up

### Step 4 — Match to line size
The drier connection must match the liquid line size. For multiplex racks, size the drier on the **total rack capacity** (liquid line leaves the condenser/receiver), not individual circuit capacity.

### Pressure Drop Target
A new, clean drier should have < 1 psi pressure drop in normal operation. Replace at > 2 psi drop (measured liquid-to-liquid subcooling temperature difference, or manifold gauge differential). Most sight glasses installed immediately downstream will show bubbles if drop exceeds ~3 psi (flash gas from pressure drop).

---

## Sight Glass / Moisture Indicator Interpretation

Install a sight glass with moisture indicator immediately downstream of the filter-drier (upstream of TXV/EEV):

| Colour | Meaning | Action |
|--------|---------|--------|
| **Green / Blue** | Dry — moisture below threshold | Normal; no action |
| **Yellow / Gold** | Wet — moisture above threshold | Replace drier immediately; do not delay |
| **White / Cloudy** | Severely wet — system contaminated | Emergency drier change; recover system; check for open joints |
| **Bubbles in glass** | Flash gas — low charge OR drier restriction | Check drier pressure drop and refrigerant charge |

Yellow is an urgent warning, not a monitoring item. Acid formation accelerates exponentially above the moisture threshold — a system left with a yellow sight glass for weeks will have significant oil degradation.

---

## When to Replace a Filter-Drier

1. Pressure drop across drier > 2 psi (0.14 bar)
2. Sight glass shows yellow or white indicator
3. Any time the system has been open to atmosphere for more than a few minutes
4. After any compressor replacement (wear debris in system)
5. After a confirmed burnout — replace liquid line drier with XH core; install suction line filter (RSF/SLD)
6. As part of a refrigerant retrofit from R-404A to R-448A or R-449A (XH core required)
7. Annual PM on systems with known moisture history or repeated compressor issues

---

## Post-Burnout Cleanup Protocol

A compressor burnout leaves carbon, copper oxide, acid, and degraded oil throughout the system. Proper cleanup takes 4–6 weeks for a severe burnout; shortcuts lead to repeat compressor failures.

### Classify the Burnout

| Severity | Visual Indicators | Oil Acid Test Result |
|----------|------------------|---------------------|
| Mild | Slightly darkened oil; minimal carbon at discharge | Slight yellow (borderline) |
| Moderate | Black oil; carbon deposits at service valve ports | Yellow to light orange |
| Severe | Heavy carbon deposits; oil smells burnt; black sludge | Orange to red |

### Step-by-Step Cleanup

**Immediately after burnout confirmed:**
1. Recover refrigerant — note: burned refrigerant has HF and HCl acids; use dedicated recovery cylinder
2. Pull oil sample before flushing — submit for acid test (see below)
3. Remove failed compressor
4. Flush discharge manifold and liquid line with approved flush solvent if heavily contaminated; blow dry with dry nitrogen
5. Install **suction line filter-drier** (RSF or SLD) on suction service valve port
6. Replace **liquid line filter-drier** with XH core (high moisture/acid capacity)
7. Install new compressor; charge oil to correct level
8. Triple-evacuate to < 300 microns

**First 72 hours:**
9. Charge system with correct refrigerant type and quantity
10. Start system and run for 4 hours
11. Pull oil sample at 24 hours and 48 hours — acid test each sample
12. At 72 hours: **remove suction line RSF/SLD** (mandatory — do not leave it in)

**Follow-up drier changes:**
13. Change liquid line drier at 72 hours, then again at ~2 weeks
14. At each drier change: cut open the old drier with a pipe cutter and inspect the core
    - Mild burnout: core is slightly discoloured; clear oil drops
    - Moderate: core is dark brown with black particles
    - Severe: core is black, saturated with carbon; may have oil sludge
15. Continue drier changes until:
    - Acid test is green (negative)
    - Cut-open drier core shows minimal discolouration
    - Compressor oil is clear or light amber at the sight glass

**Typical timeline:**
- Mild burnout: 1–2 drier changes over 1–2 weeks; acid test negative at 2 weeks
- Moderate: 2–3 changes over 3–4 weeks
- Severe: 3–5 changes over 4–6 weeks; may require oil flush mid-sequence

---

## Acid Test Interpretation

Acid test kits measure the concentration of organic and inorganic acids in the compressor oil. Two types are common in the field:

### Type 1 — Oil Acid Test (most common)
Tests a small oil sample drawn from the crankcase or oil separator.

**Common kits:**
- **Sporlan / Parker Acid Test Kit** — test tube with indicator solution
- **Emerson Universal Acid Alert / Uni-Kit** — similar colorimetric test
- **Henry Acid Test Kit** — uses similar chemistry

**Procedure:**
1. With system off (or using a live-sample port), draw ~5 mL of oil into test tube
2. Add 2 drops of indicator solution; cap and invert 3× to mix
3. Compare colour to reference chart after 10 minutes (colours continue to develop)

**Colour interpretation:**

| Colour | Acid Level | Meaning | Action |
|--------|-----------|---------|--------|
| **Green / Clear** | Negative (< 0.05 mg KOH/g) | Clean oil; no acid | Normal operation |
| **Yellow / Straw** | Slight (0.05–0.1 mg KOH/g) | Borderline; acid present | Change drier; retest in 1 week |
| **Orange** | Moderate (0.1–0.5 mg KOH/g) | Acid contamination | Active cleanup protocol; change drier; retest in 72 hr |
| **Red / Dark Red** | High (> 0.5 mg KOH/g) | Heavy acid — system contaminated | Full burnout cleanup; may need multiple drier changes and oil flush |

**Key rules:**
- A green test does NOT mean the system is clean — particulates and carbon remain even after acid is neutralised
- Test at time zero (before any cleanup) to establish baseline severity
- Test at 24 hr, 48 hr, 2 weeks, and 4 weeks to track cleanup progress
- Do not stop the cleanup protocol just because the acid test is green — complete all scheduled drier changes

### Type 2 — Refrigerant Acid Test
Less common in the field; tests a refrigerant liquid sample rather than oil. Used when oil is inaccessible (hermetic compressor) or when checking the refrigerant circuit after recovery/recharge.

**Interpretation is similar** — green/clear = acceptable; yellow/orange/red = increasing contamination.

---

## Common Field Mistakes

1. **Leaving RSF/SLD suction filter in beyond 72 hours** — creates 5–15 psi suction pressure drop; case temperatures rise, compressor runs hot, capacity is lost. The drier has done its job by then — leaving it in only hurts.
2. **Not changing the liquid line drier after opening the system** — even 5 minutes of air exposure during a repair introduces enough moisture for acid formation within days.
3. **Using HH core on R-448A / R-449A retrofit** — activated alumina degrades HFO refrigerant molecules; always use XH (molecular sieve only) after an R-404A → R-448A retrofit.
4. **Sizing drier to suction group capacity instead of rack total capacity** — liquid line drier sees all refrigerant returning from the condenser; size it on total rack tonnage.
5. **Not installing a sight glass with moisture indicator** — no way to know when to change; always pair drier with a See-All or equivalent.
6. **Cutting corners after a moderate burnout** — skipping the second or third drier change because "the test is yellow, not red." Yellow means active acid is still present; the next compressor will fail within 6 months.
7. **Using wrong connections — piping in backward** — flow direction is marked on the drier shell (arrow pointing toward TXV/EEV); installing backward allows bypassed moisture to reach the expansion device.
8. **Charging through the liquid line drier** — foreign particles and moisture from the manifold hose contaminate the drier core; always charge through a dedicated schrader port downstream of the drier.
`

export const SOLENOID_VALVE_KNOWLEDGE = `
# Solenoid Valve Troubleshooting — Coil Testing, Manual Operation & Field Diagnosis

![Solenoid valve cross-section diagram](https://upload.wikimedia.org/wikipedia/commons/6/6f/Solenoid_Valve.svg "Solenoid valve cross-section — showing coil, plunger, and valve seat; direct-acting type")

Solenoid valves are found everywhere on a commercial refrigeration system: liquid lines, hot gas defrost lines, oil return lines, EPR bypass circuits, and pump-down controls. When one fails, it usually presents as a case not cooling, a case overcooling, or a compressor cycling issue. Knowing how to quickly confirm whether the valve, coil, or control signal is at fault saves hours.

---

## Types and Operating Principles

### Direct-Acting (Series B — Sporlan; A series — Danfoss EVRA)
- The solenoid plunger directly lifts the valve disc off the seat
- Works at **any pressure differential**, including zero differential
- Available in smaller sizes (up to ~3/4" orifice)
- Used on: oil return lines, small liquid lines, low-pressure circuits

### Pilot-Operated (Series E — Sporlan; EVR/EVRs — Danfoss)
- The coil lifts a small pilot piston; line pressure differential does the actual work of opening the main disc
- **Requires minimum pressure differential (3–5 psi) across the valve to open fully**
- Available in larger sizes (7/8" through 2-1/8")
- Used on: main liquid lines, hot gas headers, discharge lines
- **Critical: if system pressure is equalized (off-cycle), pilot-operated valve will not open** — use direct-acting for circuits that must open at zero differential (oil return, bypass)

### Normally Closed (NC) vs Normally Open (NO)
- **NC** = closed when coil is de-energised; opens when coil is energised — standard for liquid lines (prevents flow during off-cycle)
- **NO** = open when coil is de-energised; closes when coil is energised — used on oil return lines (must stay open during off-cycle to allow oil drainage), bypass valves, and some safety circuits
- **Getting this wrong is a common installation mistake** — an NC valve on an oil return line means oil can't drain when the system is off

---

## Coil Identification and Voltage

Most commercial refrigeration solenoid coils fall into these categories:

| Coil Series | Voltage | Typical Resistance | Notes |
|-------------|---------|-------------------|-------|
| 24 VAC | 24 VAC, 60 Hz | 200–400 Ω | Most common; used with store controller outputs |
| 120 VAC | 120 VAC, 60 Hz | 1,200–2,000 Ω | Older installations; confirm before ordering replacement |
| 24 VDC | 24 VDC | 20–60 Ω | Lower resistance than AC coils; used with DC relay outputs |
| 240 VAC | 240 VAC, 60 Hz | 4,000–8,000 Ω | Rare; large industrial applications |

**Sporlan coil designation:**
- MKC-1 = 24 VAC/DC (universal coil; most common replacement)
- MKC-2 = 120 VAC

**Danfoss coil designation:**
- 018F series = 24 VAC; 120 VAC; 240 VAC (interchangeable coil body, different voltage wound inside)
- Always read the coil label before measuring resistance — a 120 VAC coil on a 24 VAC circuit will not hold open; a 24 VAC coil on 120 VAC will burn out immediately

---

## Coil Testing Procedure

### Step 1 — Visual Inspection
- Look for coil body cracking, melted plastic, burn marks, or corrosion on terminals
- Check that the coil retention nut is snug (finger-tight + 1/4 turn) — a loose coil will chatter and burn out
- Confirm coil is correct for the valve body it's on (wrong voltage; wrong series)

### Step 2 — Voltage at the Coil Terminals
**This is the most important test — always check voltage before condemning the valve.**

Using a multimeter set to AC or DC volts (match expected coil type):
1. Place probes on the two coil terminals (leave coil on valve)
2. Verify controller is calling for the valve to open (thermostat in call, defrost active, or manually trigger the output)
3. **Expected: rated voltage ± 10%** (e.g., 24 VAC coil should read 21–26 VAC)
4. **No voltage = control signal problem**, not a valve problem — trace the circuit back to the relay, controller output, or thermostat before touching the valve

**Low voltage (e.g., 18 VAC on a 24 VAC circuit):**
- Check for voltage drop across long wire runs — use Ohm's law to verify wire gauge is adequate
- Causes valve chatter (buzzing) and shortened coil life
- Acceptable range: ±10% of rated voltage; below this, the magnetic pull force is insufficient

### Step 3 — Coil Resistance (de-energised)
Remove the coil from the valve (or disconnect wires) and measure resistance with multimeter set to Ω:

| Reading | Interpretation | Action |
|---------|---------------|--------|
| Within expected range (see table above) | Coil is electrically healthy | Check control signal and valve body |
| Open loop (OL / ∞) | Coil winding broken | Replace coil |
| Near 0 Ω (shorted) | Coil winding shorted | Replace coil; check fuse/breaker |
| Half of expected value | One winding shorted (partially failed) | Replace coil |

### Step 4 — Coil Current Draw (amperage)
A clamp meter around one coil wire measures actual current draw while energised:

**Expected values (approximate):**
- 24 VAC, 200–400 Ω coil: ~60–120 mA (0.06–0.12 A) — multiply by VA rating on label
- 24 VAC coil rated at 10 VA: I = 10 VA ÷ 24 V = ~0.42 A
- 120 VAC coil rated at 20 VA: I = 20 VA ÷ 120 V = ~0.17 A

**Current vs resistance diagnosis:**
- Normal current = coil and magnetic circuit are healthy; if valve isn't opening, problem is mechanical (valve body) or pressure differential
- High current + low resistance = shorted coil; replace coil
- Zero current = open winding or no voltage reaching coil

**Why current matters:** On older systems with relay cards, a shorted coil drawing excess current can trip the relay output without a visible fault — measure current when the output appears active but the valve isn't responding.

---

## Manual Stem Operation

Most Sporlan B and E series and Danfoss EVR valves have a manual lift stem (also called an emergency override or manual operator):

### How to Use
1. Locate the manual stem — typically a slotted hex post under a protective cap on top of the coil bonnet
2. Remove cap; insert correct hex key (typically 3/32" or 1/8") or flat-blade screwdriver
3. **Screw the stem IN (clockwise)** to manually lift the plunger/pilot and force the valve open
4. Valve remains open mechanically regardless of coil or control signal
5. **Return stem to fully OUT (counter-clockwise) when done** — leaving it in blocks the solenoid plunger from seating on power-off, defeating pump-down and defrost termination

### When to Use Manual Stem
- Confirm a valve is physically capable of opening when coil or wiring is suspect
- Emergency: valve coil failed and system must remain running until parts arrive — manually open the liquid line solenoid
- Pre-startup commissioning: verify each liquid line valve opens before energising the full rack

### Manual Stem Cautions
- Do not force the stem past its stop — you can damage the packing or break the stem
- On CO₂-rated valves (Sporlan W series, Danfoss EVRA): use appropriate CO₂-rated valve only; manually lifting on a failed valve at high pressure is dangerous — confirm pressure is safe
- Always return to auto position before leaving the site

---

## Common Failure Modes and Diagnosis

### Valve Sticks Open (NC valve allowing flow when should be closed)

**Symptoms:**
- Case overcools continuously; compressor runs without cycling off
- Pump-down fails (suction pressure doesn't drop when thermostat is satisfied)

**Causes and checks:**
1. Coil is energised when it shouldn't be — check controller output, thermostat wiring, defrost timer position
2. Plunger scored, corroded, or has debris on seat — remove coil; listen for click when coil is energised/de-energised; if no mechanical click, valve body is seized
3. Pilot orifice blocked open by debris (pilot-operated valve) — remove and clean or replace
4. Refrigerant contamination (acid, moisture, metallic particles) scored the seat — replace valve body

**Quick test:** De-energise coil and place hand on suction line or liquid line downstream. If temperature change stops, valve is opening on signal. If no change, valve is stuck open mechanically.

### Valve Sticks Closed (NC valve not opening when energised)

**Symptoms:**
- Case warms; no refrigerant flow despite controller calling for cooling
- Suction pressure very low on affected section

**Causes and checks:**
1. No voltage at coil terminals — trace control circuit (see Step 2 above)
2. Open coil (OL resistance reading) — replace coil
3. Wrong voltage coil — 24 VAC coil on 120 VAC circuit burns out; 120 VAC coil on 24 VAC circuit is too weak to open
4. Plunger seized (corrosion or debris) — test with manual stem; if manual stem opens OK but coil doesn't, coil is likely failed; if manual stem also won't move, valve body is seized
5. Pilot-operated valve with insufficient pressure differential — confirm ≥ 5 psi differential across valve

### Chatter / Buzzing (usually 60 Hz hum, sometimes intermittent click)

**Causes:**
1. Low voltage at coil (below ~90% of rated) — magnetic pull force insufficient to hold plunger fully seated; test voltage at coil terminals
2. Loose coil retention nut — coil vibrates around valve body; tighten to finger-tight + 1/4 turn
3. Partial coil failure — one winding degraded; resistance slightly low; replace coil
4. Dirty/scored plunger — plunger can't seat fully; magnetic circuit is not completing

**Consequence:** Chattering coils burn out within days to weeks from heat and vibration — do not defer this repair.

### Coil Burn-Out

**Symptoms:** Plastic coil housing discoloured, melted, or cracked; smoke smell near valve; OL resistance reading; breaker/fuse tripping

**Causes:**
1. Wrong voltage coil installed (most common — 24 VAC coil on 120 VAC system)
2. Valve body seized — plunger couldn't move; coil ran continuously at full inrush current with no back-EMF reduction from mechanical motion
3. Low voltage causing coil to run at abnormally high current for extended period
4. Coil submerged in water or refrigerant — insulation breakdown

**After replacement:**
- Confirm correct voltage
- Test valve body with manual stem to confirm plunger moves freely before installing new coil
- Check retention nut torque

---

## CO₂-Rated Solenoid Valves

Standard brass solenoid valves are NOT rated for CO₂ pressures. CO₂ transcritical systems see up to 130 bar (1,885 psi) on the high side and 45+ bar on the low side. Use only CO₂-rated valves:

- **Sporlan W series** — forged steel body; CO₂ rated; most common on CO₂ hot gas defrost lines
- **Danfoss EVRA / EVRAT** — CO₂-rated normal-close solenoid; standard for CO₂ liquid feed circuits
- **Danfoss ICS / ICMTS** — pilot-operated for CO₂; requires CO₂-compatible pilot solenoid

**Never substitute a standard HFC solenoid for a CO₂-rated one — body will fail catastrophically at high pressure.**

---

## Troubleshooting Decision Tree

**No cooling on a case (suspected liquid line solenoid):**
1. Is the thermostat/controller calling? → Confirm controller output is active (LED, fault log)
2. Is there voltage at the coil? → Yes: proceed; No: trace control wiring
3. Is the coil resistance in range? → Yes: coil OK; No: replace coil
4. With coil energised, do you hear a click? → Yes: valve is operating electrically
5. Manual stem opens OK? → Yes: plunger moves; check for pressure differential issue
6. Still no flow with manual stem open? → Check liquid line valve position upstream; check for filter-drier restriction

**Case runs continuously without cycling off:**
1. Is the thermostat/controller calling? → Yes: thermostat not satisfied (case problem); No: proceed
2. Is there voltage at the coil when it should be off? → Yes: control wiring fault (shorted wire, stuck relay); No: proceed
3. Manual stem fully retracted? → No: technician left stem in — return to auto
4. Plunger click audible when coil de-energised? → No: plunger stuck; try manual stem; replace valve body if stem also won't seat

---

## Post-Repair Checklist
- [ ] Correct replacement coil voltage confirmed (check coil label AND system voltage)
- [ ] Manual stem returned to fully counter-clockwise (auto) position
- [ ] Retention nut snug (not over-torqued — can crack coil housing)
- [ ] Voltage at coil terminals verified within ±10% of rating
- [ ] Valve opens and closes audibly on command before buttoning up
- [ ] Pump-down test passed (suction drops to LPCO within expected time)
`

// ── A2L Refrigerants ─────────────────────────────────────────────────────────
export const A2L_REFRIGERANTS_KNOWLEDGE = `
## A2L Refrigerants — Field Guide for Canadian Technicians

![Refrigerant cylinder](https://upload.wikimedia.org/wikipedia/commons/e/ef/Freon_134a_refrigerant_for_car_AC_001.jpg "Refrigerant cylinders — colour coding varies by type; R-454B uses a teal cylinder, A2L refrigerants require leak-aware handling")

### What Are A2L Refrigerants?
ASHRAE 34 classifies refrigerants by toxicity (A = lower, B = higher) and flammability (1 = none, 2L = lower, 2 = flammable, 3 = highly flammable). **A2L = lower toxicity, mildly flammable** — this is the critical new class entering commercial refrigeration and HVAC.

A2L refrigerants have a **maximum burning velocity ≤ 10 cm/s** and a **lower flammability limit (LFL) ≥ 3.5%** by volume. For comparison, propane (A3) ignites at ~2.1% LFL with burning velocity >40 cm/s. A2Ls need a strong ignition source and will not sustain a flame easily.

| Refrigerant | Replaces | Primary Application | GWP | Flammability |
|---|---|---|---|---|
| **R-454B** (Opteon XL41) | R-410A | New HVAC/RTUs (2025+) | 466 | A2L |
| **R-454C** (Opteon XL20) | R-404A / R-448A | New commercial refrigeration | 148 | A2L |
| **R-32** | R-410A blend component | Mini-splits, some RTUs | 675 | A2L |
| **R-466A** | R-410A | RTUs (Trane/Carrier specific models) | 733 | A1 (non-flammable) |
| **R-452B** (Opteon XL55) | R-410A | High-capacity chillers | 676 | A2L |
| **R-290** (propane) | R-404A in small hermetic | Reach-in coolers, vending (<500g) | 3 | A3 |

### Canadian Regulatory Context
Canada's **HFC Phase-Down Regulations** (in force since 2019, updated 2021) cap HFC consumption based on CO₂-equivalent tonnes and follow the Kigali Amendment schedule. Key points:
- R-404A (GWP 3922) production/import quotas are declining annually — Canada aims for 85% reduction by 2036
- R-448A (GWP 1387) and R-449A (GWP 1397) are transition refrigerants, still available but also declining
- R-454C (GWP 148) is the long-term replacement for low-temperature commercial refrigeration equipment
- **Existing equipment can continue using HFCs** — phase-down affects new equipment manufacturing and bulk imports, not retrofit of existing systems

### Equipment Using A2L Refrigerants (New Equipment, 2025+)
- **2019-2024:** Transition refrigerants (R-448A, R-449A) phase in
- **2025:** All new HVAC RTUs use R-454B or R-466A
- **2025-2026:** New commercial refrigeration uses R-454C
- **2027+:** R-448A availability tightens significantly
- **2036:** 85% reduction target from 2011-2013 baseline

### Safety Requirements — What Changes in the Field

**Detection & Ventilation**
- A2L systems require **refrigerant leak detectors** (electrochemical or catalytic bead sensors) in machinery rooms and enclosed spaces per ASHRAE 15 and CSA B52
- A2L alarm setpoints: alert at 25% LFL, safety shutdown at 50% LFL
- Concentrations that cause flammability risk require significant accumulation (room must fill to >3.5% volume) — unlikely outdoors or in well-ventilated space
- Minimum ventilation per ASHRAE 15 Table 7.3 must be maintained in equipment rooms

**Tools & Equipment**
- All electrical tools used on A2L systems must be **spark-proof / intrinsically safe** if used in a potential leak environment
- **Manifold gauges and recovery equipment must be rated for the refrigerant** — check O-ring compatibility (some A2L blends have slightly different material requirements vs R-410A)
- No open flames or sparks within the refrigerant work area while charging or recovering
- Recovery cylinders: use dedicated A2L cylinders — do not mix with HFC recovery cylinders

**PPE**
- Same PPE as A1 HFCs: safety glasses, nitrile gloves
- A2L systems do not require SCBA or additional respiratory PPE for normal servicing
- In confined spaces: standard confined space entry procedures apply

### Service Procedures — Key Differences

**Charging (A2L)**
- **R-454B, R-454C, and R-32 are zeotropic blends or pure compounds** — charge in vapour phase to prevent fractionation (R-454B has slight glide; R-454C has larger glide ~7-8°C)
- R-454C glide: bubble point to dew point spread of ~7°C — **use dew point pressure** for superheat calculations (like R-448A/R-449A)
- Weighing in is preferred; charging by subcooling/superheat acceptable with dew point correction

**Recovery**
- Recover to same standards as HFCs — the A2L classification does not change recovery requirements under Canadian regulations
- Use recovery equipment rated for A2L (UL/CSA listed for flammable refrigerants)
- Recovered A2L refrigerant should be returned to a reclaimer — do not vent

**Leak Testing**
- Nitrogen pressure test procedure identical to HFCs
- Electronic leak detector must be rated for A2L refrigerants
- UV dye acceptable (check dye compatibility with specific refrigerant)

### Pressure-Temperature Reference

**R-454C (replacing R-404A / R-448A in commercial refrigeration)**
| Saturation Temp | Bubble Pressure | Dew Pressure |
|---|---|---|
| −40°C | 0.51 bar / 7.4 psi | 0.65 bar / 9.4 psi |
| −30°C | 0.89 bar / 12.9 psi | 1.11 bar / 16.1 psi |
| −20°C | 1.47 bar / 21.3 psi | 1.80 bar / 26.1 psi |
| −10°C | 2.31 bar / 33.5 psi | 2.79 bar / 40.5 psi |
| 0°C | 3.50 bar / 50.8 psi | 4.16 bar / 60.3 psi |
| +10°C | 5.12 bar / 74.3 psi | 6.02 bar / 87.3 psi |
| +25°C | 8.97 bar / 130 psi | 10.36 bar / 150 psi |
| +40°C | 14.69 bar / 213 psi | 16.65 bar / 241 psi |

*Note: Use dew point for suction superheat calculations. Use bubble point for liquid line subcooling.*

**R-454B (replacing R-410A in HVAC)**
| Saturation Temp | Pressure (dew) |
|---|---|
| −10°C | 6.2 bar / 90 psi |
| +5°C | 9.1 bar / 132 psi |
| +15°C | 11.8 bar / 171 psi |
| +40°C | 21.7 bar / 315 psi |
| +55°C | 30.4 bar / 441 psi |

### Retrofitting Existing Equipment to A2L
**R-454C is NOT a drop-in for R-404A or R-448A.** A2L refrigerants require:
- Equipment certification/listing for A2L use (leak-tight design, spark-proof electrical components)
- Existing equipment without A2L listing **cannot be legally retrofitted** — use R-448A or R-449A as the approved transition refrigerant for existing R-404A systems
- A2L refrigerants are for **new equipment only** until a specific equipment A2L retrofit certification is issued by the manufacturer

### Common Field Mistakes
1. **Using R-454C as a drop-in retrofit** — not approved for existing equipment
2. **Ignoring glide when setting superheat** — R-454C has ~7°C bubble-to-dew glide; using bubble pressure gives false low superheat reading
3. **Using old R-410A recovery equipment** — check A2L rating on recovery machine before use
4. **No leak detector installed in enclosed machinery room** — required by ASHRAE 15 / CSA B52 for A2L systems
5. **Mixing recovered A2L refrigerant** — keep recovered A2L separate from HFC recovery cylinders
`

// ── Tecumseh Compressors ──────────────────────────────────────────────────────
export const TECUMSEH_KNOWLEDGE = `
## Tecumseh Compressors — Field Service Guide

![Hermetic compressor terminal box detail](https://upload.wikimedia.org/wikipedia/commons/7/74/Hermetic_compressor_feedthrough.jpg "Hermetic compressor — Tecumseh AE and AJ series use this style of sealed construction")

### Product Families Overview

**Hermetic (welded — not field-serviceable internally):**
- **AE / AEA** — Small hermetic, R-404A / R-448A / R-134a LT/MT commercial
- **AJ / AJA** — Medium hermetic, HFC commercial refrigeration
- **TAJ** — High-efficiency hermetic (R-449A optimized)
- **TFH** — R-404A/R-448A hermetic, 1.5–5 HP range
- **AG / AGA** — R-134a medium-temperature hermetic
- **AWA** — R-22 legacy (phased out — for replacement reference only)
- **NE / NEK** — Small hermetic, beverage coolers / reach-in doors

**Semi-Hermetic (bolted — field-serviceable):**
- **RKA** — Reciprocating semi-hermetic, 3–15 HP rack applications
- **TSK** — Reciprocating semi-hermetic (parallel rack use)

**CO₂ Models:**
- **CAJ** — CO₂ hermetic (R-744), used in small secondary circuits

### Model Number Decode
**Example: AEA4460YXA**

| Position | Code | Meaning |
|---|---|---|
| 1–2 | AE | Family (AE = hermetic HFC) |
| 3 | A | Design variant (A = standard) |
| 4–7 | 4460 | Capacity code (BTU/hr at ARI conditions ÷ 100) |
| 8 | Y | Refrigerant: Y=R-404A, X=R-449A/R-448A, A=R-134a, C=R-22 |
| 9 | X | Voltage variant |
| 10 | A | Engineering revision |

*Tip: Capacity code 4460 = 4,460 BTU/hr at −10°F evap / 90°F condensing (standard ARI conditions for low-temp)*

### Voltage Configurations — Quick Reference
| Code | Voltage | Phase | Hz |
|---|---|---|---|
| A | 115V | 1PH | 60 |
| D | 208-230V | 1PH | 60 |
| E | 460V | 3PH | 60 |
| G | 208-230V | 3PH | 60 |
| Z | 200-230V/1PH + 208-230V/3PH | dual | 60 |

### Start Components — Identification & Testing

**Three start configurations exist on Tecumseh hermetics:**

**1. RSIR (Resistance Start, Induction Run) — start relay + start capacitor**
- Supply runs through overload protector to common terminal
- Run winding (C→R) and start winding (C→S) both energized at start
- Start relay coil in parallel with run winding; back-EMF opens the relay as motor speeds up
- **Test:** Start cap (µF within ±10% of label), relay coil resistance ~30–60Ω

**2. CSIR (Capacitor Start, Induction Run) — start relay + run capacitor**
- Larger motors (1/2 HP+). Run capacitor stays in circuit continuously.
- Test run cap: µF within ±5% of rating. Over-capacitance causes motor overheating.

**3. PSC (Permanent Split Capacitor) — run capacitor only, no relay**
- Most common on Tecumseh AE/AJ series. Single run capacitor.
- Run cap failure = motor hums, draws high amps, fails to start
- Test: µF within ±6% of nameplate. Typical: 10-25µF for small hermetics.

**Overload Protector:**
- External klixon (snap disc) on most Tecumseh hermeticss — clips on body near top
- Wired in series with common terminal. Open on high temperature or current.
- Test: continuity across klixon (open = tripped/failed). Allow 30 min cool-down before testing.
- Internal klixon on some AE/AJ series — embedded in windings, cannot be replaced

### Wiring Terminals — Identification

[diagram:compressor-terminals]

**Winding resistance test (motor at ambient temperature):**
- **C to R** = Run winding resistance (lowest reading)
- **C to S** = Start winding resistance (medium reading)
- **R to S** = Total (highest — sum of the two above)
- **Any terminal to ground** = ∞Ω; anything less indicates a grounded/failed motor

### Common Failure Modes & Diagnosis

| Symptom | Likely Cause | Test |
|---|---|---|
| Hums but won't start | Failed run/start cap or relay | Check cap µF, relay click |
| Trips overload repeatedly | Low voltage, high head pressure, grounded motor | Check volts, head press, winding resistance |
| Motor grounded | Liquid flood, acid burnout, mechanical failure | Megger test: <1MΩ = grounded |
| Locked rotor | Seized bearing or liquid slug | Locked rotor amps >> nameplate; listen for mechanical noise |
| Short cycling | Low differential pressure, low refrigerant, oversized thermostat | Check pressures and control diff setting |
| High amp draw, runs hot | High condensing temp, overcharge, non-condensables, low suction | Check subcooling, head pressure |
| Suction pressure won't pull down | TXV/EPR starving, refrigerant shortage, hot gas bypass stuck open | Check superheat, system charge |

### Suction Service Valve Procedures (Semi-Hermetics)
Semi-hermetic Tecumseh (RKA/TSK) have suction and discharge service valves.

- **Fully back-seated (CCW):** open to system, gauge port closed
- **Mid-position (cracked off back-seat):** open to system AND gauge port — normal service position
- **Fully front-seated (CW):** system closed, gauge port open — isolates compressor for service

**Warning:** Never run a compressor with the suction service valve front-seated — the compressor will be starved and fail immediately.

### Application Guide — Refrigerant Compatibility
| Tecumseh Series | Primary Refrigerant | Compatible Substitutes |
|---|---|---|
| AE/AEA | R-404A | R-448A, R-449A, R-407A |
| TAJ | R-449A optimized | R-448A, R-404A (lower eff.) |
| TFH | R-404A | R-448A, R-449A |
| AG/AGA | R-134a | R-513A (drop-in) |
| AJ | R-404A | R-448A |

**Oil type:** POE required for HFC models (R-404A, R-448A, R-449A). Viscosity per Tecumseh spec sheet — typically ISO 32 or ISO 68. **Do not mix mineral oil with POE.**

### Replacement Selection — Key Parameters
When replacing a failed Tecumseh compressor:
1. **Match refrigerant** — check original compressor label, not just system nameplate
2. **Match capacity** (BTU at operating conditions) — use Tecumseh selection software or BTU capacity tables
3. **Match voltage** — 208-230V vs. 115V is not interchangeable without rewiring
4. **Match connection sizes** — suction/discharge stub-outs vary between families
5. **Verify oil charge** — new compressors ship with POE oil charge; verify correct viscosity

### Common Field Mistakes
1. **Testing cap µF with cap still in circuit** — always discharge and isolate before testing
2. **Replacing the cap without testing the overload** — a failed cap can damage the motor windings; always check windings too
3. **Running with liquid in suction on restart** — pump-down any Tecumseh condensing unit that's been off for >24 hours before restarting
4. **Installing wrong oil** — Tecumseh HFC compressors require POE; mineral oil causes TXV ice plugs and compressor failure
5. **Over-tightening terminal cover** — O-ring seals the terminal cover; over-torquing cracks the ceramic terminal insulators
`

// ── Carel Controllers ─────────────────────────────────────────────────────────
export const CAREL_CONTROLLERS_KNOWLEDGE = `
## Carel Controllers — Field Service Guide

![Carel Industries logo](https://upload.wikimedia.org/wikipedia/commons/2/22/Carel_Industries_Logo.svg)

### Product Family Overview

| Family | Description |
|---|---|
| **IR33 Series** | Simple temperature controller for cases/walk-ins/condensing units. Variants: IR33F (full), IR33E (compact), IR33Z (EEV version) |
| **pCO5+** | Programmable micro-controller used in CO₂ racks (Hill Phoenix Advansor, Chill-Con), large condensing units |
| **pRack** | Pre-configured rack controller based on pCO5+ platform; purpose-built for HFC/CO₂ parallel rack management |
| **pStep / MX** | EEV stepper motor drivers. pStep = older RS485 driver; MX = newer CAN-bus driver, mounts on valve body |
| **pGD Touch** | 4.3" touchscreen display/interface for pCO5+ systems |
| **EVD Evolution** | Smart EEV driver with integrated superheat algorithm; standalone or connected to pCO/IR33 |

### IR33 Series — Quick Reference

**Physical Layout:**
The IR33 front panel has four buttons (SET, ▲, ▼, AUX/MAN), a main temperature display, a secondary setpoint/probe display, and four status LEDs: Compressor, Defrost, Alarm, and Aux/Fan.

**Key IR33 Parameters:**

| Parameter | Code | Typical Setting | Description |
|---|---|---|---|
| Set point | St | −2°C (MT) / −18°C (LT) | Control temperature target |
| Differential | rd | 2°C | Hysteresis above setpoint before compressor starts |
| Probe 1 type | /S1 | Pt100 or NTC | Match probe installed — wrong type = wildly wrong temp |
| Probe 2 type | /S2 | NTC or none | Second probe (defrost termination typically) |
| Defrost type | td | 0=electric, 1=off-cycle, 2=hot gas | Must match equipment |
| Defrost interval | di | 4-8 hrs | Time between defrosts |
| Defrost duration max | dL | 30-45 min | Safety maximum duration |
| Defrost end temp | dt | 8°C–12°C (MT) | Termination sensor setpoint |
| Drain time | dd | 3-5 min | Drip time after defrost before cooling resumes |
| Fan control | Fn | 0-2 | 0=always on, 1=off on defrost, 2=off on compressor |
| High temp alarm | AH | +5°C above setpoint | Relative to setpoint or absolute |
| Low temp alarm | AL | −10°C below setpoint | Absolute setting |
| Compressor min on | c0 | 2-5 min | Minimum run time before cycle off |
| Compressor min off | c4 | 3-5 min | Minimum off time (short-cycle protection) |

**Entering Parameters:**
1. Press and hold **SET** for 3 seconds → enter setpoint
2. Press **SET** again to confirm
3. To access full parameter menu: hold **SET + ▲** simultaneously for 5 seconds
4. Enter access code if prompted (default: 22 for installer level)
5. Navigate with **▲▼**, confirm with **SET**

**IR33 Error Codes:**
| Code | Meaning | Action |
|---|---|---|
| E1 | Probe 1 fault (open or short) | Check NTC/Pt100 probe and wiring |
| E2 | Probe 2 fault | Check defrost termination probe and wiring |
| E3 | EEPROM fault | Cycle power; if persists, replace controller |
| HA | High temperature alarm | Check defrost completion, door seals, load |
| LA | Low temperature alarm | Check refrigeration system, setpoints |
| dEF flashing | Defrost in progress | Normal operation |
| oFF | Controller output disabled | Check remote on/off input |

### pCO5+ Platform — Navigation & Diagnostics

The pCO5+ is a programmable controller — the user interface and parameters depend entirely on the application software loaded (e.g., Hill Phoenix Advansor software vs. Carel pRack software).

**Hardware identification:**
| Variant | Analog In | Analog Out | Digital In | Digital Out |
|---|---|---|---|---|
| SMALL | 9 | 5 | 14 | 7 |
| MEDIUM | 15 | 8 | 23 | 13 |
| LARGE | 22 | 12 | 34 | 16 |
| EXTRALARGE | 29 | 14 | 45 | 18 |

**pGD Touch Screen Navigation (standard across applications):**
- **Home** button: return to main status screen
- **Alarm** bell icon: active alarm list with timestamps
- **Prg/Param** icon: access parameter screens (requires password)
- **Service** button: I/O status screens — shows raw input/output values for diagnostics

**Forcing outputs for testing (pCO5+):**
On most Carel application software: enter Service mode → Digital Outputs → select output → force ON/OFF. This is how you test: EEV opening, solenoid valves, fans, defrost heaters without triggering full sequence.

**Parameter Backup / Restore:**
The pCO5+ has a USB port and/or SD card slot (depending on version). Application parameter files can be backed up using the pGD interface or Carel 1Tool software on a PC. Always back up parameters before replacing a controller board.

### pStep / MX EEV Drivers — Commissioning

**EEV Driver Wiring (pStep RS485):**
- Connected to pCO5+ or IR33Z via RS485 bus
- Motor terminals M1–M4 wire to EEV stepper coils
- Power: 12V DC from controller or separate supply
- Address DIP switches on pStep must match controller configuration

**MX (CAN-bus, newer systems):**
- Mounts directly on Carel EEV valve body
- CAN bus address set via rotary dip switch on MX unit
- Plug-and-play with Carel E2V/E3V valves
- LED on MX unit: green=OK, orange=alarm, red=fault

**EEV Commissioning Steps:**
1. In controller service menu, find "EEV Manual" or "Valve Test"
2. Move valve to fully closed (0 steps) — listen for stepper motor movement
3. Move to fully open — count steps to confirm valve range
4. Set control algorithm to SH (superheat) control mode
5. Target superheat: 5-8K for typical display cases
6. Allow 15 min stabilisation before adjusting — EEV control is slow by design

### pRack — HFC Parallel Rack Parameters

Key pRack parameters for HFC multiplex rack (refer to pRack application guide for full list):

| Screen | Parameter | Typical Value |
|---|---|---|
| Suction group 1 | Setpoint SP1 | −8°C to −12°C sat (MT) |
| Suction group 2 | Setpoint SP2 | −32°C to −38°C sat (LT) |
| Suction group 1 | Floating suction enable | Yes |
| Floating suction | Max float above SP | +4°C |
| Head pressure | Control mode | Floating |
| Head pressure | Setpoint | +35°C sat (floating down from +40°C) |
| Oil return | Megasuperheating enable | Yes (every 8 hrs) |
| Defrost | Global defrost enable | Yes / per zone |

### Common Carel Faults & Diagnosis

| Fault | Controller Display | Likely Cause |
|---|---|---|
| High superheat alarm | "SH HIGH" or EEV fault | Starved expansion valve, low charge, restricted liquid line |
| EEV driver lost comm | "EEV err" / driver LED red | RS485/CAN wiring, driver address conflict |
| Probe error E1/E2 | E1, E2 | Open probe, wrong probe type in parameter /S1 |
| Controller not powering | Blank display | 12V or 24V supply, check transformer |
| Parameter reset to default | All params at default after power loss | Battery flat (replace CR2450 coin cell on board) |
| Network comm fault | Network LED off or flinking | RS485 polarity, termination resistor, address conflict |

### Network Wiring Notes (RS485 / Modbus)
- Carel uses standard RS485 2-wire Modbus RTU
- Maximum 32 devices on one RS485 bus without repeater
- Termination: 120Ω resistor required at each physical end of the bus
- Polarity: A(+) and B(−) — reversing causes all devices to show offline
- Wire: shielded twisted pair (Belden 9842 or equivalent), shield grounded at ONE end only
- Max cable length at 9600 baud: ~1200m; at 19200 baud: ~600m
`

// ── Ice Machines ──────────────────────────────────────────────────────────────
export const ICE_MACHINES_KNOWLEDGE = `
## Ice Machines — Manitowoc & Hoshizaki Field Service Guide

![Manitowoc Q210 commercial ice machine](https://upload.wikimedia.org/wikipedia/commons/e/ef/Manitowoc_Q210_ice_machine.JPG "Manitowoc Q210 modular cube ice maker — representative of the machines covered in this guide")

### Ice Production Fundamentals

[diagram:ice-harvest-cycle]

Typical cycle times: freeze 12–25 min (varies with water/air temp and load), harvest 2–5 min, full cycle 14–30 min.

**Ice machine capacity ratings (AHRI standard):**
- Rated at 21°C (70°F) air, 21°C (70°F) inlet water — capacity drops significantly in summer
- Rule of thumb: **-10% capacity per 5°C above 21°C ambient**

---

### Manitowoc Ice Machines

### Indigo NXT Series — Diagnostics (Current Production)

**Diagnostic LED Blink Codes (Indigo NXT):**
The control board has three LEDs (Harvest, Freeze, Fault) that blink codes when a fault is active.

| LED Pattern | Fault | Probable Cause |
|---|---|---|
| Harvest blinks 1 | Harvest timeout | Ice didn't release; hot gas or water issue |
| Harvest blinks 2 | Freeze timeout | Long freeze; check water, refrigerant charge, evaporator |
| Harvest blinks 3 | High pressure cutout | Dirty condenser, failed fan, high ambient, overcharge |
| Fault blinks 1 | Water inlet fault | Float switch, water inlet valve |
| Fault blinks 2 | Bin full (ice level) | Ice backed up to sensor — normal, or sensor fouled |
| Fault blinks 3 | High current / motor fault | Fan motor, pump motor, or compressor winding issue |
| All LEDs solid | Control board fault | Replace board |

**Indigo NXT Service Mode:**
Hold **SELECT** button for 5 seconds to enter Service Mode. Options:
- Manual harvest initiation
- Sensor status display (water temperature, inlet valve status)
- Diagnostic log (last 10 fault codes with timestamps)

**Ice Thickness Sensor (Curtain/Bridge Sensor):**
- Manitowoc uses a **water curtain sensor** (float or optical bridge) between evaporator and bin
- Sensor triggers harvest when water curtain is broken by formed ice
- Common fault: scale buildup on sensor probe causes false triggers or delayed harvest
- Clean sensor with Manitowoc cleaner (citric acid based) every 6 months

### QD+ Series — Legacy Diagnostics

**QD+ Fault LED Sequence (older units):**
| LED Sequence | Fault |
|---|---|
| 3 blinks | Harvest timeout |
| 4 blinks | Freeze timeout |
| 5 blinks | High pressure |
| 6 blinks | Thermistor fault |
| 7 blinks | Water circuit fault |

### Manitowoc Preventive Maintenance Schedule

| Interval | Task |
|---|---|
| Every 6 months | Clean evaporator and bin with Manitowoc Scale Away + Sanitizer |
| Every 6 months | Clean/sanitize water system: dump reservoir, run cleaning cycle |
| Every 6 months | Clean condenser coil (air-cooled) or check water flow (water-cooled) |
| Annually | Check water inlet valve strainer |
| Annually | Inspect and lubricate water pump impeller |
| Annually | Verify ice thickness sensor operation |
| Annually | Check and adjust harvest water valve (dump valve) |

### Common Manitowoc Faults

| Problem | Cause | Fix |
|---|---|---|
| Long freeze cycle | Scale on evaporator, dirty condenser, low charge | Clean, check subcooling/superheat |
| Doesn't harvest | Failed harvest relay, hot gas solenoid stuck, low refrigerant | Check hot gas solenoid click on harvest signal |
| Small/hollow cubes | Low water flow, inlet valve partially closed, scale | Check inlet pressure (min 20 psi), clean strainer |
| Water overflow to bin | Faulty water inlet valve (not closing fully) | Replace water inlet valve |
| High pressure lockout | Dirty condenser, fan failure, ambient too high | Clean coil, check fan motor |
| Continuous freeze cycle | Bin thermostat faulty, ice backed up to sensor | Check bin full sensor, ice distribution |

---

### Hoshizaki Ice Machines

### KM Series — Diagnostic Overview

Hoshizaki takes a systematic **component testing** approach rather than blink codes. The KM series manual includes decision flowcharts for each symptom.

**Control Board Reset:**
1. Turn machine off
2. Wait 5 minutes
3. Turn back on — board clears faults after power cycle (no manual reset needed)

**Hoshizaki Harvest Detection:**
Unlike Manitowoc (water bridge), Hoshizaki uses a **thermistor on the evaporator** to detect when ice releases (evaporator temperature rises rapidly when hot gas removes ice).

**Key Hoshizaki Thermistors:**
| Thermistor | Location | Normal Range |
|---|---|---|
| TH1 | Suction line | Freeze: −10 to −15°C / Harvest: +4 to +8°C |
| TH2 | Evaporator plate | Freeze: −15 to −20°C / Harvest: starts harvest at +7°C |
| TH3 | Water inlet (some models) | Inlet water temperature |

**Reading Thermistor Values:**
On KM series: put machine in service mode (hold **SERVICE** switch on control board 3 sec). Temperature display scrolls through thermistor values.

### Hoshizaki Fault Codes (Newer KML / KMD Series)
| Code | Meaning |
|---|---|
| E1 | Freeze cycle extended (>60 min) — harvest not triggering |
| E2 | Harvest cycle extended (>20 min) — ice not releasing |
| E3 | Water circuit error — bin float or inlet issue |
| E5 | High pressure protection |
| E7 | Thermistor fault (TH1 or TH2 open/short) |
| E8 | Refrigerant shortage (both suction temp and head pressure out of range) |
| E9 | Fan motor fault |

### Common Hoshizaki Faults

| Problem | Likely Cause | Diagnostic Step |
|---|---|---|
| Small ice cubes (not full size) | Low refrigerant, dirty condenser | Check suction pressure (should be ~−10°C sat in freeze) |
| Machine runs but no ice | Water inlet valve not opening, inlet pressure low | Check 24V at inlet valve coil; min 20 psi inlet |
| Harvest cycle too long | Hot gas solenoid partially stuck, low refrigerant | Check TH2 — should hit +7°C within 4 min of harvest start |
| Ice has off taste / odour | Slime or algae in water system | Full cleaning/sanitizing cycle |
| Control board not powering | Transformer or fuse | Check 24V secondary; 5A fuse on board |
| Pump motor failure | Scale/lime buildup in pump | Remove and manually spin impeller; clean or replace |

### Cleaning & Sanitizing (Both Brands)

**Mandatory cleaning frequency:** Every 6 months minimum (NSF/ANSI 12 requirement).

1. Remove all ice from bin — do not use cleaning chemicals with ice present
2. Press CLEAN / wash button (or follow model-specific procedure)
3. Add manufacturer-approved ice machine cleaner to reservoir
4. Machine runs cleaning cycle (recirculates cleaner 20–30 min)
5. Rinse cycle — machine purges cleaner with fresh water
6. Add sanitizer (Manitowoc or Hoshizaki approved — typically quaternary ammonium)
7. Run sanitizer cycle
8. Machine returns to normal ice production
9. Discard first batch of ice after cleaning

**Water quality:** Scale buildup is the #1 cause of ice machine service calls. Water hardness >180 ppm (10 grains/gal) requires water treatment (scale inhibitor or softener). Check with customer on water quality history.

### Refrigerant Charging Reference (R-404A / R-448A)

| Application | Typical Suction (Freeze cycle) | Typical Head |
|---|---|---|
| Air-cooled, 21°C ambient | −7 to −12°C sat | +35 to +40°C sat |
| Air-cooled, 32°C ambient | −7 to −12°C sat | +42 to +48°C sat |
| Water-cooled | −7 to −12°C sat | +25 to +30°C sat |

Superheat at suction: 5-8K. Subcooling at liquid line: 4-8K. Flat charge curves — work from manufacturer's charging chart for the specific model.
`

// ── Ranco & Paragon Controls ──────────────────────────────────────────────────
export const RANCO_PARAGON_KNOWLEDGE = `
## Ranco & Paragon Controls — Legacy Equipment Service Guide


### Ranco Temperature Controls

Ranco thermostats are found on millions of older condensing units, walk-in coolers, and display cases across Canada. Although largely replaced by digital controllers (Penn A421, Dixell XR) in new equipment, field techs encounter Ranco controls on virtually every service call to older stores.

**Common Ranco Models:**
| Model | Application | Range | Differential |
|---|---|---|---|
| O12-183 | Walk-in cooler (cut-out) | −23 to +4°C | Fixed ~3°C |
| O16-149 | Condensing unit (dual) | −40 to +10°C | Adj. 2-8°C |
| A10-3936 | HFC condensing unit | −29 to +13°C | Adj. |
| ETC-111000 | Electronic replacement for O-series | −40 to +38°C | Adj. 0.5-15°C |
| C35-718 | Walk-in freezer | −40 to −7°C | Fixed ~4°C |

**O-Series Physical Layout:**
**Terminals:** 1 (COM), 2 (N/O cut-in), 3 (N/C cut-out) — SPDT switch; most cooling applications use COM and N/C (cut-out).

**For cooling control (compressor):** wire COM to one side of the compressor contactor coil, N/C to the power supply. Compressor energizes when temperature rises above setpoint.

**Setting Ranco Controls:**
- **Range dial:** sets the cut-out point (where compressor turns OFF as temperature drops to setpoint)
- **Differential dial:** sets how far temperature must rise above cut-out before compressor turns ON again
- Example: Range = −2°C (cut-out), Differential = 3°C → compressor turns on at +1°C, turns off at −2°C

**Common Ranco Faults:**
| Symptom | Cause | Test |
|---|---|---|
| Compressor won't stop | Contacts welded or sensing bulb fault | Check continuity across N/C terminal — should open when cold |
| Compressor won't start | Open contacts, broken capillary | Check for voltage drop across thermostat in call-for-cooling |
| Temperature out of range | Capillary bulb not seated in well | Ensure bulb is fully inserted and secured |
| Control drifts over time | Mechanical wear on bimetal | Recalibrate or replace — Ranco controls are not calibration-adjustable in the field |

**Replacement Equivalents:**
| Old Ranco | Digital Replacement | Notes |
|---|---|---|
| O12-183 | Penn A421ABD-02C | Direct wire-for-wire replacement |
| O16-149 | Penn A421 or Ranco ETC | Better differential control |
| C35-718 | Penn A421 (low range model) | Set for −18 to −22°C typical |

---

### Paragon Defrost Timers

Paragon timers are mechanical cam-based defrost timers found on virtually all older walk-ins, reach-ins, and condensing units. The **8145 and 8145-20** are the two most common models in Canadian commercial refrigeration.

**8145 vs 8145-20 — Key Difference:**
| Feature | 8145 | 8145-20 |
|---|---|---|
| Pins | Plastic pull-out pins | Pre-installed adjustable pins |
| Time scale | 24 hr, 96 positions | 24 hr, 96 positions |
| Each position | 15 minutes | 15 minutes |
| Max defrosts | Up to 8 per day | Up to 8 per day |
| Motor | 208/240V standard | 120V or 208/240V |

[diagram:paragon-timer]

The 8145 dial has 96 pins spaced 15 minutes apart. **Pull out** a pin to start a defrost at that time; **push in** a pin to end it. Example: pull at 2:00 AM, push at 2:30 AM = 30-minute defrost starting at 2:00 AM.

**Paragon 8145 Wiring:**
- **T1 (L1/Hot):** power input
- **T2 (Neutral):** neutral
- **T3 (Comp/Fan):** normal operation circuit — energized except during defrost (compressor contactor + fan motors)
- **T4 (Defrost):** defrost circuit — energized when defrost pins are active (heaters)

**Setting Defrost Schedule:**
1. Remove dial face (usually friction-fit or one screw)
2. Pull out pins at desired defrost start times (e.g., 2AM, 6AM, 10PM)
3. Push in pins at desired defrost end times (30 min later typical for MT, 45 min for LT)
4. Set clock by rotating dial to current time (arrow or pointer marker)
5. Replace dial face

**Common Paragon Timer Faults:**
| Symptom | Cause | Fix |
|---|---|---|
| Constant defrost (no cooling) | Pin stuck in "defrost" position, timer motor failed | Check pin positions, advance manually to end defrost, replace if motor dead |
| No defrost occurring | No pins set, or all pins pushed in | Check pin configuration |
| Defrost at wrong times | Clock not set correctly, or timer slipping | Reset time; check motor for slow run (worn gears) |
| Compressor won't run | T3 terminal not connected properly, or failed timer contact | Check voltage at T3 in normal mode |
| Timer runs fast/slow | Motor gears worn, or wrong voltage (120V motor on 208V) | Replace timer motor or whole timer |

**Setting the Clock Time:**
On 8145: rotate the outer dial ring (not the pin ring) to align the **arrow** with the current time on the inner scale. The motor drives the pin ring clockwise — time advances automatically.

**Replacement:**
Paragon 8145 is still manufactured. Direct compatible alternatives:
- Paragon 8145-20 (pin design difference only)
- Grasslin/Tempatron FM1 series (direct pin-for-pin compatible)
- Intermatic T-100 (compatible wiring, different pin style)

---

### Intermatic T-100 Series
Similar to Paragon — mechanical cam timer for HVAC/refrigeration defrost duty.
- T100 uses **sliding trippers** instead of pull-out pins
- Tripper setting: slide marker to defrost start and end positions
- Wiring identical to Paragon 8145 (terminals 1-4)
- T100M = motor operated; T100S = manual advance only
`

// ── Anti-Sweat Heater Controls ────────────────────────────────────────────────
export const ANTI_SWEAT_HEATER_KNOWLEDGE = `
## Anti-Sweat Heater Controls — Energy Management & Service


### What Are Anti-Sweat Heaters?

Display case glass doors and mullion (frame) heaters maintain the door frame and glass edge temperature above the **dew point** of store air to prevent condensation and frost. Without ASH:
- Moisture condenses on door frames and glass edges
- Frame gaskets deteriorate rapidly
- Customer experience suffers (foggy, frosty doors)
- Electrical hazards from water intrusion

**ASH Energy Impact:**
- Open multi-deck cases: 10–20W per linear foot of frame
- Glass door reach-in cases: 25–60W per door
- Coffin case front rail: 15–30W per linear foot
- **Total in a typical 5,000 sq ft grocery: 8–15 kW continuous = 70,000–130,000 kWh/year**

Humidity-based smart control reduces this by 30–60% by only running heaters when dew point conditions require it.

### Types of Anti-Sweat Heater Control

**1. Always-On (No Control)**
- Heaters energized continuously at full power
- Simplest, most reliable — but highest energy cost
- Found on older stores and budget equipment

**2. Thermostat-Controlled (Temperature Only)**
- Simple on/off thermostat cuts heaters when store is cold
- Typically set at ~16°C store air temperature threshold
- Improvement over always-on but ignores humidity

**3. Humidity-Based (Dew Point Control) — Recommended**
- Measures store air **relative humidity (RH)** and **dry-bulb temperature**
- Calculates dew point of store air
- Turns heaters off when dew point is well below door frame temperature
- Most energy efficient; ENERGY STAR certification typically requires this

| Store Conditions | Approximate Dew Point |
|---|---|
| 22°C, 50% RH | ≈ 11°C |
| 22°C, 70% RH | ≈ 16°C |
| 22°C, 90% RH | ≈ 20°C |

If door frame temperature stays above the dew point, heaters are not needed. Turn them on when dew point approaches frame temperature.

### Emerson E2 Anti-Sweat Heater Control

**E2 ASH Setup (requires MultiFlex RCB board or dedicated ASH board):**

Navigation path: *Home → Circuit Setup → ASH Control Setup*

| Parameter | Setting | Description |
|---|---|---|
| ASH Enable | Yes | Activates humidity-based control |
| Humidity Sensor Input | AI channel # | Where the store humidity probe connects |
| Temperature Sensor Input | AI channel # | Store air temperature probe |
| Heater On Setpoint | 65% RH (typical) | Turn on heaters when RH exceeds this |
| Heater Off Setpoint | 55% RH (typical) | Turn off when RH drops below this (hysteresis) |
| Night setback enable | Yes | Reduce setpoints during closed-store hours |
| Night setback offset | −10% RH | Lower RH threshold overnight (less traffic/humidity) |
| Force on override | No | Manual override for humid days |

**ASH Humidity Probe (E2):**
- Typically Emerson 027-0073 or compatible RH transmitter
- Output: 4-20mA or 0-10VDC (set E2 input type accordingly)
- Probe location: return air side of HVAC unit or at refrigeration case level
- Avoid placing near case doors or supply air diffusers (gives false readings)

### Hussmann DASH ASH Control

In DASH-equipped stores, ASH is managed through the rack controller:

The DASH ASH screen shows each zone's name, current status (ON/OFF), and the measured RH at that zone. Store-wide RH, calculated dew point, and the on/off RH thresholds (typically off <55%, on >60%) are shown at the bottom.

### Wiring — Typical ASH Circuit

120V supply feeds an ASH relay (coil powered by 24V AC from the controller). The relay output feeds all door heaters wired in parallel — if one heater fails, the others continue running. Each door frame typically has two mullion heater strips (left and right) totalling 25–50W per door at 120V or 208/240V. Always verify the heater voltage rating matches the supply.

### Heater Resistance Testing

Each heater element can be tested with a multimeter in ohms mode (circuit de-energized):

Expected resistance = V² ÷ W. Examples: a 120V/30W element = 480Ω; a 240V/30W element = 1920Ω; a 120V/50W element = 288Ω.

- **Open circuit (∞Ω):** broken heater wire — replace element
- **Short circuit (<50Ω):** failed insulation — check for moisture ingress
- **High resistance (+20% above calculated):** element deteriorating

### Common ASH Faults

| Symptom | Cause | Action |
|---|---|---|
| Condensation on door frames (heaters always off) | Humidity sensor failed, setpoint too low, heater relay stuck open | Check RH sensor output, verify relay energization |
| Excessive frost/sweating despite heaters running | Heater element failed (open circuit), wrong voltage, door gasket bypassing heater | Test each element for resistance; check case door gaskets |
| High energy bill (heaters never turn off) | Humidity sensor failed high, controller in override, relay contacts welded | Check controller output; replace relay if stuck on |
| Uneven condensation across case | Some elements burned out, one zone relay failed | Test elements section by section |
| Moisture in mullion / electrical smell | Element insulation failure — fire hazard | De-energize immediately, replace heater strip |

### Maintenance Schedule

| Interval | Task |
|---|---|
| Monthly | Verify humidity sensor reading against a handheld RH meter |
| Every 6 months | Test each heater element resistance (compare to calculated expected) |
| Annually | Clean humidity sensor element (dust buildup causes low RH readings) |
| Annually | Verify ASH relay contacts (check for welded contacts on high-load zones) |
| Annually | Inspect heater wiring in mullions for insulation degradation |
`

// ── Embraco / Secop Compressors ───────────────────────────────────────────────
export const EMBRACO_SECOP_KNOWLEDGE = `
## Embraco & Secop Compressors — Field Service Guide

![Embraco hermetic compressor](https://upload.wikimedia.org/wikipedia/commons/f/fa/Embraco_compressor.jpg "Embraco (Nidec) hermetic compressor — used in reach-in coolers, display case doors, and beverage merchandisers")

### Company Background
- **Embraco** (now Nidec Global Appliance): Brazilian manufacturer, historically the dominant supplier of small hermetic compressors for commercial refrigeration, beverage merchandisers, reach-in coolers, and display case doors. Widely used in commercial applications up to ~1.5 HP.
- **Secop** (formerly Danfoss Compressors, then BD/SC series): Danish manufacturer producing small hermetic compressors. Now independent. Very common in refrigerated transport, portable coolers, and small commercial reach-in applications.

### Product Families

**Embraco Model Families:**
| Series | Application | HP Range | Refrigerants |
|---|---|---|---|
| NE / NEK | Light commercial (MT) | 1/8 – 1/3 HP | R-134a, R-290 |
| NJ / NJB | Medium commercial (MT/LT) | 1/4 – 1/2 HP | R-404A, R-134a |
| EMX | Efficiency variable speed | 1/4 – 1 HP | R-290, R-600a |
| NT | High efficiency (MT) | 1/3 – 3/4 HP | R-134a, R-290 |
| FFI / FFIAP | LT commercial | 1/3 – 1 HP | R-404A, R-448A |
| VGZE | Inverter-driven variable speed | 1/4 – 1 HP | R-290 |

**Secop (formerly Danfoss) Model Families:**
| Series | Application | HP Range | Refrigerants |
|---|---|---|---|
| SC | Light commercial | 1/8 – 1/2 HP | R-134a, R-600a |
| BD | Low voltage DC/variable speed | 1/8 – 1/4 HP | R-134a, R-290 |
| SY | Medium commercial | 1/4 – 3/4 HP | R-404A, R-134a |
| HBP/LBP (GS/GS34) | Commercial refrigeration | 1/3 – 3/4 HP | R-404A, R-448A |

### Model Number Identification

**Embraco example: FFII12HBK**
| Position | Code | Meaning |
|---|---|---|
| FF | Family | FF = commercial HFC low-temp |
| I | Generation | I = first generation |
| 12 | Capacity | BTU/hr at ARI-540 conditions |
| H | Refrigerant | H=R-404A, T=R-134a, E=R-290 |
| B | Voltage | B=208-230/1/60 |
| K | Lubricant | K=polyolester POE |

**Secop example: SC15CX.2**
| Position | Code | Meaning |
|---|---|---|
| SC | Family | SC = standard commercial |
| 15 | Displacement | cc |
| C | Refrigerant | C=R-134a, GX=R-404A |
| .2 | Variant | higher number = higher EER |

### Start Components — Embraco/Secop

Most small Embraco and Secop compressors use one of:

**1. PTC Starter (Positive Temperature Coefficient device)**
- Plugs onto the S (start) terminal — replaces traditional start relay
- At room temperature: low resistance (~10–30Ω), allowing start winding current
- As current passes, PTC heats up → resistance goes high, disconnecting the start winding
- Self-resetting, no moving parts — must cool down ~3–5 min before another start attempt

**Testing PTC:** Cold resistance: 10–30Ω (check datasheet). Hot (after running): >10kΩ. Failed PTC: either open (∞Ω cold) or shorted (stays low resistance when hot).

**2. Electronic Relay (Embraco ASIC / EMS Relay)**
Some larger Embraco models use an electronic starting relay module that replaces PTC + capacitor.

**3. PSC (Run Capacitor Only)**
Larger Embraco FFI / NJ series — same as standard PSC compressors.

### Wiring and Terminal Layout

[diagram:compressor-terminals]

**Typical winding resistance (small Embraco NE/NJ):**
- C to R: 5–15Ω (run winding — lowest)
- C to S: 10–30Ω (start winding — middle)
- R to S: 15–40Ω (total — highest)
- Any terminal to ground: ∞Ω (anything less = grounded motor)

### Replacement Selection

Embraco and Secop compressors are **replace, not repair** — hermetic welded casing means no internal service access.

**Selection Criteria (in priority order):**
1. **Refrigerant** — must match (R-134a, R-404A, R-448A, R-290 — not interchangeable)
2. **Displacement** (cc) or capacity (BTU/hr at application conditions) — ±10% acceptable
3. **Voltage** — 115V vs 208-230V vs 12/24V DC (Secop BD) — not interchangeable
4. **Oil type** — POE for HFC models, mineral for R-12/R-22 legacy (confirm with datasheet)
5. **Connection stub-out size** — 1/4" vs 5/16" process tube; suction/discharge sizes
6. **Physical footprint** — mounting bolt pattern and height clearance

**Cross-reference resources:**
- Embraco online cross-reference tool: embraco.com → Product Selector
- Secop compressor selection: secop.com → Products → Selection Tool
- Tecumseh/Embraco/Secop are largely interchangeable by BTU and refrigerant at same voltage

### Common Failure Modes

| Symptom | Cause | Test |
|---|---|---|
| Hums but won't start, trips overload | Failed PTC or capacitor | Check PTC cold resistance (should be 10-30Ω); check cap µF |
| Won't start after short off-cycle | PTC still hot from last start (3-5 min minimum off-time needed) | Wait 5 min and retry |
| Runs hot, high amp draw | Dirty condenser, high ambient, overcharge | Check head pressure, condenser cleanliness |
| Motor grounded | Liquid slug, acid burnout, moisture ingress | Meg test; if <1MΩ to ground, replace compressor |
| Oil in system / burnout odour | Mechanical failure, acid burnout | Acid test liquid line; full system flush required |
| Compressor short-cycles | Low charge, oversized, thermostat differential too tight | Check pressures and charge |

### Oil Requirements
| Refrigerant | Required Oil | Viscosity |
|---|---|---|
| R-134a | POE | ISO 32 |
| R-404A | POE | ISO 32 or ISO 68 |
| R-448A | POE | ISO 32 or ISO 68 |
| R-290 (propane) | POE or alkylbenzene | ISO 15 |
| R-600a (isobutane) | Mineral or alkylbenzene | ISO 15 |

**Warning:** R-290 and R-600a systems are A3 (highly flammable) — charge size limits per EN 378 / CSA B52 apply. These are typically factory-sealed systems; field charging requires special procedures.
`

// ── Zero Zone Display Cases ───────────────────────────────────────────────────
export const ZERO_ZONE_KNOWLEDGE = `
## Zero Zone Display Cases — Field Service Guide

![Open multi-deck supermarket display cases](https://upload.wikimedia.org/wikipedia/commons/a/af/Cold_Storage_Cabinets.jpg "Open multi-deck refrigerated display cases — Zero Zone Series 20/26/30/40 cases are installed in configurations like this")

### Company Overview
Zero Zone (headquartered in North Prairie, Wisconsin) manufactures open and closed multi-deck refrigerated display cases widely used in US and Canadian supermarkets. Major retail chains using Zero Zone equipment include Kroger, Safeway/Sobeys affiliates, and regional independents. Zero Zone was acquired by Daikin in 2020.

### Product Family Overview

**Multi-Deck (Open):** Series 20 (MT produce/dairy/deli), Series 26 (enhanced MT), Series 30 (LT frozen 2-3 tier), Series 40 (MT top / LT bottom)

**Glass Door (Closed):** Series TM (tall multi-tier frozen), Series PM (produce/deli 1-2 tier)

**Coffin Cases:** Series 38 (standard LT), Series 48 (wide coffin, dual zone)

**Specialty:** Series FG (floral/greenhouse glass door)

### Case Identification — Name Plate Information
Zero Zone name plate is typically located inside the case end cap (lift the merchandising end panel). Contains:
- Model and series number
- Refrigerant (R-404A, R-448A, or R-134a for produce cases)
- Defrost type code: **E** = electric, **HG** = hot gas, **OC** = off-cycle
- Coil face area and number of fans
- Heater wattage per section

### Controllers Used on Zero Zone Cases

**Standard configuration: Dixell XR Series**
- Open multi-deck: Dixell XR30C or XR40C (see Dixell topic for full parameter guide)
- Glass door: Dixell XR70C or XR77C (with display output for shelf lighting)
- LT coffin: Dixell XR20C

**Alternate controllers (some chains):**
- Carel IR33 (produced for Daikin/Zero Zone post-2020 models)
- Emerson CPC CC-100 or MultiFlex CCB (in E2/E3 store controller environments)

**Key parameter differences for Zero Zone vs. generic Dixell:**
| Parameter | Zero Zone MT Multi-Deck | Zero Zone LT Coffin |
|---|---|---|
| Control setpoint (r0) | −2°C to −4°C | −18°C to −22°C |
| Defrost type (td) | 0 = electric or 2 = hot gas | 0 = electric |
| Defrost end temp (d8) | +8°C to +10°C | +13°C to +15°C |
| Defrost interval (d3) | 4–6 hrs | 3–4 hrs (LT cases need more frequent) |
| Fan operation mode (F2) | 0 = always on (open multi-deck) | 1 = fans off during defrost |
| Anti-sweat heater (A6) | 1 = enabled (glass door only) | N/A |

### Defrost System Details

**Electric Defrost (most LT cases):**
Heater elements are embedded in the coil fins and wired in series with a thermal limiter: auto-reset at ~+65°C; a manual-reset backup trips at ~+82°C. Total heater wattage is 750–1500W per 4 ft section (check nameplate).

**Hot Gas Defrost (Series 20/26 open multi-deck):**
- Hot gas supplied from rack to case defrost header
- Solenoid valve: typically Sporlan SEH or Danfoss EVR series
- Defrost termination: coil thermistor (Dixell d8 parameter, typically +8°C)
- Time-out termination backup: 30-45 min (Dixell dL parameter)

### Fan Motor Specifications

Zero Zone uses both shaded pole and EC (electronically commutated) fan motors:

| Case Series | Motor Type | Speed | Replacement |
|---|---|---|---|
| Series 20 (older) | Shaded pole, 1-phase | 1550 RPM, 115V | Zero Zone P/N or equivalent by dimensions |
| Series 26 (post-2015) | EC motor (brushless) | Variable | EC motor by blade diameter + CFM |
| Series 30 LT | Shaded pole | 1050 RPM | Match HP, RPM, blade pitch |
| Series TM (glass door) | Brushless DC | Variable | Replace with matching EC motor |

**EC Motor Notes:**
EC motors on Zero Zone cases are typically powered by 277V AC (US commercial lighting voltage) — confirm voltage before testing! EC motors fail silently (no noise) — check for 0 RPM with correct voltage applied before condemning motor.

### Anti-Sweat Heaters — Zero Zone Specific

Zero Zone glass door cases use door frame heaters controlled by either:
1. **Simple thermostat** (older units): ON/OFF based on ambient temp
2. **Dixell XR77C** with humidity input (newer units)
3. **External ASH controller** wired to case heater circuit

Door frame heater locations:
NiCr heater wire is embedded in the mullion frame between the glass and the store side. Typical ratings: mullion heater 25–40W each, bottom frame heater 15–25W per linear foot, top header heater 20–30W.

### Common Zero Zone Faults

| Fault | Symptom | Likely Cause | Action |
|---|---|---|---|
| Poor temperature pull-down | Case won't reach setpoint, fans running | Low refrigerant, hot gas solenoid stuck open, blocked coil | Check superheat/subcooling; check HG solenoid de-energized in cooling mode |
| Coil iced up (not defrosting) | Ice visible on coil end, poor airflow | Defrost timer not calling, heater failed, drain frozen | Check controller defrost output; test heater elements |
| Moisture/dripping from case | Defrost drain clogged, drain pan heater failed | Scale/debris in drain; check drain heater continuity | Clean drain; test drain heater resistance |
| Fan not running (EC motor) | Case not cooling well, no visible fan rotation | EC motor failed, control board output fault, wrong voltage | Verify voltage to motor; replace if motor dead |
| Temperature high alarm | Door gasket worn, high store ambient, heavy load | Check door seal; verify HVAC in store | Replace gasket; check store temps |
| Dixell E1 or E2 error | Controller shows E1 or E2 | Probe failure or wrong probe type setting | Replace probe; verify /S1 type in parameters |
`

// ── True Manufacturing ────────────────────────────────────────────────────────
export const TRUE_MANUFACTURING_KNOWLEDGE = `
## True Manufacturing — Walk-In & Reach-In Service Guide

![Commercial glass-door reach-in display refrigerators](https://upload.wikimedia.org/wikipedia/commons/3/36/ExpensiveRefrigerators.JPG "Commercial glass-door reach-in coolers — True GDM and T-series are common in deli, dairy, and beverage applications")

### Company Overview
True Manufacturing (Springfield, Missouri) is one of North America's largest manufacturers of commercial refrigeration equipment. Their equipment is common in delis, bakeries, convenience stores, and supermarket backrooms. True focuses on reach-in display coolers/freezers, pass-through cases, and back-of-house walk-in systems.

### Product Family Overview

**Reach-In:** T-xx solid door (T-19, T-35, T-49, T-72), GDM-xx glass door merchandisers, TUC-xx undercounter, TSSU-xx sandwich/prep, T-23F reach-in freezer

**Walk-In:** THWD (heated wire door), TOAM (outdoor), custom built-to-order

**Display Cases:** TDBD-xx island coffin (produce/deli), THD-xx horizontal display

### Compressor & Refrigeration System

True uses a **condensing unit mounted on top** of the cabinet (reach-in) or a separate remote condensing unit (walk-in). Key feature: True often uses a **top-mounted, self-contained condensing unit** design rather than remote racks.

**Typical compressor brands in True equipment:**
- Tecumseh AE/AEA series (most common — see Tecumseh topic)
- Embraco NJ/NE series (medium commercial)
- Copeland ZB scroll (larger units and some newer models)
- Unit cooler: True-proprietary or Heatcraft/Bohn equivalent coil

**Refrigerant:** R-134a (MT models), R-404A / R-448A (LT models). Check name plate — True has been transitioning MT models to R-290 (propane) in some markets.

### Electrical System — True-Specific Wiring Notes

True uses a **non-standard wiring layout** that surprises techs used to other brands. Key differences:

True uses a **master thermostat** that controls the compressor contactor, with a separate **defrost timer** for the defrost cycle. Fans and defrost heaters are wired in parallel on the L1 bus. Unlike rack-connected cases, True reach-ins are self-contained — there is no rack controller or store supervisory integration.

**Defrost Timer Location:** In True reach-ins, the defrost timer is located in the **electrical control box** mounted above the compressor deck (top of unit, right side typically). Access by removing the top grille panel.

**Fan Switch (Important True Feature):**
True reach-in models have a **fan delay switch** or **fan speed controller** near the evaporator. The evaporator fans switch from HIGH speed (cooling mode) to LOW speed (when door is opened, on some models). Verify fan switch operation when diagnosing airflow issues.

### Defrost Systems

**Electric Defrost (standard on LT models — T-23F, T-49F etc.):**
- Glass door freezers: electric defrost heaters embedded in evaporator coil + door frame heaters
- Defrost timer: Paragon or Grasslin mechanical timer (see Ranco/Paragon topic) OR solid-state electronic timer
- Termination: bi-metal thermostat on evaporator (typically opens at +10°C, manual reset)
- Defrost frequency: 2-4 times per day standard

**Door Heaters (Glass Door Models):**
True glass door freezers have **door frame wire heaters** around each door opening. These prevent frost formation on door frames. Unlike ASH-controlled systems in large display cases, True door heaters are typically always-on or thermostat-only controlled.

Each door has two heater wires (left and right frame) controlled by a simple switch or thermostat, typically 40–60W per door. To test: disconnect and measure resistance (expected = V² ÷ W). **Most common failure point:** broken wire at the door hinge flex point.

### Temperature Control

**Standard True thermostat (older units):**
- Ranco A10 or O12 series (see Ranco/Paragon topic)
- Capillary sensing tube runs to evaporator inlet
- Differential: ~2-3°C fixed on older mechanical models
- Setpoint: adjusted via screwdriver-slot on control body

**True digital thermostat (newer units, post-2010):**
- True-branded digital controller (Dixell or Carel OEM)
- Single probe, simple on/off with adjustable differential
- Parameter access: hold SET 5 seconds (or consult True manual for specific model)

### Condenser Maintenance — Common True Issue

True top-mounted condensing units have the condenser coil **immediately above the compressor** with a single condenser fan pulling air through from the back. The condenser is **notoriously easy to neglect** because it's hidden under the top grille.

Air enters at floor level, passes up through the machine compartment, through the condenser coil, and exits through the top grille. The floor-level intake draws in dust, food particles, and debris — clean condenser coils **every 90 days** in commercial kitchen environments.

**Condenser cleaning:** Remove top grille (usually 2-4 screws), vacuum or brush coil from discharge side, blow through with compressed air. Check for compressor discharge temperatures >80°C which indicate dirty condenser.

### Common True Manufacturing Faults

| Fault | Symptom | Likely Cause | Diagnosis |
|---|---|---|---|
| High temperature alarm | Box temp rising, compressor running but warm | Dirty condenser, low refrigerant, door gasket failure | Clean condenser first; check pressures; inspect gaskets |
| Compressor won't start | Box warm, no compressor hum | Failed PTC, tripped overload, wiring fault | Check compressor terminals, test PTC cold resistance |
| Frost/ice buildup | Visible ice on evaporator, poor airflow | Defrost timer not working, termination bi-metal open | Check defrost timer output; test bi-metal thermostat |
| Door condensation (freezer) | Frost around door frame | Door heater wire failed | Test heater resistance at door frame; check at hinge |
| Evaporator fan not running | Warm box despite compressor running | Fan motor failed, fan delay switch fault | Test voltage at fan motor; check fan switch |
| Drain overflow | Water in bottom of unit | Drain clogged (drain hole at evaporator pan) | Clear drain with hot water; check drain heater (if equipped) |
| Short cycling | Compressor on/off rapidly | Low refrigerant, thermostat differential too tight | Check pressures; adjust thermostat differential |

### Walk-In Systems (True THWD Series)

True walk-in coolers/freezers use a remote unit cooler in the box connected to a condensing unit. Key features:
- **THWD series** has a **heated wire door** (wire runs through door frame gasket to prevent freezing)
- Unit cooler: True-branded (Heatcraft/Bohn equivalent specifications)
- Condensing unit: typically Copeland scroll or Tecumseh hermetic
- Controls: Ranco or digital thermostat for temperature; Paragon or electronic timer for defrost
- Drain: floor drain inside box (freezer) or drain pan (cooler) — ensure proper pitch to drain
`

// ── Bakery Proofer-Retarders ──────────────────────────────────────────────────
export const PROOFER_RETARDER_KNOWLEDGE = `
## Bakery Proofer-Retarders — Wabash & Hobart PW/RPW Service Guide

![Industrial bakery proofing cabinet](https://upload.wikimedia.org/wikipedia/commons/4/4d/Bread_proofing_cabinet.jpg "Combination proofer-retarder cabinets hold dough at controlled temperature and humidity before baking")

### What a Proofer-Retarder Does

A proofer-retarder is a dual-purpose cabinet built into in-store and commissary bakeries. It runs in two opposing modes from the same enclosure:

- **Proof mode (heat + humidity):** Holds dough at roughly 35–43°C (95–110°F) with high relative humidity (80–95%) so yeast activity finishes the rise before baking. Heating elements and a water/steam system create the warm, moist environment.
- **Retard mode (refrigeration):** Holds shaped dough at roughly 1–7°C (34–45°F) to slow fermentation overnight or over a weekend, then automatically (or on a timed schedule) transitions into proof mode so product is ready to bake on a set schedule.

Because both a heating/humidity system and a refrigeration system live in the same cabinet and share one control board, most service calls come down to figuring out which system — heat side or refrigeration side — is misbehaving, and whether the fault is in the control logic, the contactor/relay hardware, or the load itself.

### Manufacturer Background

This equipment is most commonly seen badged as **Wabash** or **Hobart Bakery Systems** (Orting, Washington), and is built and supported today under **ITW Food Equipment Group**, which also owns the **Hobart / Hobart Baxter** (Troy, Ohio) brand. Don't be surprised to find overlapping nameplates and manuals — the same physical cabinet has been sold and documented under more than one of these names depending on the era and the channel it was sold through. When pulling a manual, search by all of: Wabash, Hobart, Hobart Baxter, ITW Food Equipment Group, and the model/ML number on the nameplate.

### Model Number Decode

Nameplate model numbers follow a pattern that tells you the cabinet configuration before you even open the door:

- **PW** — Proofer (heat/humidity only, no refrigeration deck)
- **RPW** — Retarder-Proofer (combination unit with both refrigeration and heat/humidity systems)
- **Number (1S, 2S, 3S, 2E…)** — cabinet width/door configuration; a **2** generally indicates a double-wide cabinet with two compartments and two air ducts, a **1** a single-wide
- **Suffix letters (e.g., S, E, SEFAAR)** — voltage, options, and factory configuration code; cross-reference the full suffix string against the manual's nameplate decode table for the exact electrical and accessory configuration

A nameplate reading **RPW2S** therefore decodes as a double-wide retarder-proofer combination cabinet — exactly the kind of unit covered by the "UNITS 2 WIDE W/ 2 AIR DUCTS" wiring schematic family (Hobart Bakery Systems print 01-101697-00002).

Also record from the nameplate: ML number, serial number, refrigerant type and charge, maximum evaporator pressure, voltage/phase, full-load amperage per leg, and heater wattage — you will need all of these to order parts and to safely verify the electrical system.

### Refrigeration System

The retarder side is a self-contained mechanical refrigeration system, similar in principle to a reach-in cooler but built to also tolerate the heat cycle running in the same airspace:

- **Refrigerant:** Most commonly **R-404A**, charge typically in the 4–6 lb range — always confirm against the nameplate, as later production may use an A1 replacement blend
- **Compressor:** Hermetic, sized for the cabinet volume; mounted in a machine compartment isolated from the conditioned space
- **Condenser:** Air-cooled, with its own fan motor — treat condenser cleaning the same as any self-contained reach-in (see True Manufacturing topic): floor-level intakes in bakery environments load up fast with flour dust, which insulates the coil and drives high head pressure
- **Evaporator / unit cooler:** Mounted in the cabinet ceiling or rear wall, with its own fan(s) to circulate air across the product
- **Maximum evaporator pressure:** Stamped on the nameplate (commonly around 300 PSIG for R-404A applications) — this is a design limit for the low side components, not an operating target; use it to sanity-check gauge readings and to confirm you're charged with the correct refrigerant

During retard mode, the compressor, condenser fan, and evaporator fan cycle under the control board's command exactly like a standard walk-in or reach-in system. During proof mode the refrigeration system is normally locked out entirely — which is why unexpected compressor operation alongside heater operation is the first sign something in the mode-switching logic (or the relay hardware underneath it) isn't doing what the board thinks it's doing.

### Heat & Humidity System — How It's Wired

The heat side of an RPW cabinet is built from a small number of repeating elements per duct/compartment:

- **Heating elements:** Resistive elements (commonly rated around 2200W each at 240V), wired in pairs per circuit and protected by their own fuses (commonly 25A) ahead of the relay contacts
- **Heat relays (HR1, HR2 on the schematic):** One relay per heating circuit/compartment. The relay **coil** is a low-voltage circuit driven directly by the control board (PCB1) — when the board calls for heat, it energizes the coil, and the board's onboard LED for that output lights to show the command was issued
- **Heat relay contacts:** A separate, electrically isolated set of contacts on the same relay switches the actual 240V line voltage to the heater elements (commonly drawn on the print as the A1 to B2/B3 contact path). This is the load side — it carries real current to the heating elements and is completely separate from the LED/coil circuit
- **Fan relays (FR1, FR2, FR3):** Drive the air duct fan motors that circulate hot, humid air across the product during proof mode and distribute conditioned air during retard mode
- **Water solenoid (WS1):** Admits water to a steam-generating element or atomizer to maintain humidity during proof mode — a common source of "low humidity" complaints when it sticks closed or scales up
- **HI-LIMIT switches:** Manual-reset, fixed-setpoint thermal safety switches wired in series with the heater circuit. They open on an over-temperature condition regardless of what the control board is doing, and must be manually reset (usually a small red button on the switch body) once the cabinet has cooled
- **Safety relay (SR1):** A supervisory relay that the control board and/or HI-LIMIT string uses to remove power from the heat circuit on a fault condition — treat it as part of the safety chain, not just a convenience relay

### PCB1 Control Board

PCB1 is the brain of the cabinet — it reads the cabinet's temperature/humidity sensors, runs the proof/retard schedule (including any "ready by" time-of-day scheduling features), and drives every relay coil described above (heat relays, fan relays, water solenoid, and the refrigeration contactor). Each output the board commands typically has a corresponding status LED on the board face, which is the fastest way to see what the board *thinks* it's doing.

**Critical concept for diagnosis:** the LED only reports the **coil-side command** — it tells you the board energized (or didn't energize) the relay coil. It tells you nothing about whether the **load-side contacts** actually opened or closed in response. A relay can receive no coil signal (LED off) and still pass current through its load contacts if those contacts are mechanically stuck or welded closed. This single fact explains the majority of "the board says it's off, but the load is still running" service calls on this equipment — not just on the heat side, but on fan and refrigeration outputs too.

### Diagnosing Heaters That Run During Retarder Mode

This is one of the more common — and more confusing — complaints on RPW cabinets, because the symptom looks like a control board problem but is usually a hardware problem downstream of the board.

**Symptom:** Compressor is running (cabinet correctly in retard mode), the heat-relay LED on PCB1 is **off** (board is not commanding heat), but amp clamp on the heater circuit reads current (e.g., ~7A) — the elements are clearly energized.

**What this tells you:** Since the LED is off, PCB1 is not energizing the HR coil. Since the elements are still drawing current, 240V is reaching them anyway. The only way both of those things can be true at once is if the **load-side contacts of the heat relay are closed independent of the coil** — in other words, the contacts are welded or mechanically stuck closed. This is a very well-known failure mode for relays that switch resistive heating loads over thousands of cycles: the high inrush current of a cold resistive element causes contact arcing and pitting every time the relay closes, and over years of service the contact faces can fuse together in the closed position.

**How to confirm it (do this with the cabinet in retard mode, heat call should be inactive):**

1. **Check the coil side first.** With the heat-relay LED off, measure the control voltage at the relay coil terminals. You should read **no voltage** (or only a tiny bleed voltage) — confirming the board genuinely isn't calling for heat.
2. **Then check the load side.** With the meter still in hand, measure across the relay's load contacts (or directly at the heater element terminals) for line voltage, and confirm current draw on the heater circuit with a clamp meter. If you measure **240V present and current flowing** to the elements while the coil reads no voltage, the contacts are stuck/welded closed — the relay itself has failed mechanically, and the control board is not at fault.

**Why this matters beyond the inconvenience:** running the heating elements continuously while the compressor is also running means the refrigeration system is fighting a heat load it was never designed to handle during retard mode. Expect high amp draw, long compressor run times, elevated cabinet temperatures (which can put dough food-safety into question), and accelerated wear on the compressor from the extra load. Don't treat this as "it'll sort itself out" — it's an active safety and product-quality issue.

**Recommended repair:** Replace the failed heat relay (and, as good practice, its counterpart on the other heating circuit — if one relay has reached end-of-life from years of identical duty cycles, the other is usually not far behind). After replacement, re-run the same two-step voltage check in both proof and retard mode to confirm the coil and load sides now track together, and verify the HI-LIMIT switches are not tripped (they may have been activated by the excess heat and need a manual reset).

### Common Faults

| Fault | Symptom | Likely Cause | Diagnosis |
|---|---|---|---|
| Heaters run during retard mode | Compressor on, heat-relay LED off, current present at elements | Welded/stuck heat relay contacts | Compare coil-side vs. load-side voltage on the suspect relay; replace relay if contacts stay closed with no coil signal |
| No heat in proof mode | Cabinet won't reach proof temperature, heat-relay LED is on | Open heater element, blown element fuse, failed relay coil/contacts in the open direction, tripped HI-LIMIT | Check fuse continuity, measure element resistance, confirm relay closes when LED is lit, check/reset HI-LIMIT |
| Low humidity in proof mode | Dough surface dries out, slow or uneven proof | Water solenoid (WS1) stuck closed, scaled steam element, low water supply pressure | Check for water delivery when solenoid is energized; descale steam-generating element; verify inlet water supply |
| HI-LIMIT keeps tripping | Heat cycles shut down, manual-reset button popped | Airflow restriction (duct fan failure), stuck-closed heat relay overheating the compartment, sensor drift on PCB1 | Verify duct fan operation first (airflow loss is the most common trigger); rule out a stuck relay before assuming the switch itself is bad |
| Compressor short-cycling or running long in retard mode | High amp draw, box not pulling down | Stuck heat relay adding heat load, dirty condenser, low charge, door seal leak | Rule out a stuck-closed heat relay first (it mimics low charge by keeping the box from pulling down); then check condenser and charge |
| Cabinet won't switch modes on schedule | Stuck in proof or retard regardless of programmed schedule | PCB1 schedule/clock fault, failed mode-select relay, sensor fault feeding bad data to the board | Verify board's clock/schedule settings; confirm board is issuing the mode-change command (LEDs) before suspecting the board itself |
| Uneven proofing across cabinet | One side/duct proofs faster than the other | Failed fan relay (FR1/FR2/FR3) or duct fan motor on one side | Confirm each duct fan runs when its relay is commanded; check fan motor winding resistance if it doesn't |

### Maintenance & Service Tips

- **Condenser and airflow:** Bakery environments are dusty with flour and load condensers and filters faster than a typical backroom. Inspect and clean on a tighter interval than you would for a standard reach-in.
- **Relay inspection on PM visits:** Because the welded-contact failure mode is so common on this equipment, it's worth proactively checking coil-vs-load voltage agreement on the heat relays during scheduled PM visits — catching a relay that's starting to stick (intermittent agreement) before it fails fully saves an emergency call and protects the compressor from the extra runtime.
- **HI-LIMIT switches are manual-reset by design:** If you find one tripped, don't just reset it and walk away — find out *why* it tripped. Resetting a HI-LIMIT without finding the root cause (stuck relay, failed fan, sensor fault) just delays the next nuisance trip or, worse, masks a real overheat condition.
- **Document the suffix code:** The full suffix string on the nameplate (e.g., SEFAAR) encodes voltage and factory options that affect which wiring print and parts list apply. Record it whenever you open a ticket — it saves time when ordering parts or pulling the correct schematic later.
- **Cross-reference brand names when searching for documentation:** Because this line has been sold and supported under Wabash, Hobart, Hobart Baxter, and ITW Food Equipment Group branding at different times, search all of those names (plus the model and ML numbers) when looking for a manual or wiring print — the right document may be filed under a brand name other than the one on your nameplate.
`

// ── Commissioning Checklists ──────────────────────────────────────────────────
export const COMMISSIONING_KNOWLEDGE = `
## System Commissioning & Startup Checklists


### Pre-Startup Safety Checklist (All Systems)
Before energizing any refrigeration system for the first time:

- Electrical:
- Verify all disconnects are open (off) before connecting power
- Verify voltage at supply panel matches equipment nameplate (208/240/460/600V)
- Check phase rotation on 3-phase equipment (compressors and fans)
Phase rotation tester or rotation indicator on compressor drive
- Verify all terminal lugs are tight (check after first 24-hour run too)
- Verify grounding conductor connected
- Verify all control wiring complete and per wiring diagram

- Mechanical:
- All refrigerant piping brazes visually inspected
- All service valves confirmed in correct position (back-seated / open)
- All access panels and covers installed
- Compressor crankcase oil level verified (semi-hermeticss only)
- All vibration isolators installed (compressors, piping)

- Refrigerant Circuit:
- System pressure-tested with dry nitrogen (no refrigerant during pressure test)
- Leak test completed — see procedure below
- System evacuated to <500 microns (200 microns recommended)
- Correct refrigerant identified and cylinders on site

### Nitrogen Pressure Test Procedure

Step 1: Isolate the system
Close compressor suction and discharge service valves (front-seated).
All solenoid valves in open position (energize coils manually or use
manual stem).

Step 2: Pressurize with dry nitrogen
LT systems (R-404A / R-448A): test to 28 bar / 400 psi
MT systems: test to 21 bar / 300 psi
CO₂ systems: test per manufacturer specification (typically 60-80 bar)
HVAC/RTU refrigerant side: 21 bar / 300 psi (R-410A / R-454B)

Step 3: Initial pressure soak
Hold at test pressure for minimum 30 minutes with no pressure loss.
Temperature changes cause pressure variation — compensate for temp change:
+1 psi per +1°F ambient rise is normal (thermal effect only).

Step 4: Leak detection
Spray all braze joints, flare fittings, valve connections with Leak-Tec or
similar leak detection solution (or use electronic leak detector).
Pay attention to: evaporator coil headers, brazes behind insulation, valve bodies.

Step 5: Repair and re-test
Any leak found: repair with nitrogen purge while brazing.
Re-test to full pressure after ALL repairs.
Final: 30-minute hold with zero pressure loss.

### Evacuation Procedure

- Connect micron gauge to dedicated port (not manifold gauge port — manifold gauges
restrict vacuum and give false readings)
- Evacuate from BOTH high and low side simultaneously for faster evacuation
- Use 2-stage vacuum pump, >6 CFM capacity for commercial systems
- Change vacuum pump oil before every evacuation if pump has been used recently
- Target: <500 microns (200 microns preferred — better moisture removal)

Triple evacuation for superior moisture removal:
1. Pull to 2000 microns
2. Break vacuum with dry nitrogen to 2 psi
3. Pull to 1000 microns
4. Break with nitrogen to 2 psi
5. Final pull to 200-500 microns
6. Isolate pump and hold: vacuum should RISE no faster than 200 microns/min
(if faster: moisture still in system, or small leak)

---

### HFC Parallel Rack — Initial Startup

PRE-START CHECKS:
- Suction group configurations verified in rack controller
- Setpoints entered: suction SP, head pressure SP, safety lockout pressures
- All case solenoids: verify open (liquid line solenoids energized / open during startup)
- Hot gas bypass valve (if equipped): verify closed
- Oil level in sight glass: verify at 1/2 to 2/3 level (semi-hermeticss only)
- Crankcase heaters: confirm energized for minimum 4 hours before initial start
Purpose: drives refrigerant out of compressor oil before first start
Skipping this = liquid slug on first start = compressor failure

INITIAL START SEQUENCE:
1. Start with ONE compressor only. Do not start all compressors simultaneously.
2. Monitor suction pressure: should drop toward setpoint within 5-10 min
3. Monitor discharge pressure: should rise to stable condensing pressure
4. Monitor oil level sight glass for first 30 min — oil should return to crankcase
5. Add remaining compressors one at a time as load demands
6. Allow system to pull down for 2-4 hours before setting final setpoints

FIRST-START CHARGING PROCEDURE:
- Add refrigerant in liquid phase to liquid line (king valve open, add through
gauge port or Schrader valve)
- Avoid adding vapour to suction — risk of diluting oil in crankcase
- Charge until suction superheat reaches target (5-10K) at design conditions
- Verify subcooling at liquid line: 5-10K minimum
- Check oil separator sight glass — should show clear or slight foam during running
- Verify each case is receiving refrigerant: check supply and return temperatures

**Rack Setpoint Commissioning Guide:**
| Parameter | Low-Temp Setting | Medium-Temp Setting |
|---|---|---|
| Suction setpoint | −35 to −38°C sat (R-448A) | −8 to −12°C sat |
| Low pressure safety (LPCO) | −50°C sat / 0.1 bar | −25°C sat / 0.5 bar |
| Head pressure setpoint | +35 to +38°C sat (floating) | +35 to +38°C sat |
| High pressure safety (HPCO) | +55°C sat / 28 bar (R-448A) | +55°C sat / 28 bar |
| Oil failure time delay | 45-90 seconds | 45-90 seconds |
| Anti-short-cycle timer | 3-5 min | 3-5 min |

---

### CO₂ Transcritical Booster — Initial Startup

CO₂ startup requires specific precautions due to high operating pressures.

CRITICAL SAFETY CHECKS BEFORE CO₂ STARTUP:
- CO₂ leak detector installed and operational (alarm tested)
- All personnel briefed on CO₂ IDLH (50,000 ppm / 5%) and evacuation procedure
- Ventilation in machinery room confirmed operational
- Emergency shutoff / dump system functional (where installed)
- All CO₂-rated components confirmed (PRVs set, piping rated for >100 bar service)

PRE-CHARGE PRESSURE TEST (CO₂-specific):
- High side (gas cooler loop): test to 90 bar (1305 psi) with nitrogen
- Low side (LT loop): test to 55 bar (800 psi) with nitrogen
- Verify all HP relief valves (PRVs) are installed and set correctly
Typical: HP PRV set at 130-140 bar; secondary PRV at 120 bar

CO₂ INITIAL CHARGE:
- CO₂ charge must be added in LIQUID phase (from bottom dip tube cylinder)
- Target: flash tank at ~35-40 bar during initial charge
- Do NOT overcharge — flash tank level control must be visible before adding more
- Check compressor oil levels after first hour of operation — CO₂ migration
during off period is more aggressive than HFC

FIRST-START SEQUENCE:
1. Energize rack controller — verify all inputs reading correctly
2. Start gas cooler fans manually — verify operation and phase rotation
3. Start MT compressors (main compressors) first at minimum capacity
4. Allow gas cooler to establish head pressure: target 80-90 bar transcritical
5. Open MT expansion valves to cases gradually
6. Start LT (booster) compressors — monitor flash tank level
7. Open LT expansion valves — monitor LT suction pressure
8. Allow full pull-down: 4-8 hours typical for a supermarket

---

### Walk-In Cooler / Freezer — Initial Startup

PRE-START CHECKS:
- Unit cooler mounting confirmed — adequate clearance per manufacturer spec
- Drain line pitched toward drain (min 1:50 slope)
- Drain line insulated (freezer drains must be heat-traced or insulated to prevent freezing)
- Door gaskets seated properly on all doors
- Floor heater (freezer) energized — allow 24 hours before initial freeze-down
Purpose: prevents floor heater cable from being encased in ice
- Crankcase heater energized minimum 4 hours before start (remote condensing unit)
- Thermostat and defrost timer set to initial values

INITIAL STARTUP:
1. Verify suction and discharge service valves open (back-seated)
2. Start condensing unit — monitor for abnormal noises (liquid slugging = gurgling/banging)
3. Monitor pull-down: box temperature should drop at 2-5°C/hr initially, then faster
4. For freezer: expect 8-24 hours to reach −18 to −22°C setpoint from +20°C ambient
5. Verify defrost cycles function correctly (initiation and termination)
6. Check superheat: target 5-8K at unit cooler outlet
7. Verify fan motor rotation — wrong rotation gives significantly less airflow

DEFROST SETUP (Initial):
- Set defrost start times: avoid peak trading hours
- MT cooler: 2-3 defrosts per day, 20-30 min duration
- LT freezer: 3-4 defrosts per day, 30-45 min duration
- Verify drip time: 3-5 min after heater shuts off before fans restart
- Verify drain is running freely: inspect after first defrost cycle

TEMPERATURE LOG — Pull-Down Record:
Document the following every 2 hours during initial pull-down:
- Box air temperature (supply and return)
- Suction pressure and saturation temperature
- Discharge pressure and saturation temperature
- Superheat
- Subcooling (at liquid line)
This becomes the baseline commissioning record for warranty and future service.

### Post-Startup Verification Checklist (24 Hours After Initial Start)

- All setpoints verified in final position
- Temperature log reviewed — pull-down completed to setpoint
- All defrost cycles verified (observed one full defrost and re-freeze)
- Refrigerant charge confirmed: superheat 5-8K, subcooling 5-10K
- All electrical connections re-torqued (heat cycling loosens terminals)
- No active alarms on any controller
- Oil level sight glass: oil visible in glass at running condition
- Condensate drain flowing freely (no backup)
- All case and cooler temperatures within ±2°C of setpoint
- Customer/owner walked through controller operation and alarm response
- Startup documentation signed off and filed (copy left with equipment)
`

export const PLATE_HEAT_EXCHANGER_KNOWLEDGE = `
## Brazed Plate Heat Exchangers — SWEP & Alfa Laval


### What a BPHE Is and Where You Find One on a Rack

A brazed plate heat exchanger (BPHE) is a stack of corrugated stainless-steel channel plates vacuum-brazed together with copper (or nickel) filler at every contact point. The brazing forms two sets of interleaved channels, so two fluids exchange heat through thin plates with very high efficiency — no gaskets, no frame, a fraction of the size of a shell-and-tube.

On a supermarket rack you'll typically find BPHEs working as:
- **Subcoolers / economizers** — liquid line on one side, expanded refrigerant or medium-temp suction on the other, boosting liquid subcooling and system capacity (this is the duty of the SWEP and Alfa Laval units cataloged on Rack A and Rack B)
- **Desuperheaters / heat reclaim** — discharge gas heating a water loop for HVAC reheat or domestic hot water
- **Oil coolers** — discharge oil cooled against liquid refrigerant or glycol
- **Water-cooled condensers / cascade condensers** — including CO₂ subcritical cascade heat exchangers
- **Glycol/secondary loop chillers** — refrigerant evaporating against a pumped glycol loop feeding cases

### Manufacturer Lines You'll Encounter

**SWEP** (plate part numbers like 8402722131 / 8402722140 / 8402722142 on Rack A/B, 8402120432, and the U-Pressure series):
- Pressure classes M, H, S, and **U ("Ultra-High")** — the U-Pressure line is rated for transcritical CO₂ duty (PED-evaluated per EN 13345, working pressures into the 140 bar / 2000+ psi range)
- Double-wall variants (e.g. B16DW) use two plates between fluids with a vented gap, so an internal failure leaks visibly to the outside instead of cross-contaminating — required for potable water heat reclaim
- Approvals: PED (Europe), UL (North America), KHK (Japan)

**Alfa Laval**:
- **CB series** (CB30, CB110 with CBH/CBP high-pressure variants) — copper-brazed general refrigerant duty
- **AXP series** (AXP10, AXP27, AXP52, AXP112) — high-pressure line built for **transcritical CO₂** economizer/gas-cooler duty
- **AC/ACH series** (AC16/ACH16) — refrigerant evaporator/condenser duty

Model numbers encode plate size; the number of plates (NoP) sets capacity. The nameplate lists design pressure, test pressure, and volume per channel — always check the nameplate rating against system design pressure, especially when a unit sits on the high side of a CO₂ booster system.

### Installation Practices

- Mount **vertically** with connections pointing in the orientation shown on the label (evaporator duty: refrigerant in at the bottom, out at the top, to keep the channels wetted and return oil)
- Pipe **counter-flow** — the two fluids should travel in opposite directions for the best approach temperature
- Fit a **strainer/filter (≤1 mm mesh)** on the inlet of any fluid that can carry debris — channel passages are small and plug easily
- Support the piping, not the exchanger — BPHE connections are not designed to carry pipe weight
- When brazing connections: wrap the unit in wet rags and direct the flame away from the plate pack; overheating the first plate can melt internal brazing
- Insulate cold-duty units and provide a drip tray — they sweat like any cold surface

### Freeze Protection

The number one BPHE killer in glycol and water duty is **freezing**. Ice expansion deforms and splits the channel plates internally.
- Never run an evaporator BPHE below freezing without adequate antifreeze concentration — verify glycol percentage with a refractometer at PM
- Interlock the chiller so refrigerant flow stops on loss of water/glycol flow (flow switch proven, pump interlock)
- Low water-side flow + normal refrigerant flow = local freezing even when the loop "isn't cold"

### Troubleshooting

| Symptom | Likely Cause | Action |
|---|---|---|
| Approach temperature creeping up over months | Fouling/scale on water side, oil logging on refrigerant side | CIP (clean-in-place) flush water side; check oil return on refrigerant side |
| Subcooler delivering less subcooling than design | Low refrigerant flow, plugged inlet strainer, flash gas at inlet | Verify strainer, check liquid line sight glass upstream |
| Refrigerant found in water/glycol loop | Internal plate failure (freeze damage, corrosion, fatigue) | BPHE is not repairable — replace; find and fix the root cause first |
| Pressure drop across exchanger rising | Debris plugging channels | Backflush; install/clean inlet strainer |
| External weeping at plate pack edge | Brazing fatigue from pressure/thermal cycling, chloride corrosion | Replace unit; check for excessive cycling and water chemistry |

**Cleaning:** circulate a weak acid descaler (per manufacturer guidance) through the water side opposite to normal flow direction, then neutralize and rinse. Never rod or mechanically clean — the channels are inaccessible.

### Replacement Notes

- Match port size, plate count (NoP), and pressure class — a same-footprint unit with fewer plates will not deliver design capacity
- For CO₂ duty, only use units rated for the actual design pressure of that location in the system (high side vs. flash tank vs. MT suction differ enormously)
- Record the nameplate model and serial in the Components Directory and link the manufacturer datasheet
`

export const RELIEF_VALVE_KNOWLEDGE = `
## Pressure Relief Valves on Refrigeration Systems


### Why Relief Valves Exist

Every refrigerant-containing vessel that can be isolated — receivers, flash tanks, suction accumulators, oil separators, shell heat exchangers — must be protected against overpressure by a relief device sized and set per **CSA B52** (Canada) / **ASHRAE 15**. A hydrostatically locked or fire-exposed vessel without relief protection becomes a bomb. Relief valves are the last line of defence after controls (HPCO) have failed.

Brands commonly cataloged on our racks: **Farris** (spring-loaded ASME relief valves), **Superior**, and **LESER** (common on European-built CO₂ racks).

### How They Work

A spring holds the seat closed until vessel pressure reaches **set pressure**; the valve then opens proportionally, relieving vapour until pressure drops below reseat pressure (blowdown). Key nameplate data:
- **Set pressure** — must not exceed the design pressure (MAWP) of the protected vessel
- **Capacity** (lb/min of air or refrigerant) — must meet or exceed the code-required capacity for the vessel size
- **CRN / ASME UV stamp** — registration for the jurisdiction

CO₂ systems use the same principle at much higher settings (flash tank reliefs typically 45–60 bar, high-side reliefs 90–120 bar) and often relieve to atmosphere through dedicated vent headers; a discharging CO₂ relief can ice up and roar — treat a vented machine room as an asphyxiation hazard and ventilate before entry.

### Installation Rules (B52 / ASHRAE 15 Basics)

- Relief discharge must terminate **outdoors**, away from doors, windows, and air intakes, pointed so discharge cannot impinge on people
- **Vent line sizing matters**: undersized or excessively long vent piping raises built-up back pressure and reduces valve capacity — follow the valve manufacturer's equivalent-length tables
- **Three-way (dual) relief manifolds**: two relief valves on a transfer valve so one is always in service; the changeover stem lets you replace one valve without pumping out the vessel. The transfer valve must never be able to isolate both valves at once
- No isolation valve may be installed between the vessel and its relief device (other than the code-permitted three-way transfer valve)
- Install valves vertically, vapour space connection, with drip protection so the vent line cannot trap water/oil on the seat

### Service & Replacement Rules

- **Replace after any discharge event.** Once a relief valve has lifted, the seat is considered compromised — it will weep. Do not reuse
- **Never gag, cap, or plug** a weeping relief valve — replace it and fix the overpressure cause
- B52 practice: inspect relief valves at least annually; many jurisdictions and insurers require **replacement every 5 years** (check the date tag) or proof of bench recertification
- When replacing: match set pressure, capacity, inlet/outlet size, and CRN. Tag with installation date
- On dual-manifold setups, swing the transfer valve fully to the in-service side — mid-position throttles both valves

### Signs of Trouble

| Observation | Meaning | Action |
|---|---|---|
| Oil staining or frost at relief vent outlet | Valve has lifted or is seeping | Replace valve; investigate what drove pressure up |
| Vent line corroded/blocked (mud daubers, ice) | Valve capacity compromised | Clear and screen the outlet; repair piping |
| Relief set pressure below current system design (after refrigerant conversion) | Wrong valve for application | Re-evaluate relief sizing for the new refrigerant/condition |
| No date tag, unknown age | Out of inspection program | Replace and tag |

### After a Relief Event — Checklist

1. Ventilate the space and confirm it's safe to enter (especially CO₂)
2. Identify the cause: fire, hydrostatic lock (liquid-full vessel isolated and warmed), condenser/gas-cooler fan failure, HPCO failure, overcharge
3. Replace the discharged relief valve (both, if a dual manifold and you can't prove which lifted)
4. Verify HPCO and other safeties function before restart
5. Record the event, the cause, and the new valve details in the store's service history
`

export const PRESSURE_SWITCH_KNOWLEDGE = `
## Pressure Switches & Gauges — HPCO, LPCO & Safety Controls


### Roles on the Rack

Mechanical pressure switches are the hard-wired safety layer that backs up the electronic controller:
- **HPCO (high-pressure cutout)** — opens the compressor control circuit on excessive discharge pressure. Safety-critical, usually **manual reset** so a tripped compressor stays off until a tech investigates
- **LPCO (low-pressure cutout)** — protects against deep vacuum operation / loss of charge; often auto-reset
- **Oil differential pressure switch** — proves net oil pressure on semi-hermetics
- **Fan cycling switches** — stage condenser fans on head pressure (auto-reset, wide differential)

Brands in our catalog: **Ashcroft** (A-Series snap-action switches), **Sensata** (PS80-2X series hermetic pressure switches), and **Winters Instruments** (gauges, gauge/switch combos, and transducer-style senders).

### How to Read the Nameplate

- **Range** — the span the setpoint can be adjusted across (e.g. 100–500 psi)
- **Differential (deadband)** — the gap between trip and reset. Fixed on some models, adjustable on others. An HPCO with a 50 psi differential set to open at 400 psi recloses at 350 psi
- **Proof pressure** — maximum pressure the switch can survive without damage; size so normal trips never approach it
- **Contact form** — SPST open-on-rise (HPCO duty) vs. close-on-rise (fan cycling); pilot-duty contact ratings (e.g. 120/240 VAC, amps) must match the control circuit
- Sensata PS80-style switches are **hermetic, factory-set, non-adjustable** — you replace, not recalibrate. Ashcroft A-Series are field-adjustable under the cover

### Typical Settings (verify against system design before adjusting)

| Application | Trip | Notes |
|---|---|---|
| HPCO, R-448A/R-449A MT rack | ≈ 400–425 psig, manual reset | Below relief valve setting with comfortable margin |
| HPCO, R-744 (CO₂) MT/LT | Per rack design — far higher; use CO₂-rated switches only | Electronic HP transducers + mechanical backup |
| LPCO, MT suction | Cut-out just above vacuum for the design SST | Auto-reset with anti-short-cycle in controller |
| Condenser fan cycling | Stage on/off around target head pressure | Wide differential prevents short cycling |

The mechanical HPCO must always be set **below** the relief valve setting and **above** the electronic controller's high-pressure alarm/unload point — controller acts first, switch second, relief valve last.

### Testing an HPCO Safely

1. Identify the switch's sensing point and confirm with a calibrated gauge on the same port (Winters gauge accuracy class matters — a worn 3½" utility gauge is not a reference)
2. With the controller in a supervised test mode, force the condenser/gas-cooler fans off to let discharge pressure climb **while watching a calibrated gauge**
3. Verify the switch opens at its setpoint ±10%, and that the compressor actually drops out
4. Restore fans, let pressure fall, and confirm manual-reset behaviour (it should NOT auto-restart)
5. Never test by front-seating the discharge service valve against a running compressor with no relief path

### Common Faults

| Symptom | Cause | Fix |
|---|---|---|
| Trips well below setpoint | Drifted spring, vibration-damaged mechanism | Replace (hermetic types) or recalibrate against a reference gauge |
| Never trips in test | Stuck/welded contacts, plugged capillary or pulsation snubber | Replace switch; never bypass and leave it |
| Capillary line frosted or oily | Cap tube leak — switch is now a refrigerant leak | Replace switch and recover properly |
| Nuisance trips after pump-down changes | Differential too narrow for new operating envelope | Reselect switch range/differential |
| Gauge needle flutter, switch chatter | Discharge pulsation | Add a snubber/dampener fitting; check valve plate condition |

**Wiring note:** safety switches belong **in series** in the compressor pilot circuit (the "safety string") so any one device opening stops the compressor. When a controller digital input is also used, the hard-wired string still must be capable of stopping the machine on its own.

### Gauges (Winters & Similar)

- Use refrigeration-type gauges with the correct refrigerant temperature scale, liquid-filled where vibration is present
- A gauge that reads zero at atmosphere and tracks a calibrated reference within its accuracy class stays; anything else gets replaced — bad panel gauges cause bad diagnosis
- Transducer-style senders (4–20 mA / 0–5 V) feeding the rack controller should be cross-checked annually against a calibrated gauge at the same port
`

export const GAS_COOLER_KNOWLEDGE = `
## CO₂ Gas Coolers & Adiabatic Cooling Systems


### What a Gas Cooler Does

Above CO₂'s critical point (31.1°C / 87.8°F, 73.8 bar), discharge gas doesn't condense — it just cools as a dense supercritical fluid. The **gas cooler** replaces the condenser in a transcritical CO₂ system: a fan-driven air coil that rejects heat and delivers the coolest possible CO₂ to the high-pressure control valve.

Why exit temperature matters so much: every degree of approach you lose costs real capacity and efficiency. The high-pressure valve's optimum pressure is computed from **gas cooler exit temperature** — a dirty coil or failed fan raises exit temp, which raises optimum pressure, which raises compression work. In subcritical (cool weather) operation, the same coil simply condenses like a normal condenser.

Manufacturers in our catalog: **Güntner** (GVD/GVW condensers and gas coolers, GFD/GFW dry coolers, with the hydroBLU™ adiabatic option) and **REFPLUS** (Canadian-built gas coolers and evaporators).

### Adiabatic Cooling — Güntner hydroBLU™

An adiabatic system pre-cools the air entering the coil by evaporating water — pads or spray wet the incoming airstream, dropping it from dry-bulb toward wet-bulb temperature. On a 35°C dry / 24°C wet-bulb day, that can mean ~8–10 K cooler air entering the coil, often enough to keep a CO₂ system subcritical (or much closer to it) on the hottest days.

Key operating points from the Güntner ACS manual:
- The system runs **dry** most of the year; water is only introduced above a programmed ambient threshold — this is the efficiency advantage over evaporative condensers
- **Water quality matters**: follow the manual's water quality guidelines (hardness, conductivity, chlorides). Untreated hard water scales the pads and destroys wetting performance
- **Seasonal/prolonged shutdown**: drain the water system completely per the shutdown procedure — freeze damage and stagnant-water biology (legionella risk) are the two failure modes
- Commissioning requires the full preliminary-operation sequence in the manual (system inspection → preliminary mode → operation mode) before unattended running

### PM Checklist — Gas Coolers & Adiabatic Systems

- Straighten fins and wash the coil (low-pressure water, inside-out where accessible); confirm fin temperature uniformity across circuits after cleaning
- Verify all fans run and rotate correctly; check EC fan/VFD response to a forced setpoint change from the rack controller
- Inspect adiabatic pads for scale, algae, and bypass gaps; replace media that no longer wets evenly
- Confirm water solenoid/pump operation and the ambient-temperature enable threshold
- Test drain-down at season end; verify heat-trace on exposed water lines before winter
- Check structure: vibration isolators, fan guards, coil frame corrosion
- Cross-check the gas cooler exit temperature sensor against a strap-on reference — the HP valve optimization depends on this sensor being right

### Troubleshooting High Discharge / Gas Cooler Pressure

| Finding | Cause | Action |
|---|---|---|
| Exit temp far above ambient dry-bulb | Dirty/scaled coil, dead fans, recirculating hot air | Clean coil, repair fans, check installation clearances |
| Adiabatic system never engages on a hot day | Water supply off, failed ambient sensor, disabled controller output | Restore water, verify enable threshold and sensor |
| Pads wet but little benefit | Scaled/channelled media, poor water distribution | Descale or replace pads, clean distribution headers |
| High pressure only at low ambient | Gas cooler fan control mis-tuned (overshooting subcritical transition) | Review controller's transcritical/subcritical changeover settings |
| Exit temp sensor reads low vs reference | Sensor drift — HP valve running wrong optimum pressure | Replace/recalibrate sensor |

### Winter & Transition Operation

- Subcritical changeover: the controller floats pressure down and the gas cooler behaves as a condenser; verify minimum pressure limits hold enough liquid pressure for expansion devices
- Confirm fan minimum-speed settings don't let the coil overshoot (too-cold exit temp can starve the flash tank of pressure)
- Drain adiabatic water before sustained freezing; verify the dry-mode damper/bypass (if fitted) operates
`

export const PRESSURE_REGULATOR_KNOWLEDGE = `
## Pressure Regulators & Rack Service Valves


### Where Regulators Fit on a Rack

Pressure regulators hold a set pressure somewhere the compressors and TXVs can't do it alone. The Parker **Refrigerating Specialties (RS) A8 and A9** compact wide-range regulators in our catalog are classic examples:

- **A8 — inlet (upstream) pressure regulator.** Holds the pressure *upstream* of itself constant. Classic duty: **EPR (evaporator pressure regulator)** — keeps a warmer-temperature evaporator from pulling down below its design SST when it shares a suction group with colder loads. Also used as a relief-style regulator holding back vessel pressure
- **A9 — outlet (downstream) pressure regulator.** Holds the pressure *downstream* constant. Classic duty: maintaining minimum receiver pressure in winter (head pressure control), or feeding a constant-pressure supply to a gas-defrost header

Rule of thumb: name the pressure you need to control, then pick the regulator that senses on that side. Inlet regulators open on **rising inlet** pressure; outlet regulators open on **falling outlet** pressure.

### Adjusting an A8/A9

1. Install gauges on the controlled-pressure side (use the regulator's gauge port if fitted) — never adjust blind
2. Back out or screw in the adjusting stem slowly: **clockwise raises** the setpoint on these spring-loaded regulators
3. Let the system stabilize between adjustments — regulators interact with TXVs and compressor staging, so give each change a few minutes
4. Verify across load swings (defrost return, case pulldown) that the regulator holds setpoint without hunting
5. Record the final setpoint in the store's service history and on the regulator tag

### Installation Notes

- Flow direction arrow must match — these are one-way devices
- Fit a **strainer upstream**; regulator pilot ports and seats are intolerant of scale and flux debris
- Mount per the manual's orientation guidance; protect the spring housing from physical damage and water
- When brazing, disassemble or wrap per the instructions — overheating warps seats
- Size from capacity tables at the actual pressure drop, not pipe size — an oversized regulator hunts, an undersized one starves the circuit

### Troubleshooting Regulators

| Symptom | Cause | Action |
|---|---|---|
| Pressure drifts above setpoint (inlet type) | Seat fouled/eroded, spring fatigue | Inspect seat, clean strainer, rebuild or replace |
| Hunting/oscillating pressure | Oversized regulator, pilot passage debris, interaction with another control | Verify sizing; clean pilot; stagger setpoints |
| Will not reach setpoint | Undersized, upstream restriction, wrong range spring | Check capacity table; inspect strainer |
| No control at all | Diaphragm/bellows failure | Rebuild kit or replace |

### Mueller Service & Transducer Valves

The Mueller catalog entries cover the rack's **ball valves** and **transducer (access) valves**:

**Refrigeration ball valves**:
- Full-port, bi-directional, with seal caps. Use the cap — stem O-rings are not the primary seal
- When brazing in: open the valve, remove internals where the design allows, and wrap the body in wet rags; seat materials are ruined by brazing heat
- A partially-open ball valve is a throttling device it was never designed to be — leave service valves fully open or fully closed

**Transducer/access valves**:
- Provide a Schrader-style depressor port so a pressure transducer or gauge can be installed/replaced **without pumping down** the section
- When replacing a transducer: confirm the access valve actually has a functioning depressor core; a missing core = full refrigerant release when the transducer comes off
- Cap every access port with the correct sealing cap — Schrader cores weep; the cap is the real seal
- Torque transducers to spec, leak-check with the system at pressure, and verify the new transducer reads against a calibrated gauge before trusting it to the rack controller

### PM Quick Hits

- Verify each EPR-held circuit holds design SST under steady load (gauge at the case, not just the rack)
- Exercise ball valves annually (full close → full open) so they're operable when you need an isolation in an emergency
- Check every access valve cap is present and tight; replace weeping Schrader cores with the section at pressure using a core tool
`

export const STANDBY_POWER_KNOWLEDGE = `
## Standby Power — Generators, Transfer Switches & UPS


### Why Standby Power Is a Refrigeration Topic

A power outage in a loaded supermarket is a refrigeration emergency: product in open cases starts warming within minutes and walk-in/LT product follows. The standby power chain — generator, automatic transfer switch (ATS), and UPS units on the controls — decides whether an outage is a non-event or a five-figure product loss claim. Techs should know how the chain behaves so post-outage callouts make sense.

### Generac RTS Automatic Transfer Switches

The **Generac RTS Series** units in our catalog are CSA-approved, **service-entrance rated** ATS units (100 A and 200 A, single-phase, NEMA/UL Type 3R aluminum outdoor enclosure). Service-rated means the switch doubles as the service disconnect, with utility-side circuit breakers providing downstream protection.

Transfer logic (all timing and sensing lives in the **generator controller**, not the switch):
- Utility voltage drop-out threshold: **below ~60%** of nominal
- Timer to generator start: **10 seconds factory-set** (adjustable 10–30 s) — short blips don't start the engine
- Engine warm-up before transfer: **~5 seconds**
- Standby voltage sensed at **60% for 5 seconds** before load transfer
- Return to utility after stable utility restoration, then engine cool-down run

What this means on site: after an outage begins, expect roughly **15–20 seconds of dark time** before the rack comes back on generator. Compressors will short-cycle-protect and restage; expect a burst of alarms, not a clean instant recovery.

### After-Outage Service Checklist (Refrigeration Side)

1. Confirm all compressors restarted and staged normally — look for HPCO/LPCO trips logged during the outage window
2. Check case/cooler temps and start a pulldown watch; verify defrost schedules didn't stack (multiple circuits defrosting simultaneously on recovery)
3. Verify rack controller, supervisory front-end, and network gear rebooted cleanly and the clock/schedules are correct
4. Walk-in and case alarms: clear, then confirm they re-arm — don't leave alarm silences active
5. If the site ran on generator under refrigeration load: note run hours and report for generator service scheduling

### CyberPower UPS Units on Controls

The cataloged **CyberPower AVRG900U** (AVR series, 900 VA) and **CP550SLG** (Standby series, 550 VA) protect electronics, not motors:
- **AVR (automatic voltage regulation)** models buck/boost continuously through sags and swells without switching to battery — better for rack controllers and front-ends that hate the transfer gap
- **Standby** models switch to inverter only when power fails — fine for modems/switches
- Their job is to ride the controls through the **15–20 second ATS gap** so the rack controller never loses its brain, keeps its alarm log, and restages compressors immediately when power returns

UPS service notes:
- Batteries are consumables: plan replacement every **3–5 years**; most units chirp or fail self-test when the battery is done
- Run the unit's self-test at PM; a UPS that drops its load during self-test is worse than no UPS (it's a single point of failure)
- Size by VA *and* watts against the actual connected load — controllers plus a monitor plus network gear add up
- Never plug motor loads, heaters, or battery chargers into a control UPS

### What Belongs on Which Backup

| Load | Generator | UPS |
|---|---|---|
| Compressors, condenser/gas-cooler fans | Yes | Never |
| Case/walk-in evap fans, anti-sweat | Yes | No |
| Rack controller, supervisory PC, gateways | Yes | Yes — bridges the transfer gap |
| Network switch/modem (alarm dial-out) | Yes | Yes |
| Store lighting/POS | Per store design | No (their own systems) |

### Troubleshooting the Chain

| Symptom | Likely Cause | Action |
|---|---|---|
| Controllers rebooted during outage despite UPS | Dead UPS battery, overloaded UPS, controller not actually on UPS circuit | Self-test UPS, audit what's plugged in where |
| Generator started but store never transferred | ATS contactor failure, standby voltage never qualified | Generator/electrical service call — do not force the contactor |
| Repeated nuisance engine starts | Drop-out threshold marginal with utility sags | Review utility power quality; adjust start delay within 10–30 s range |
| Alarms flood after every outage | Normal restage behaviour | Verify recovery completed, then clear; tune alarm delays if excessive |
`

export const RACK_VALVES_COMPONENTS_KNOWLEDGE = `
## Rack Valves & Components Reference

This is the field map of every valve and control component you will meet on an HFC parallel rack or a distributed Protocol-style rack — what each device does, the setpoint it should hold in different operating conditions, and how to tell at a glance whether it is working. It pulls together components that are also covered in depth in their own topics (Sporlan, Danfoss, Pressure Regulators, Relief Valves, Pressure Switches, Solenoid Valves, Filter-Driers, Temprite oil management) so you can walk the rack high-side to low-side in one place. When a number matters, verify it against the system design sheet and the device nameplate before you adjust anything.

### How to Walk the Rack

Trace the refrigerant and you trace the valves: compressors → discharge header → oil separator → condenser/gas cooler → head-pressure control → receiver → liquid header → filter-drier → sight glass → liquid-line solenoids → expansion device → evaporator → EPR → suction filter/accumulator → suction header → back to the compressors. Safety devices (relief valves, HPCO/LPCO) and service/access valves sit across the whole loop. Setpoints below assume R-404A or R-448A/R-449A unless noted; CO2 transcritical setpoints live in the Evapco LMP, Carnot, and Gas Cooler topics.

### High Side — Discharge, Oil Separator & Check Valves

**Discharge service valves** — front-seat to isolate a compressor for service, back-seat for normal run. Leave fully open or fully closed; a cracked service valve is a throttling restriction that drives up discharge temperature.

**Discharge check valves (Sporlan Check-All / CK series, CSOV check-solenoid combos)** — stop hot discharge gas and refrigerant from migrating backward into an off compressor, and stop one suction group feeding another through a failed valve. Cracking pressure is typically 1–5 psi.

**Oil separator, reservoir and oil level regulators (Temprite separators, TraxOil electronic / Kriwan / mechanical float regulators)** — strip oil from discharge gas and meter it back to each crankcase. Target crankcase oil level is about one-half the sight glass.

| Component | Ideal condition / setpoint | Signs it is not working |
|---|---|---|
| Discharge check valve | Holds reverse flow; cracking 1–5 psi | Off compressor warms/backspins; suction groups cross-feed; oil migrates to idle crankcase |
| Oil separator | Discharge gas leaves nearly oil-free; oil returns to reservoir | Oil collecting in evaporators/sight glasses downstream; reservoir level falling |
| Oil level regulator (TraxOil) | Fills below ~1/2 glass after a short delay; level recovers within ~2 min | Crankcase low/foamy; oil-failure alarm; LED fault on TraxOil; level never recovers |
| Crankcase heater | Oil warm before start, no foaming | Oil foams on startup after an off period — heater open; verify before any restart |

### Head Pressure Control — Flooding Valves & Receiver Pressure

Most supermarket racks control head pressure with **staged or VFD condenser fans** (see the VFD topic) and float head pressure as low as practical to save fan energy — but never below the floor that keeps the farthest TXV fed. Smaller racks, satellites, and air-cooled condensing units instead use **flooding (condenser-holdback) valves**: a Sporlan ORI inlet regulator at the condenser outlet that throttles closed as condensing pressure falls, backing liquid up into the condenser to raise head pressure, paired with an ORD differential bypass valve that feeds discharge gas to the receiver to keep receiver pressure up. A Parker RS A9 outlet regulator does the same receiver-pressure duty on larger lineups (see Pressure Regulators).

| Refrigerant | Minimum head pressure (floor) | Flooding-valve / receiver target | Verify with |
|---|---|---|---|
| R-404A | ~200 psig (~89°F SCT) | ~230 psig (~97°F SCT) | Calibrated discharge gauge; subcooling at liquid header |
| R-448A / R-449A | ~175 psig (~78°F SCT) | ~210 psig (~91°F dew) | Calibrated gauge; liquid sight glass clear |

Signs of trouble: head pressure floats too low in cold weather → liquid-line subcooling collapses → flash gas → many TXVs starve at once (high superheat across multiple circuits, mimics low charge). Head pressure too high → check fan staging/VFD, fouled condenser, overcharge, non-condensables, or a flooding valve stuck closed. Flooding valve hunting → oversized valve or debris on the pilot seat.

### Receiver, King Valve & Liquid Header

The receiver stores the charge and feeds the liquid header; the **king valve** at the receiver outlet lets you pump down into the receiver for service. Keep it back-seated in normal run. Target **liquid subcooling at the header outlet is 10–15°F** — that is the single best indicator the high side and charge are healthy. Subcooling under ~5°F with bubbles in the sight glass = flash gas (low charge, restriction, or low head pressure). Subcooling over ~20°F = overcharge or non-condensables.

### Liquid Line — Drier, Sight Glass & Solenoids

- **Filter-drier (Sporlan Catch-All C/RC, suction RSF after a burnout)** — replace when pressure drop exceeds ~2 psi or the moisture indicator goes wet. See the Filter-Drier topic.
- **Moisture-indicating sight glass (Sporlan See-All, Emerson IHL series)** — green = dry, yellow/gold = wet (change the drier now — acid formation is exponential), white/cloudy = system flooded with moisture. A steady stream of bubbles with confirmed-good charge points to a drier restriction or undersized/long liquid line, not "add gas."
- **Liquid-line solenoids (Sporlan, Danfoss EVR)** — close on the off cycle for pump-down control. Stuck open = case overcools / runs continuously; stuck closed = circuit starves. Test coil at the terminals, not the panel (see Solenoid Valves).

### Expansion Devices & Distributors

TXVs and EEVs (Sporlan SER/SERI/SEHI, Danfoss/Carel drivers) meter liquid into the evaporator on **superheat** — typical evaporator superheat is about 6–12°F; verify against case design. A distributor with the correct nozzle splits flow evenly across circuits. Overfeeding (superheat under ~5°F) risks floodback; underfeeding (superheat over ~15–20°F) starves the coil. A partially blocked distributor nozzle frosts some circuits and leaves others warm. Full detail lives in the Sporlan and Danfoss topics.

### Evaporator Pressure Regulation (EPR)

An EPR holds a **minimum evaporator pressure** so a warmer case does not pull below its design temperature when it shares a suction group with colder loads. It does NOT control superheat. The setpoint is simply the saturation pressure of the case's minimum allowable SST.

- **Pilot-operated (Sporlan ORIT / OREO, externally adjustable OROA; Danfoss ICS+CVP, KVP)** — mechanical, set with a gauge on the evaporator outlet; clockwise raises the held pressure.
- **Stepper / electronic (Sporlan CDS / CDST, Micro Thermo DT-EEPR, Danfoss electric regulating valve)** — driven by the case controller to a temperature setpoint. Note: CDS is a stepper EPR valve, never a "case differential sensor."

| Case minimum SST | R-404A EPR target (approx.) | R-448A/449A EPR target (approx.) |
|---|---|---|
| +20°F (MT produce/dairy) | ~46 psig | ~45 psig |
| 0°F | ~26 psig | ~24 psig |
| -10°F (LT) | ~15 psig | ~16 psig |

Signs of trouble: EPR stuck open → case overcools, suction pressure on that circuit reads rack suction; stuck closed/over-set → case starves and warms. A stepper EPR throwing an "invalid" alarm means the controller cannot confirm position — check the step count matches the valve model and the drive wiring.

### Suction Line — Filters, Accumulators & CPR

- **Suction filter (Sporlan)** — protects compressors after a repair/burnout; rising suction-side pressure drop = clogged element, swap it.
- **Suction accumulator** — traps liquid slugs (after defrost, at startup) and meters them back slowly; a bypassed or undersized accumulator shows as floodback/slugging on restart.
- **Crankcase pressure regulator (CPR / holdback valve)** — limits compressor inlet pressure during pulldown and after defrost so the motor is not overloaded. Set it during a high-load pulldown so the suction pressure at the compressor does not exceed design and motor amps stay at or below RLA; there is no universal psi — it is matched to the compressor. CPR set too low strangles capacity (slow pulldown); too high lets the motor overload after defrost.

### Defrost & Bypass Valves

Hot-gas defrost valves (3-pipe systems and Hussmann KoolGas 2-pipe), reversing/defrost solenoids, and the EPR bypass solenoid that opens during the drip cycle are detailed in the Defrost and Rack Sequence topics — a bypassed EPR during the drip cycle is by design, not a fault. **Discharge bypass valves (Sporlan ADRS / SDR)** recirculate hot gas to the suction header at light load to stop short-cycling; they should open about 5–10 psig below the normal minimum suction and must be set **above the LPCO** so they never cause a nuisance low-pressure trip. A hot-gas or defrost solenoid leaking by shows as a stubbornly high suction on that group and a case that never quite holds temperature.

### Safety Devices — Relief Valves & Pressure Cutouts

The protection order is always: **controller acts first, mechanical HPCO second, relief valve last.**

- **Relief valves (Farris, Superior, LESER)** — set pressure must equal the protected vessel's design pressure (MAWP) per CSA B52 / ASHRAE 15. Replace after any discharge event; never gag a weeping valve. HFC high-side vessels are commonly stamped around 450 psig; CO2 reliefs are far higher (flash tank ~45–60 bar, high side ~90–120 bar). See the Relief Valves topic.
- **HPCO (high-pressure cutout)** — manual reset, set below the relief and above the controller's high-pressure unload point. R-448A/R-449A MT racks typically trip ≈ 400–425 psig.
- **LPCO (low-pressure cutout)** — guards against deep vacuum / loss of charge; usually auto-reset just above the design SST vacuum.

A switch that never trips on test (welded contacts, plugged capillary) is more dangerous than no switch — replace it, never bypass it. See Pressure Switches & Gauges.

### Service & Access Valves

- **Refrigeration ball valves (Refrigera, Mueller)** — full-port isolation; leave fully open or closed, and use the seal cap as the real seal. Wrap and cool the body when brazing — seat material is ruined by heat.
- **Transducer / access (Schrader) valves (Mueller)** — let you change a transducer or gauge without pumping down; confirm the depressor core is present and working, and cap every port (the cap, not the core, is the seal).
- **Superior WA / WAS packed angle service valves** — exercise annually so they actually operate in an emergency isolation.

### Protocol & Distributed Racks — What's Different

A distributed Protocol-style rack (for example the Hussmann Protocol units modeled in the simulator) moves the regulation out to each circuit instead of one EPR per suction group. Each circuit gets its **own electronic EEV plus an electronic EPR** — commonly a Micro Thermo DT-EEPR (distributed-temperature electronic EPR) driven by an MT-2 valve controller, or a Sporlan CDS stepper. The rack still has the same high-side, oil, head-pressure, and safety hardware; what changes is that case temperature and superheat are held per-circuit electronically, so a "warm case" is usually a single circuit's EEV/EEPR/controller rather than a rack-wide EPR. The Micro Thermo design guides (DT-EEPR medium- and low-temperature rack design, and the DT-EEPR troubleshooting guide) are the authority for per-circuit setpoints and stepper fault codes.

### Setpoint Quick Reference

| Item | R-404A | R-448A / R-449A | How to verify |
|---|---|---|---|
| Minimum head pressure (floor) | ~200 psig (~89°F SCT) | ~175 psig (~78°F SCT) | Calibrated discharge gauge |
| Flooding-valve / receiver target | ~230 psig | ~210 psig | Gauge + clear sight glass |
| Liquid subcooling at header | 10–15°F | 10–15°F | Liquid temp vs SCT from PT chart |
| MT suction saturation | -15°F to +25°F | similar (account for glide) | Suction transducer / gauge |
| LT suction saturation | -30°F to -20°F | similar (account for glide) | Suction transducer / gauge |
| Evaporator superheat (typical) | 6–12°F | 6–12°F | Coil-out temp vs SST |
| Discharge bypass opens | 5–10 psig below min suction (above LPCO) | same | Gauge while loading down |
| HPCO trip (MT rack) | ≈ 405–425 psig manual reset | ≈ 400–425 psig manual reset | Supervised HPCO test |
| Crankcase oil level | ~1/2 sight glass | ~1/2 sight glass | Oil sight glass under load |

### Is It Working? — Fast Symptom Index

| What you see | Suspect component(s) |
|---|---|
| Many circuits on one group warm at once, high superheat everywhere | Low head pressure / flooding valve, low charge, drier restriction — check subcooling first |
| Single case warm, rest of group fine | That circuit's EEV/TXV, EPR/EEPR, or liquid-line solenoid |
| Single case overcools / freezes product | EPR stuck open or set too low; LL solenoid stuck open |
| Bubbles in sight glass, normal charge | Drier restriction or undersized/long liquid line, low head pressure |
| Oil-failure trips, foamy crankcase | Crankcase heater, oil level regulator, separator bypass, floodback |
| Floodback / slugging at startup or after defrost | Suction accumulator, overfeeding expansion valve, defrost valve not closing |
| Suction won't pull down / motor overamps after defrost | CPR set wrong; too many compressors staged |
| Head pressure won't come down | Fan staging/VFD, fouled condenser, overcharge, non-condensables, flooding valve stuck closed |
| Relief vent oily/frosted | Relief has lifted — replace and find the overpressure cause |

### PM Quick Hits

- Read subcooling at the liquid header and superheat at a representative case every PM — these two numbers catch most valve and charge faults early.
- Confirm floating head and floating suction are still enabled (they get disabled on service calls and never re-enabled).
- Exercise ball/service valves and confirm every access-valve cap is present and tight.
- Verify each EPR-held circuit holds its design SST under steady load, gauging at the case — not just the rack.
- Check relief valve date tags and the moisture-indicator colour; a wet sight glass is an urgent drier change, not a watch item.
- Confirm crankcase heaters are warm before any restart after a power event.
`

export interface BuildSystemPromptOptions {
  mode: ChatMode
  domain?: ChatDomain
  equipment?: Equipment | null
  readings?: SensorSnapshot
  recentLogs?: MaintenanceLog[]
  activeAlarms?: AlarmEvent[]
  retrievedContext?: string
}

export function buildSystemPrompt(opts: BuildSystemPromptOptions): string {
  const { staticContent, dynamicContent } = buildSystemPromptParts(opts)
  return [staticContent, dynamicContent].join('\n\n')
}

// Splits the system prompt into a large static block (ideal for prompt caching)
// and a small dynamic block (equipment context, retrieved docs, mode).
export function buildSystemPromptParts(opts: BuildSystemPromptOptions): {
  staticContent: string
  dynamicContent: string
} {
  const domain = opts.domain ?? 'REFRIGERATION'

  const staticContent = (domain === 'HVAC' ? [
    EXPERT_IDENTITY,
    MATH_AND_ELECTRICAL_KNOWLEDGE,
    MICRO_THERMO_KNOWLEDGE,
    PENN_CONTROLS_KNOWLEDGE,
    CARNOT_KNOWLEDGE,
    EMERSON_E2_E3_KNOWLEDGE,
    VFD_KNOWLEDGE,
    BIG_PICTURE_METHODOLOGY,
    FORMAT_INSTRUCTIONS,
    MANUAL_SEARCH_TOOL_INSTRUCTIONS,
  ] : [
    EXPERT_IDENTITY,
    REFRIGERATION_KNOWLEDGE,
    SPORLAN_KNOWLEDGE,
    COPELAND_KNOWLEDGE,
    HUSSMANN_KNOWLEDGE,
    DANFOSS_KNOWLEDGE,
    ARNEG_KNOWLEDGE,
    KEEPRITE_KNOWLEDGE,
    MATH_AND_ELECTRICAL_KNOWLEDGE,
    MICRO_THERMO_KNOWLEDGE,
    EVAPCO_LMP_KNOWLEDGE,
    PENN_CONTROLS_KNOWLEDGE,
    CARNOT_KNOWLEDGE,
    EMERSON_E2_E3_KNOWLEDGE,
    WALK_IN_KNOWLEDGE,
    PARALLEL_RACK_KNOWLEDGE,
    VFD_KNOWLEDGE,
    REFRIGERANT_RETROFIT_KNOWLEDGE,
    TYLER_HILL_PHOENIX_KNOWLEDGE,
    HEATCRAFT_BOHN_KNOWLEDGE,
    BITZER_KNOWLEDGE,
    BIG_PICTURE_METHODOLOGY,
    FORMAT_INSTRUCTIONS,
    MANUAL_SEARCH_TOOL_INSTRUCTIONS,
  ]).join('\n\n')

  const dynamicParts: string[] = []

  if (domain === 'HVAC') {
    dynamicParts.push(`You are operating in HVAC mode. The built-in HVAC knowledge base is still being built out — it currently covers controls (Emerson E2/E3, Penn, Carnot), VFDs, electrical/math fundamentals, and heat-reclaim basics, but does not yet have the depth of the refrigeration knowledge base. Lean on the search_manuals tool for equipment-specific HVAC manuals (RTUs, air handlers, makeup air units, etc.), and be upfront when something is outside what you can confirm — don't guess at HVAC-specific procedures you're not confident about.`)
  }

  if (opts.equipment) {
    dynamicParts.push(buildEquipmentContext(
      opts.equipment,
      opts.readings,
      opts.recentLogs,
      opts.activeAlarms
    ))
  } else {
    dynamicParts.push('No specific unit selected. If the technician describes a specific unit, the refrigerant type and manufacturer significantly affect diagnosis — ask only if it matters to the answer.')
  }

  if (opts.retrievedContext) {
    dynamicParts.push(
      `--- RETRIEVED MANUAL EXCERPTS ---\n` +
      `The following passages were retrieved from your uploaded manuals and are AUTHORITATIVE for this query.\n` +
      `Prioritise this content in your answer. Cite the manual title when you draw from it.\n\n` +
      opts.retrievedContext
    )
  }

  dynamicParts.push(MODE_INSTRUCTIONS[opts.mode])

  return { staticContent, dynamicContent: dynamicParts.join('\n\n') }
}
