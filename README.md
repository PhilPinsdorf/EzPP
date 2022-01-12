# EzPP (Easy Party Playlist)
![GitHub code size in bytes](https://img.shields.io/github/languages/code-size/philpinsdorf/ezpp)
![Lines of code](https://img.shields.io/tokei/lines/github/philpinsdorf/ezpp)
![GitHub issues](https://img.shields.io/github/issues-raw/philpinsdorf/ezpp)
![GitHub closed issues](https://img.shields.io/github/issues-closed-raw/philpinsdorf/ezpp)
[![Discord](https://img.shields.io/discord/705014603058380902?color=7289DA&label=discord)](https://discord.gg/UCVyEmM)


## Infos
- Proof of Concept.
- Quality of Life Tool.
- Easily add Songs to the party hosts queue without the need to have access to his Spotify Account.

## Link
https://ezpp.herokuapp.com/

## Instructions
1. Der Host meldet sich unter https://ezpp.herokuapp.com/login mit seinem Spotify Account bei dem Dienst an. Achtung! Hierfür wird ein Spotify Premium Account benötigt.
2. Im Dashboard unter https://ezpp.herokuapp.com/me kann der Dienst aktiviert/deaktiviert, sowie der Link für die Freunde kopiert, ein neuer Link generiert oder ein Blatt mit einem QR-Code ausgedruckt werden.
3. Hänge das Blatt mit dem QR-Code auf, sodass dieser gescannt werden kann oder teile den Zugangs-Link mit deinen Freunden, sodass diese Songs zu der Warteschlange hinzufügen können.

## Dependencies
- express
- mongoose
- spotify-web-api-node
- crypto
- mongo-sanitize
- path
- fs

## Author
<b>Phil Pinsdorf</b> aka. rexituz

## Licence
<b>MIT</b> Licence \
<b>Copyright (c)</b> Phil Pinsdorf
