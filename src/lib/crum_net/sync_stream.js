export class SyncStreamConfig {
  constructor(stream_id) {
    this.stream_id = stream_id;
  }

  static new(stream_id) {
    return new SyncStreamConfig(stream_id);
  }

  static default() {
    return new SyncStreamConfig("crum-sync-stream");
  }

  validate() {
    if (this.stream_id.trim() === "") {
      throw SyncStreamError.InvalidConfig("stream_id must not be empty");
    }
  }
}

export class SyncFrame {
  constructor(sequence, kind, line) {
    this.sequence = sequence;
    this.kind = kind;
    this.line = line;
  }

  static new(sequence, kind, line) {
    return new SyncFrame(sequence, kind, line);
  }
}

export const SyncFrameKind = Object.freeze({
  Config: "Config",
  HandStarted: "HandStarted",
  Shuffle: "Shuffle",
  Deal: "Deal",
  Blind: "Blind",
  Bet: "Bet",
  Fold: "Fold",
  Check: "Check",
  Call: "Call",
  Raise: "Raise",
  CommunityCards: "CommunityCards",
  Showdown: "Showdown",
  HandFinished: "HandFinished",
  State: "State",
  Note: "Note",
  DemoLine: "DemoLine",
  DemoFinished: "DemoFinished",
});

export class OrderedSyncState {
  constructor(config) {
    config.validate();
    this.config_value = config;
    this.next_sequence_value = 0;
    this.lines_value = [];
  }

  static new(config) {
    return new OrderedSyncState(config);
  }

  config() {
    return this.config_value;
  }

  next_sequence() {
    return this.next_sequence_value;
  }

  lines() {
    return this.lines_value;
  }

  make_frame(kind, line) {
    return SyncFrame.new(this.next_sequence_value, kind, line);
  }

  emit_frame(kind, line) {
    const frame = this.make_frame(kind, line);
    this.lines_value.push(frame.line);
    this.next_sequence_value += 1;
    return frame;
  }

  apply_frame(frame) {
    if (frame.sequence !== this.next_sequence_value) {
      throw SyncStreamError.OutOfOrder({
        stream_id: this.config_value.stream_id,
        expected: this.next_sequence_value,
        actual: frame.sequence,
      });
    }

    this.lines_value.push(frame.line);
    this.next_sequence_value += 1;
  }

  apply_frames(frames) {
    for (const frame of frames) {
      this.apply_frame(frame);
    }
  }

  apply_demo_frame(frame) {
    const output = frame.kind === SyncFrameKind.DemoFinished ? null : frame.line;
    this.apply_frame(frame);
    return output;
  }
}

export class SyncStreamError extends Error {
  constructor(kind, fields = {}) {
    super(formatError(kind, fields));
    this.name = "SyncStreamError";
    this.kind = kind;
    Object.assign(this, fields);
  }

  static InvalidConfig(message) {
    return new SyncStreamError("InvalidConfig", { message });
  }

  static EmptyFrame() {
    return new SyncStreamError("EmptyFrame");
  }

  static OutOfOrder(fields) {
    return new SyncStreamError("OutOfOrder", fields);
  }

  static Json(error) {
    return new SyncStreamError("Json", { error });
  }
}

export function encode_frame_line(frame) {
  return `${JSON.stringify({
    sequence: frame.sequence,
    kind: frameKindToWire(frame.kind),
    line: frame.line,
  })}\n`;
}

export function decode_frame_line(line) {
  const trimmed = line.replace(/[\r\n]+$/u, "");
  if (trimmed === "") {
    throw SyncStreamError.EmptyFrame();
  }
  try {
    const parsed = JSON.parse(trimmed);
    return new SyncFrame(parsed.sequence, frameKindFromWire(parsed.kind), parsed.line);
  } catch (error) {
    throw SyncStreamError.Json(error);
  }
}

export function encode_frame_lines(frames) {
  let encoded = "";
  for (const frame of frames) {
    encoded += encode_frame_line(frame);
  }
  return encoded;
}

export function decode_frame_lines(lines) {
  return lines
    .split(/\r?\n/u)
    .filter((line) => line.trim() !== "")
    .map(decode_frame_line);
}

function formatError(kind, fields) {
  switch (kind) {
    case "InvalidConfig":
      return `invalid sync config: ${fields.message}`;
    case "EmptyFrame":
      return "empty sync frame";
    case "OutOfOrder":
      return `sync frame out of order for ${fields.stream_id}: expected ${fields.expected}, received ${fields.actual}`;
    case "Json":
      return `sync JSON error: ${fields.error}`;
    default:
      return kind;
  }
}

const frameKindWire = Object.freeze({
  [SyncFrameKind.Config]: "config",
  [SyncFrameKind.HandStarted]: "hand_started",
  [SyncFrameKind.Shuffle]: "shuffle",
  [SyncFrameKind.Deal]: "deal",
  [SyncFrameKind.Blind]: "blind",
  [SyncFrameKind.Bet]: "bet",
  [SyncFrameKind.Fold]: "fold",
  [SyncFrameKind.Check]: "check",
  [SyncFrameKind.Call]: "call",
  [SyncFrameKind.Raise]: "raise",
  [SyncFrameKind.CommunityCards]: "community_cards",
  [SyncFrameKind.Showdown]: "showdown",
  [SyncFrameKind.HandFinished]: "hand_finished",
  [SyncFrameKind.State]: "state",
  [SyncFrameKind.Note]: "note",
  [SyncFrameKind.DemoLine]: "demo_line",
  [SyncFrameKind.DemoFinished]: "demo_finished",
});

const frameKindFromWireMap = Object.fromEntries(
  Object.entries(frameKindWire).map(([key, value]) => [value, key])
);

function frameKindToWire(kind) {
  return frameKindWire[kind] ?? kind;
}

function frameKindFromWire(kind) {
  return frameKindFromWireMap[kind] ?? kind;
}
