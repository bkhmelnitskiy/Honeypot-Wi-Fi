# Honeypot Wi-Fi

> A portable IoT honeypot that passively monitors surrounding wireless networks, scores their security posture, and reports findings to a companion mobile app.

![status](https://img.shields.io/badge/status-work%20in%20progress-orange)
![platform](https://img.shields.io/badge/platform-IoT%20%7C%20Linux-blue)
![license](https://img.shields.io/badge/license-MIT-lightgrey)

## About the project

Public and semi-public Wi-Fi networks (cafés, airports, hotels, conference venues) are a constant source of attacks against unsuspecting users — rogue access points, evil twins, deauthentication floods, weak or missing encryption, captive-portal phishing. Most of these threats are detectable from the air, but no convenient consumer-grade tool exists that gives a non-expert user a clear "is this network safe?" answer.

**Honeypot Wi-Fi** is a small, battery-powered IoT device that:

1. Continuously scans the surrounding 2.4 GHz / 5 GHz radio environment in passive mode.
2. Identifies networks and analyses their characteristics (encryption, BSSID stability, beacon anomalies, deauth activity, suspicious SSID patterns).
3. Classifies each network on a simple security scale.
4. Streams results to a companion mobile application over a secured channel.

The system is designed to be educational and reproducible — built on commodity hardware, with an open-source software stack.

## Status

This is an active student R&D project. The repository tracks ongoing work; the architecture and detection rules are being iterated each sprint. Expect breaking changes until v0.1.

## High-level architecture

```
+----------------------------+         +--------------------+         +--------------+
|   Honeypot Wi-Fi device    |  HTTPS  |   Backend / API    |  WSS    |  Mobile app  |
|  (Intel Joule + Linksys)   | ------> |  Analysis & rules  | ------> |   (Android)  |
|  passive monitor + sensor  |         |  Event logging     |         |   results UI |
+----------------------------+         +--------------------+         +--------------+
```

- **Sensor (device)** — passive 802.11 capture, frame parsing, lightweight pre-filtering.
- **Backend** — REST API, security-analysis logic, classification engine, event log.
- **Mobile app** — read-only client showing nearby networks and their assigned risk levels.

## Detection capabilities (target list)

- Open and unencrypted networks.
- Networks using deprecated encryption (WEP, WPA-TKIP).
- Suspected **rogue AP / evil twin** (same SSID, different BSSID, signal pattern anomalies).
- Deauthentication / disassociation flooding.
- Captive portals with suspicious certificates.
- SSID patterns commonly used for credential harvesting.

Detection rules are documented in `docs/detection-rules.md` (work in progress).

## Hardware

| Component | Purpose |
|---|---|
| Intel Joule 570x + power supply | Compute module running the sensor stack |
| Linksys WRT3200ACM router + ACM-DB-3 wireless card | RF front end, packet capture |
| Mini-HDMI to HDMI cable | Local debugging / development |

Reference build photos and wiring notes will land in `docs/hardware/`.

## Repository layout

```
.
├── backend/            # API, analysis engine, classification rules
├── device/             # Sensor firmware / capture pipeline
├── mobile/             # Mobile app (frontend)
├── docs/               # Architecture diagrams, detection rules, hardware notes
├── tests/              # Unit and integration tests
└── README.md
```

(Folders are added as the corresponding workstream lands.)

## Getting started

Setup instructions will be added once the MVP build is reproducible end-to-end. In the interim, individual subprojects (`backend/`, `mobile/`, `device/`) carry their own short READMEs.

## Roadmap

- [ ] Sensor: stable passive capture on Linksys 3200ACM
- [ ] Backend: REST API + first version of the classifier
- [ ] Mobile: end-to-end demo (scan → API → display)
- [ ] Detection: rogue AP heuristic
- [ ] Detection: deauth flood detector
- [ ] Documentation: architecture, threat model, evaluation report
- [ ] First field test in a public Wi-Fi environment

## Team

| Role | Member |
|---|---|
| Project Manager | Bogdan Khmelnitskiy |
| Backend / system logic | Łukasz Włodarczyk, Michał Pitera, Patryk Harasik |
| Mobile / frontend | Sebastian Sowa, Tomasz Styn |
| UX, research, customer interviews | Sebastian Sowa, Tomasz Styn |

## Academic context

The project is developed as part of a student R&D programme at **AGH University of Krakow**, under the supervision of **dr inż. Katarzyna Kosek-Szott** and **dr inż. Lucjan Janowski**.

## Contact

For collaboration, feedback, or research enquiries:

**Bogdan Khmelnitskiy** — Project Manager
khmelnitskiy2050@gmail.com

We are particularly interested in talking to:
- Cybersecurity product companies working on NDR / Wi-Fi security.
- CSIRT / CERT teams running honeypot research.
- Operators or organisations interested in piloting the sensor in real environments.

## License

Licensed under the MIT License (see `LICENSE`).
