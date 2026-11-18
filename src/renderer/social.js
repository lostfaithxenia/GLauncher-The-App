// GLauncher Online Social, Rich Presence & WebRTC Voice Chat Engine
// Uses MQTT 3.1.1 over WSS (zero external dependencies) + WebRTC Audio + Voice Activity Detection

const BROKER_URL = 'wss://broker.emqx.io:8084/mqtt';
const TOPIC_PREFIX = 'glauncher/v1';

function encodeUtf8(str) {
  return new TextEncoder().encode(String(str || ''));
}

function encodeVarInt(n) {
  const bytes = [];
  do {
    let d = n % 128;
    n = Math.floor(n / 128);
    if (n > 0) d |= 0x80;
    bytes.push(d);
  } while (n > 0);
  return bytes;
}

function encodeMqttString(str) {
  const utf = encodeUtf8(str);
  return [(utf.length >> 8) & 0xff, utf.length & 0xff, ...utf];
}

function buildMqttConnect(clientId, willTopic, willPayload) {
  const vh = [
    ...encodeMqttString('MQTT'),
    0x04, // MQTT 3.1.1
    0x02 | (willTopic ? 0x04 | 0x20 : 0), // CleanSession + Will + WillRetain
    0x00, 30 // KeepAlive 30s
  ];
  const pl = [
    ...encodeMqttString(clientId),
    ...(willTopic ? [...encodeMqttString(willTopic), ...encodeMqttString(willPayload)] : [])
  ];
  const rem = vh.length + pl.length;
  return new Uint8Array([0x10, ...encodeVarInt(rem), ...vh, ...pl]);
}

function buildMqttPublish(topic, payloadStr, retain = false) {
  const vh = encodeMqttString(topic);
  const pl = encodeUtf8(payloadStr);
  const rem = vh.length + pl.length;
  const flags = retain ? 0x31 : 0x30;
  return new Uint8Array([flags, ...encodeVarInt(rem), ...vh, ...pl]);
}

function buildMqttSubscribe(packetId, topic) {
  const vh = [(packetId >> 8) & 0xff, packetId & 0xff];
  const pl = [...encodeMqttString(topic), 0x00];
  const rem = vh.length + pl.length;
  return new Uint8Array([0x82, ...encodeVarInt(rem), ...vh, ...pl]);
}

export function normalizeHandle(raw) {
  const clean = String(raw || '').trim().toLowerCase().replace(/^@+/, '').replace(/[^a-z0-9_.-]/g, '');
  return clean ? `@${clean}` : '';
}

export class SocialClient {
  constructor({ onFriendsUpdate, onVcUpdate, onIncomingCall, onStatusChange }) {
    this.onFriendsUpdate = onFriendsUpdate;
    this.onVcUpdate = onVcUpdate;
    this.onIncomingCall = onIncomingCall;
    this.onStatusChange = onStatusChange;

    this.ws = null;
    this.connected = false;
    this.rxBuf = new Uint8Array(0);
    this.pingTimer = null;
    this.reconnectTimer = null;
    this.presenceTimer = null;
    this.packetId = 1;

    this.myProfile = null;
    this.runningGame = null;
    this.friendHandles = new Set();
    this.friendStates = new Map(); // handle -> presence object

    // Voice Chat State
    this.vcActive = false;
    this.vcRoomId = '';
    this.localStream = null;
    this.muted = false;
    this.deafened = false;
    this.mySpeaking = false;
    this.peers = new Map(); // remoteHandle -> { pc, audioEl, speaking, name, avatar, muted }
    this.audioCtx = null;
    this.vadTimer = null;
  }

  setProfileAndGame(profile, runningGame) {
    const prevHandle = this.myProfile ? normalizeHandle(this.myProfile.handle || this.myProfile.name) : '';
    this.myProfile = profile;
    this.runningGame = runningGame;
    const nextHandle = profile ? normalizeHandle(profile.handle || profile.name) : '';

    this.friendHandles = new Set(
      (profile?.friends || []).map((f) => normalizeHandle(f.handle)).filter(Boolean)
    );

    if (prevHandle && nextHandle && prevHandle !== nextHandle) {
      this.reconnect();
      return;
    }

    if (this.connected) {
      this.subscribeFriends();
      this.publishPresence();
    }
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    const myHandle = this.myProfile ? normalizeHandle(this.myProfile.handle || this.myProfile.name) : '@player1';
    if (!myHandle) return;

    try {
      this.ws = new WebSocket(BROKER_URL, 'mqtt');
      this.ws.binaryType = 'arraybuffer';
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      const clientId = `gl_${myHandle.slice(1)}_${Math.random().toString(36).slice(2, 7)}`;
      const willTopic = `${TOPIC_PREFIX}/presence/${myHandle}`;
      const willPayload = JSON.stringify({ handle: myHandle, status: 'offline', activity: 'Offline', updatedAt: Date.now() });
      this.ws.send(buildMqttConnect(clientId, willTopic, willPayload));
    };

    this.ws.onmessage = (ev) => {
      const chunk = new Uint8Array(ev.data);
      const merged = new Uint8Array(this.rxBuf.length + chunk.length);
      merged.set(this.rxBuf, 0);
      merged.set(chunk, this.rxBuf.length);
      this.rxBuf = merged;
      this.parsePackets();
    };

    this.ws.onclose = () => {
      this.cleanupSocket();
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      this.cleanupSocket();
    };
  }

  cleanupSocket() {
    this.connected = false;
    this.onStatusChange?.(false);
    if (this.pingTimer) { clearInterval(this.pingTimer); this.pingTimer = null; }
    if (this.presenceTimer) { clearInterval(this.presenceTimer); this.presenceTimer = null; }
  }

  scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 5000);
  }

  reconnect() {
    try { this.ws?.close(); } catch {}
    this.cleanupSocket();
    this.connect();
  }

  parsePackets() {
    while (this.rxBuf.length >= 2) {
      const type = this.rxBuf[0] >> 4;
      let mult = 1;
      let remLen = 0;
      let idx = 1;
      let byte = 0;
      let incomplete = false;
      do {
        if (idx >= this.rxBuf.length) { incomplete = true; break; }
        byte = this.rxBuf[idx++];
        remLen += (byte & 0x7f) * mult;
        mult *= 128;
      } while ((byte & 0x80) !== 0);

      if (incomplete || this.rxBuf.length < idx + remLen) break;

      const body = this.rxBuf.slice(idx, idx + remLen);
      this.rxBuf = this.rxBuf.slice(idx + remLen);

      if (type === 2) {
        // CONNACK
        this.connected = true;
        this.onStatusChange?.(true);
        const myHandle = normalizeHandle(this.myProfile?.handle || this.myProfile?.name || '@player1');
        this.subscribeTopic(`${TOPIC_PREFIX}/signal/${myHandle}`);
        this.subscribeFriends();
        this.publishPresence();
        this.pingTimer = setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(new Uint8Array([0xc0, 0x00]));
          }
        }, 25000);
        this.presenceTimer = setInterval(() => this.publishPresence(), 30000);
      } else if (type === 3) {
        // PUBLISH
        const qos = (this.rxBuf[0] & 0x06) >> 1;
        if (body.length < 2) continue;
        const tLen = (body[0] << 8) | body[1];
        const topic = new TextDecoder().decode(body.slice(2, 2 + tLen));
        const offset = 2 + tLen + (qos > 0 ? 2 : 0);
        const payload = new TextDecoder().decode(body.slice(offset));
        this.handleMessage(topic, payload);
      }
    }
  }

  subscribeTopic(topic) {
    if (!this.connected || this.ws?.readyState !== WebSocket.OPEN) return;
    this.ws.send(buildMqttSubscribe(this.packetId++, topic));
  }

  subscribeFriends() {
    for (const h of this.friendHandles) {
      this.subscribeTopic(`${TOPIC_PREFIX}/presence/${h}`);
    }
  }

  publish(topic, obj, retain = false) {
    if (!this.connected || this.ws?.readyState !== WebSocket.OPEN) return;
    this.ws.send(buildMqttPublish(topic, JSON.stringify(obj), retain));
  }

  publishPresence() {
    if (!this.myProfile || !this.connected) return;
    const handle = normalizeHandle(this.myProfile.handle || this.myProfile.name);
    if (!handle) return;
    const isPlaying = Boolean(this.runningGame?.title);
    const payload = {
      handle,
      name: this.myProfile.name || handle,
      avatar: this.myProfile.avatar && !this.myProfile.avatar.startsWith('file://') ? this.myProfile.avatar : './assets/maxmb/icons/avatars/firmware/000.png',
      status: this.myProfile.status || 'online',
      customStatus: this.myProfile.customStatus || '',
      activity: isPlaying ? `Playing ${this.runningGame.title}` : 'Just browsing',
      gameTitle: isPlaying ? this.runningGame.title : '',
      startedAt: isPlaying ? (this.runningGame.startedAt || Date.now()) : null,
      roles: (this.myProfile.roles || []).slice(0, 3),
      inVc: this.vcActive,
      vcRoomId: this.vcRoomId || '',
      updatedAt: Date.now()
    };
    this.publish(`${TOPIC_PREFIX}/presence/${handle}`, payload, true);
  }

  handleMessage(topic, raw) {
    let data = null;
    try { data = JSON.parse(raw); } catch { return; }

    if (topic.startsWith(`${TOPIC_PREFIX}/presence/`)) {
      const h = normalizeHandle(data.handle || topic.split('/').pop());
      if (!h) return;
      // Treat stale > 90s as offline
      if (data.status !== 'offline' && Date.now() - (data.updatedAt || 0) > 95000) {
        data.status = 'offline';
        data.activity = 'Offline';
      }
      this.friendStates.set(h, data);
      this.onFriendsUpdate?.(this.getFriendsSnapshot());
    } else if (topic.startsWith(`${TOPIC_PREFIX}/signal/`)) {
      this.handleSignal(data);
    }
  }

  getFriendsSnapshot() {
    const out = [];
    for (const h of this.friendHandles) {
      const st = this.friendStates.get(h);
      const isOnline = st && st.status !== 'offline' && (Date.now() - (st.updatedAt || 0) <= 95000);
      out.push({
        handle: h,
        name: st?.name || h,
        avatar: st?.avatar || './assets/maxmb/icons/avatars/firmware/000.png',
        status: isOnline ? (st.status || 'online') : 'offline',
        activity: isOnline ? (st.activity || 'Just browsing') : 'Offline',
        gameTitle: isOnline ? (st.gameTitle || '') : '',
        startedAt: isOnline ? st.startedAt : null,
        customStatus: isOnline ? (st.customStatus || '') : '',
        roles: st?.roles || [],
        inVc: Boolean(isOnline && st?.inVc),
        vcRoomId: st?.vcRoomId || ''
      });
    }
    return out;
  }

  // ==================== WebRTC Voice Chat ====================

  async ensureMic() {
    if (this.localStream) return this.localStream;
    this.localStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: false
    });
    this.startVad();
    return this.localStream;
  }

  startVad() {
    if (this.vadTimer || !this.localStream) return;
    try {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const src = this.audioCtx.createMediaStreamSource(this.localStream);
      const analyser = this.audioCtx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      const buf = new Uint8Array(analyser.frequencyBinCount);

      this.vadTimer = setInterval(() => {
        if (!this.vcActive) return;
        analyser.getByteFrequencyData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += buf[i];
        const avg = sum / buf.length;
        const speaking = !this.muted && avg > 14;
        if (speaking !== this.mySpeaking) {
          this.mySpeaking = speaking;
          this.broadcastVcMeta();
          this.emitVcState();
        }
      }, 110);
    } catch {}
  }

  broadcastVcMeta() {
    const myHandle = normalizeHandle(this.myProfile?.handle || this.myProfile?.name || '@player1');
    for (const remoteHandle of this.peers.keys()) {
      this.publish(`${TOPIC_PREFIX}/signal/${remoteHandle}`, {
        type: 'vc-meta',
        from: myHandle,
        speaking: this.mySpeaking,
        muted: this.muted,
        name: this.myProfile?.name || myHandle,
        avatar: this.myProfile?.avatar || ''
      });
    }
  }

  async callFriend(remoteHandle) {
    const target = normalizeHandle(remoteHandle);
    const myHandle = normalizeHandle(this.myProfile?.handle || this.myProfile?.name || '@player1');
    if (!target || target === myHandle) return;

    await this.ensureMic();
    this.vcActive = true;
    this.vcRoomId = [myHandle, target].sort().join(':');
    this.publishPresence();

    const peer = this.createPeer(target);
    const offer = await peer.pc.createOffer();
    await peer.pc.setLocalDescription(offer);
    this.publish(`${TOPIC_PREFIX}/signal/${target}`, {
      type: 'offer',
      from: myHandle,
      name: this.myProfile?.name || myHandle,
      avatar: this.myProfile?.avatar || '',
      roomId: this.vcRoomId,
      sdp: offer
    });
    this.emitVcState();
  }

  createPeer(remoteHandle, meta = {}) {
    if (this.peers.has(remoteHandle)) return this.peers.get(remoteHandle);
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }]
    });

    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => pc.addTrack(t, this.localStream));
    }

    const audioEl = document.createElement('audio');
    audioEl.autoplay = true;
    audioEl.muted = this.deafened;

    const entry = {
      pc,
      audioEl,
      speaking: false,
      muted: false,
      name: meta.name || this.friendStates.get(remoteHandle)?.name || remoteHandle,
      avatar: meta.avatar || this.friendStates.get(remoteHandle)?.avatar || './assets/maxmb/icons/avatars/firmware/000.png'
    };
    this.peers.set(remoteHandle, entry);

    const myHandle = normalizeHandle(this.myProfile?.handle || this.myProfile?.name || '@player1');
    pc.onicecandidate = (ev) => {
      if (ev.candidate) {
        this.publish(`${TOPIC_PREFIX}/signal/${remoteHandle}`, {
          type: 'ice',
          from: myHandle,
          candidate: ev.candidate
        });
      }
    };

    pc.ontrack = (ev) => {
      audioEl.srcObject = ev.streams[0];
      audioEl.play().catch(() => {});
    };

    pc.onconnectionstatechange = () => {
      if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) {
        this.removePeer(remoteHandle);
      }
    };

    return entry;
  }

  async handleSignal(msg) {
    const from = normalizeHandle(msg.from);
    const myHandle = normalizeHandle(this.myProfile?.handle || this.myProfile?.name || '@player1');
    if (!from || from === myHandle) return;

    if (msg.type === 'offer') {
      try {
        await this.ensureMic();
        this.vcActive = true;
        this.vcRoomId = msg.roomId || [myHandle, from].sort().join(':');
        const peer = this.createPeer(from, { name: msg.name, avatar: msg.avatar });
        await peer.pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        const answer = await peer.pc.createAnswer();
        await peer.pc.setLocalDescription(answer);
        this.publish(`${TOPIC_PREFIX}/signal/${from}`, {
          type: 'answer',
          from: myHandle,
          name: this.myProfile?.name || myHandle,
          avatar: this.myProfile?.avatar || '',
          sdp: answer
        });
        this.publishPresence();
        this.emitVcState();
        this.onIncomingCall?.(from, msg.name || from);
      } catch {}
    } else if (msg.type === 'answer') {
      const peer = this.peers.get(from);
      if (peer) {
        await peer.pc.setRemoteDescription(new RTCSessionDescription(msg.sdp)).catch(() => {});
      }
    } else if (msg.type === 'ice') {
      const peer = this.peers.get(from);
      if (peer && msg.candidate) {
        await peer.pc.addIceCandidate(new RTCIceCandidate(msg.candidate)).catch(() => {});
      }
    } else if (msg.type === 'vc-meta') {
      const peer = this.peers.get(from);
      if (peer) {
        peer.speaking = Boolean(msg.speaking);
        peer.muted = Boolean(msg.muted);
        if (msg.name) peer.name = msg.name;
        if (msg.avatar) peer.avatar = msg.avatar;
        this.emitVcState();
      }
    } else if (msg.type === 'hangup') {
      this.removePeer(from);
    }
  }

  removePeer(remoteHandle) {
    const peer = this.peers.get(remoteHandle);
    if (!peer) return;
    try { peer.pc.close(); } catch {}
    try { peer.audioEl.srcObject = null; } catch {}
    this.peers.delete(remoteHandle);
    this.emitVcState();
  }

  setMuted(m) {
    this.muted = Boolean(m);
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((t) => { t.enabled = !this.muted; });
    }
    if (this.muted) this.mySpeaking = false;
    this.broadcastVcMeta();
    this.emitVcState();
  }

  setDeafened(d) {
    this.deafened = Boolean(d);
    for (const p of this.peers.values()) {
      p.audioEl.muted = this.deafened;
    }
    if (this.deafened && !this.muted) this.setMuted(true);
    else this.emitVcState();
  }

  leaveCall() {
    const myHandle = normalizeHandle(this.myProfile?.handle || this.myProfile?.name || '@player1');
    for (const h of Array.from(this.peers.keys())) {
      this.publish(`${TOPIC_PREFIX}/signal/${h}`, { type: 'hangup', from: myHandle });
      this.removePeer(h);
    }
    this.vcActive = false;
    this.vcRoomId = '';
    this.mySpeaking = false;
    if (this.vadTimer) { clearInterval(this.vadTimer); this.vadTimer = null; }
    if (this.audioCtx) { try { this.audioCtx.close(); } catch {} this.audioCtx = null; }
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }
    this.publishPresence();
    this.emitVcState();
  }

  getVcState() {
    const myHandle = normalizeHandle(this.myProfile?.handle || this.myProfile?.name || '@player1');
    const participants = [];
    if (this.vcActive) {
      participants.push({
        handle: myHandle,
        name: this.myProfile?.name || myHandle,
        avatar: this.myProfile?.avatar || './assets/maxmb/icons/avatars/firmware/000.png',
        speaking: this.mySpeaking,
        muted: this.muted,
        isSelf: true
      });
      for (const [h, p] of this.peers.entries()) {
        participants.push({
          handle: h,
          name: p.name,
          avatar: p.avatar,
          speaking: p.speaking,
          muted: p.muted,
          isSelf: false
        });
      }
    }
    return { active: this.vcActive, roomId: this.vcRoomId, participants };
  }

  emitVcState() {
    const st = this.getVcState();
    this.onVcUpdate?.(st);
  }
}
