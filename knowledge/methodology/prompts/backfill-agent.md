---
id: KDE-PROMPT-002
title: Backfill session protocol
status: current
created: 2026-09-29
updated: 2026-09-29
authors: [emafriedrich]
drafted_by: agent
approved_by: [emafriedrich]
scope: [methodology]
tags: [prompt, agents, backfill]
depends_on: []
related: [KDE-RFC-013, DR-018, KDE-PROMPT-001]
---

# Backfill Session Protocol

The protocol an agent follows in a backfill session (KDE-RFC-013, DR-018) is framework tooling, not knowledge: it ships to every adopting project as `tools/backfill-protocol.md` ([source](../../../tools/backfill-protocol.md)), refreshed by `install.sh --upgrade`, and the KDE section of `AGENTS.md` tells agents to read it when asked to backfill a domain. A human never pastes it.

This document is the methodology's pointer to that file. Change the protocol there, not here: one copy cannot drift from another.
