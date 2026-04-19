# CricPulseIQ Firestore Schema

This document outlines the detailed Firestore NoSQL schema, including collections, sub-collections, field definitions, and their purposes for the CricPulseIQ platform.


## 1. `/clubs/{clubId}`
**Description:** High-level details about teams or clubs.
- `name`: string
- `city`: string
- `logoUrl`: string
- `createdAt`: timestamp

### Subcollection: `/clubs/{clubId}/players/{playerId}`
**Description:** Roster details for a specific club.
- `name`: string
- `role`: string ("batsman", "bowler", "all-rounder", "wicket-keeper")
- `battingStyle`: string
- `bowlingStyle`: string
- `jerseyNo`: number
- `photoUrl`: string

### Subcollection: `/clubs/{clubId}/matches/{matchId}`
**Description:** A club's match history.
- `opponent`: string (or reference to opponent clubId)
- `venue`: string
- `date`: timestamp
- `format`: string ("T20", "ODI", "Test")
- `result`: string ("won", "lost", "tied", "no-result")
- `scorecardId`: reference (to root `/matches/{matchId}`)


## 2. `/matches/{matchId}`
**Description:** The authoritative state for live and completed matches.
- `homeTeam`: string (name or reference ID)
- `awayTeam`: string (name or reference ID)
- `venue`: string
- `date`: timestamp
- `format`: string ("T20", "ODI", "Test")
- `currentInnings`: number (1 or 2)
- `homeScore`: map `{ runs: number, wickets: number, overs: number }`
- `awayScore`: map `{ runs: number, wickets: number, overs: number }`
- `status`: string ("live", "completed", "upcoming")

### Subcollection: `/matches/{matchId}/deliveries/{deliveryId}`
**Description:** Ball-by-ball granular logging for real-time and post-match AI analysis.
- `over`: number
- `ball`: number
- `runs`: number
- `extras`: number
- `wicket`: boolean
- `batsmanId`: reference (to playerId)
- `bowlerId`: reference (to playerId)
- `wagWheelZone`: string (e.g. "cover", "mid-wicket", "fineLeg")
- `wagWheelRuns`: number (runs scored effectively in that zone)
- `timestamp`: timestamp


## 3. `/playerStats/{playerId}/seasons/{seasonId}`
**Description:** Historical analytical data for AI coach and scouting reports.
- `matches`: number
- `runs`: number
- `avg`: number
- `strikeRate`: number
- `highScore`: number
- `fifties`: number
- `hundreds`: number
- `phaseRatings`: map `{ powerplay: number, middleOvers: number, death: number }` (AI generated metrics 1-100)
- `vsSpinRating`: number
- `vsPaceRating`: number
- `shotZones`: map `{ fineLeg: number, squareLeg: number, midWicket: number, midOn: number, straight: number, midOff: number, cover: number, point: number, thirdMan: number }` (Run percentage or absolute run totals for wagon wheel)
- `formHistory`: array of maps `[{ matchId: string, runs: number, balls: number, result: string }]`


## 4. `/tournaments/{tournamentId}`
**Description:** Encapsulates the entire multi-match tournament lifecycle and leaderboards.
- `name`: string
- `format`: string ("T20", "ODI", "Test")
- `startDate`: timestamp
- `endDate`: timestamp
- `teams`: array of references `[clubId, clubId, ...]`
- `status`: string ("upcoming", "active", "completed")
- `leaderboard`: map
  - `topBatsmen`: array of objects `[ { playerId, runs } ]`
  - `topBowlers`: array of objects `[ { playerId, wickets } ]`
  - `mvpIndex`: array of objects `[ { playerId, indexValue } ]`

### Subcollection: `/tournaments/{tournamentId}/standings/{teamId}`
**Description:** Team standings in the tournament.
- `points`: number
- `wins`: number
- `losses`: number
- `nrr`: number (Net Run Rate)
- `played`: number

### Subcollection: `/tournaments/{tournamentId}/fixtures/{fixtureId}`
**Description:** Granular fixtures of the tournament to manage schedule.
- `homeTeam`: reference (clubId)
- `awayTeam`: reference (clubId)
- `date`: timestamp
- `venue`: string
- `result`: string
