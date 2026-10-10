/**
 * Camera/microphone lifecycle at the table. Initial: Idle. Final: Closed.
 * Errors: Denied (permission refused), Failed. Audio is always on once live; video is a switch.
 */
export const MediaState = Object.freeze({
  Idle: 'Idle',
  AwaitingPeer: 'AwaitingPeer',
  Prompt: 'Prompt',
  Starting: 'Starting',
  Live: 'Live',
  Denied: 'Denied',
  Failed: 'Failed',
  PeerLost: 'PeerLost',
  Closed: 'Closed',
});

function liveTracks(stream, kind) {
  return (stream?.getTracks() ?? []).filter((track) => track.kind === kind && track.readyState !== 'ended');
}

export class MediaSession {
  constructor({ link, onChange, mediaDevices = globalThis.navigator?.mediaDevices }) {
    this.link = link;
    this.onChange = onChange;
    this.mediaDevices = mediaDevices;
    this.state = MediaState.Idle;
    this.localStream = null;
    this.remoteStream = null;
    this.error = null;
  }

  get videoOn() {
    return liveTracks(this.localStream, 'video').length > 0;
  }

  start() {
    this.transition(MediaState.AwaitingPeer);
  }

  peerConnected() {
    if (this.state === MediaState.PeerLost && this.localStream) {
      this.transition(MediaState.Live);
      return;
    }
    if (this.state === MediaState.AwaitingPeer || this.state === MediaState.PeerLost) this.transition(MediaState.Prompt);
  }

  peerLost() {
    if (this.state === MediaState.Closed) return;
    this.remoteStream = null;
    this.transition(MediaState.PeerLost);
  }

  /** User pressed OK on the media popup. */
  async confirm(videoOn) {
    if (this.state !== MediaState.Prompt && this.state !== MediaState.Denied && this.state !== MediaState.Failed) return;
    this.transition(MediaState.Starting);
    try {
      const stream = await this.capture({ audio: true, video: videoOn });
      if (this.state === MediaState.Closed) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      this.publish(stream);
      this.transition(MediaState.Live);
    } catch (error) {
      this.error = error?.message ?? String(error);
      this.transition(error?.name === 'NotAllowedError' ? MediaState.Denied : MediaState.Failed);
    }
  }

  async setVideo(on) {
    if (this.state !== MediaState.Live || on === this.videoOn) return;
    const audio = liveTracks(this.localStream, 'audio');
    if (!on) {
      liveTracks(this.localStream, 'video').forEach((track) => track.stop());
      this.publish(new MediaStream(audio));
      return;
    }
    try {
      const camera = await this.capture({ video: true });
      if (this.state === MediaState.Closed) {
        camera.getTracks().forEach((track) => track.stop());
        return;
      }
      this.publish(new MediaStream([...audio, ...camera.getVideoTracks()]));
    } catch (error) {
      this.error = error?.message ?? String(error);
      this.onChange();
    }
  }

  remote(stream) {
    const tracks = stream.getTracks().filter((track) => track.readyState !== 'ended' && !track.muted);
    this.remoteStream = tracks.length > 0 ? new MediaStream(tracks) : null;
    this.onChange();
  }

  capture(constraints) {
    if (!this.mediaDevices?.getUserMedia) throw new Error('Camera and microphone are not available in this browser');
    return this.mediaDevices.getUserMedia(constraints);
  }

  publish(stream) {
    this.localStream = stream;
    this.error = null;
    this.link.setLocalStream(stream);
    this.onChange();
  }

  close() {
    this.localStream?.getTracks().forEach((track) => track.stop());
    this.localStream = null;
    this.remoteStream = null;
    this.transition(MediaState.Closed);
  }

  transition(state) {
    this.state = state;
    this.onChange();
  }
}
