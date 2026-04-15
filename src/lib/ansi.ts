// Strip ANSI escape sequences from terminal output.
//
// This is a *bandaid* for claude's TUI output. Cursor-movement sequences
// still produce garbled text because we don't emulate a terminal — the
// long-term fix is to run `claude -p --output-format stream-json` and
// render structured events instead. For now, we at least cover:
//
//   - CSI  ESC [ <params> <intermediates> <final>   (colors, cursor, etc.)
//   - OSC  ESC ] ... BEL | ST                       (window title, hyperlinks)
//   - DCS/SOS/PM/APC  ESC P|X|^|_ ... ST            (device control strings)
//   - Single-char escapes                           (ESC 7/8, index, NEL…)
//   - Character-set selection                       (ESC ( B, etc.)
//   - Stray control bytes                           (BEL, SO/SI, DEL, BS)
//
// ECMA-48 CSI grammar:
//   parameter bytes      0x30–0x3F   (0-9 : ; < = > ?)
//   intermediate bytes   0x20–0x2F   (space ! " # $ % & ' ( ) * + , - . /)
//   final byte           0x40–0x7E   (@ A … ~)
//
// We keep \t, \n, \r. Everything else in the C0 range gets dropped.

/* eslint-disable no-control-regex */

const CSI = /\x1b\[[\x30-\x3f]*[\x20-\x2f]*[\x40-\x7e]/g;
const OSC = /\x1b\](?:[^\x07\x1b]|\x1b(?!\\))*(?:\x07|\x1b\\)/g;
const STRING_ESC = /\x1b[PX^_](?:[^\x1b]|\x1b(?!\\))*(?:\x1b\\|\x07)/g;
const CHARSET = /\x1b[()*+][\x20-\x2f]*[0-9A-Za-z]/g;
const SINGLE_ESC = /\x1b[=>78DEHMNOPVWXZ\\c]/g;
const STRAY_ESC = /\x1b/g;

const CONTROL_STRIP = /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g;

export function stripAnsi(input: string): string {
  return input
    .replace(STRING_ESC, "")
    .replace(OSC, "")
    .replace(CSI, "")
    .replace(CHARSET, "")
    .replace(SINGLE_ESC, "")
    .replace(STRAY_ESC, "")
    .replace(CONTROL_STRIP, "");
}
