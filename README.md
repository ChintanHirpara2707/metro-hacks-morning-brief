# 🚇 Morning Brief

### The two-minute daily brief for metro, BRTS and AMTS.

Upload each system's daily data and get a **one-page brief** that flags unusual ridership changes and shows the **likely cause, with evidence**.

Built solo at **Metro Hacks** by GDG Gandhinagar (Road to DevFest) · Problem statement **PS-13 · The Two-Minute Morning Brief** · City Public Transport track


---

## The problem

Daily MIS reports for the state government and ministries need data from three separate systems: the **metro**, **BRTS** and **AMTS**. Someone compiles them by hand, which takes hours, and important exceptions are easy to miss in thousands of numbers.

## The solution

Morning Brief turns the raw daily data from all three systems into a single page a manager can read in two minutes:

> *"Kalupur Railway down 13.3% (-2,945 riders); likely gate outage + heavy rain."*

Every claim is backed by evidence from the data. If the data doesn't support a cause, the brief says **"cause unclear"**. It never invents one.

## What you can do

| Feature | Details |
|---------|---------|
| **One-page brief** | Date, weather and holiday context, a plain-language summary, and headline numbers for Metro, BRTS and AMTS with change vs yesterday |
| **Smart exceptions** | Compares each station or route with its same-weekday baseline and flags changes beyond an adjustable threshold (3-30%) |
| **Likely causes with evidence** | Joins each exception with outages, breakdowns, cancellations, rain, events and holidays. Expand a card to see the proof |
| **Trend sparkline** | A small recent-trend line on every exception |
| **Watch today** | Outages and weather conditions the control room should keep an eye on |
| **Bring your own data** | Upload a CSV per system, with a downloadable template for each, or click **Sample** |
| **Print / PDF** | Prints cleanly to a single A4 page |
| **Speed** | The brief is ready in about a second, against roughly 4 hours manually |
| **Transparent** | An Assumptions panel lists every made-up number and threshold |

## Try it in 60 seconds

1. Click **Sample** to load 35 days of sample data.
2. Pick a brief day with the date picker.
3. Read the summary, headline numbers and top exceptions.
4. Move the **threshold slider** and watch exceptions appear and disappear.
5. Expand an exception to see its **evidence**.
6. Click **Print / PDF** for the one-page brief.
7. Open **Assumptions** and **Business model (PPP)** at the bottom.

## Run it locally

```bash
git clone https://github.com/<your-username>/morning-brief-ps13.git
cd morning-brief-ps13
npm install
npm run dev
```

Open the address it prints (usually `http://localhost:5173`).

For a production build: `npm run build` then `npm run preview`.

## CSV formats

Each upload box has a **Template** button. The expected columns are:

| File | Columns |
|------|---------|
| `metro_ridership.csv` | `date, station, ridership` |
| `metro_outages.csv` | `date, station, asset, detail` |
| `brts_ridership.csv` | `date, route, ridership` |
| `brts_incidents.csv` | `date, route, breakdowns, avg_delay_min` |
| `amts_ridership.csv` | `date, route, ridership` |
| `amts_cancelled.csv` | `date, route, cancelled[, detail]` |
| `context.csv` | `date, rainfall_mm, event, holiday` |

Dates use `YYYY-MM-DD`. Ready-made files are in [`sample-data/`](sample-data/).

## How it works

The engine is plain, deterministic JavaScript. The same data always gives the same brief, and every result can be explained.

**1. Baseline.** The mean of the same weekday over the prior 4 weeks (fewer if the data is shorter), per station or route.

**2. Flag.** An entity is flagged when its change vs baseline passes the threshold (default ±10%, adjustable from 3% to 30%).

**3. Severity and rank.**
- 🔴 Critical if |Δ%| ≥ 15 or |Δ| ≥ 5,000 riders, otherwise 🟡 Watch
- Rank = |Δ| × (1 + |Δ%| / 100), so big absolute losses come first

**4. Cause scoring.** Each exception is joined with the context data and scored:

| Evidence | Score |
|----------|-------|
| Gate outage | 3 |
| Lift or escalator outage | 2 |
| Rain ≥ 25 mm | 3 |
| Rain ≥ 10 mm | 2 |
| BRTS ≥ 3 breakdowns or ≥ 12 min average delay | 3 |
| AMTS ≥ 5 cancelled trips | 3 |
| Holiday | 3 |
| Event (uplift) | 3 |
| Event (dip) | 2 |

The top-scoring causes are shown with their evidence. **No score means "cause unclear".**

## Sample data

The built-in sample is synthetic and deterministic (seed `20261010`):
- About 35 days, 10 metro stations, 6 BRTS routes and 6 AMTS routes
- Weekday factors: Mon-Fri 1.0, Sat 0.85, Sun 0.7, with ±4.5% noise
- Planted anomalies the engine should find: a gate outage plus 38 mm rain at Kalupur Railway, BRTS breakdowns, AMTS cancellations, a stadium-match surge at Motera and Old High Court, an escalator outage at Vastral Gam, and a holiday dip that is correctly explained by the holiday

This is **not real operator data**. The assumptions are listed inside the app.

## Business model (PPP)

| Role | Who | What |
|------|-----|------|
| **Owns data and decisions** | Authority (GMRC, municipal corporation, ministry) | Supplies daily CSV or API extracts and acts on the brief |
| **Builds, hosts, maintains** | Private partner | Brief generator, onboarding each depot and system, threshold tuning |
| **Revenue** | Annual subscription | Indicative ₹8-15 lakh per year per authority, plus ₹2-4 lakh integration fee per system. SLA: brief ready before 8 AM |
| **Benefit** | Authority | About 2-3 analyst hours saved daily (around 60 hours a month), fewer missed exceptions, and an evidence trail behind every claim |
| **Pilot** | Both | Metro plus one BRTS corridor on historical CSVs, then live feeds |

The figures are indicative assumptions for discussion, not quotes.

## Tech stack

- **React + Vite**
- **Tailwind CSS** and **Motion** for the interface and animation
- Plain JavaScript analysis engine, no backend
- Runs entirely in the browser; CSV in, PDF out
- Built with AI coding assistance

## Limitations (honest)

- Uses synthetic data; real data would need cleaning and mapping.
- Causes are rule-based and show *correlation with evidence*, not proven causation.
- Baseline is a simple weekday average, so it can't predict future demand.
- Single-day briefs only, no multi-day trend report.

## Roadmap

- Live feeds from the metro, BRTS and AMTS systems
- Scheduled delivery of the brief by 8 AM
- Briefs in Gujarati, Hindi and English
- One-tap WhatsApp summary
- Learned baselines with seasonality, events and weather forecasts
- Drill-down from an exception to station-level hourly data

## How it maps to the judging criteria

| Criterion | How Morning Brief answers it |
|-----------|-----------------------------|
| Relevance | Directly produces the one-page MIS brief an operator needs |
| Working prototype | Sample or CSV in, brief out, then print, all working end to end |
| Resilience | Runs fully in the browser with no server; unclear causes are admitted, not invented |
| Technical depth | Baseline comparison, severity ranking and evidence-scored cause analysis |
| Feasibility and PPP | Pilot on historical CSVs, with a clear build, run and pay model |

Built at Metro Hacks, GDG Gandhinagar. Thank you to the organisers for such a creative event. 🚇
