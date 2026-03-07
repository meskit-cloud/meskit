<https://www.reddit.com/r/manufacturing/comments/1mjwqm0/mes_recommendations/>

# Reddit Thread Notes — MESkit Relevance

## Avoid Tulip's mistakes

- Vendor updates that broke production lines, twice
- No real SQL joins, data like Excel sheets
- Backups requiring vendor contact
- MESkit is self-hosted + Postgres-backed, so these are already solved, worth making explicit in positioning

## Early adopter profile

- SQL-savvy, programming background, frustrated by low-code limits
- Wants control over the system, not a black box
- MESkit's open tool layer and Supabase ownership speak directly to this

## OEE gap

- Most cited end goal in the thread: OEE + quality data
- Quality is well covered in MESkit's data model
- OEE is out of scope but worth stubbing downtime + ideal cycle time fields early so users can compute it themselves

## Simulation-first as a differentiator

- Thread highlights risk of picking a MES without knowing the business processes
- MESkit's sim-first approach lets engineers learn ISA-95 patterns safely before touching real production
- Worth leaning into this in docs and positioning
